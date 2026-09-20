Review complete in 3m 32s - 4 comments across 3 files - commit e5d428b97f53

╭──────────────────────────────────────────────────────────────────────────────╮
│ Greptile Summary │
│ This PR adds an end-to-end email/PIN password-reset flow, including public │
│ backend endpoints, persisted reset tokens, SMTP delivery, configuration, │
│ integration tests, and a three-step frontend page. │
│ │
│ - Adds forgot-password, PIN verification, and password replacement APIs. │
│ - Stores BCrypt PIN hashes with expiration, attempt counts, and consumption │
│ state. │
│ - Adds SMTP and development fallback configuration. │
│ - Adds the frontend reset workflow and login-page navigation. │
│ - The current fallback and logging behavior expose reset credentials, while │
│ token state updates are not concurrency-safe. │
│ │
│ Confidence: 0/5 │
│ This PR is unsafe to merge because its default configuration enables account │
│ takeover with a known PIN and it exposes additional reset credentials and │
│ token-state races. │
│ │
│ Blank mail credentials activate the public reset flow with the documented │
│ PIN 1234; live PINs are also logged on fallback and SMTP failure, token │
│ attempt/consumption updates are non-atomic, and forgot-password latency │
│ reveals whether an account exists. │
│ │
│ Files Needing Attention: │
│ sample_project_BE/src/main/resources/application.yml, sample_project_BE/src/ │
│ main/java/com/sampleproject/diary/service/PasswordResetMailer.java, │
│ sample_project_BE/src/main/java/com/sampleproject/diary/service/PasswordRese │
│ tService.java, sample_project_BE/src/main/java/com/sampleproject/diary/entit │
│ y/PasswordResetToken.java │
│ │
│ Security Review │
│ The reset flow is not safe to deploy as written. Missing mail credentials │
│ activate a known default PIN that permits account takeover, plaintext PINs │
│ are emitted to logs, concurrent requests can bypass token state controls, │
│ and divergent request timing can reveal registered accounts. │
╰──────────────────────────────────────────────────────────────────────────────╯

Sequence Diagram

Open diagram source ↗: file:///C:/Users/mihan/AppData/Local/Temp/greptile-diagrams-t4p62J/9f39ab1b2b33f736.mmd

┌ Comment 1 · P1 security · comment · L77-L80 ───────────────────────────────┐
│ │
├─ sample_project_BE/src/main/java/..../diar…/PasswordResetMailer.java (added) ┤
│ │
│ 77 + // The PIN is already stored, so surface it in the log │
│ + rather than │
│ 78 + // stranding the user behind a mail-server problem. │
│ 79 + log.error("Failed to email the reset PIN to {} — PIN is {} │
│ + (valid {} minutes)", │
│ 80 + toEmail, pin, ttlMinutes, ex); │
│ │
├──────────────────────────────────────────────────────────────────────────────┤
│ Logs Expose Reset PINs │
│ │
│ Both fallback paths write the plaintext reset PIN and target email to normal │
│ application logs. This also happens when SMTP fails in an otherwise │
│ configured environment, so anyone with access to container, CI, or │
│ aggregated logs can use the live credential at the public reset endpoint to │
│ take over the account. Reset secrets must never be logged. The same exposure │
│ also occurs in the no-mail path at lines 49–51. │
│ │
│ How this was verified: These log statements emit both the email and PIN, and │
│ the public reset endpoint accepts those values as authorization to replace │
│ the password. │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Comment 2 · P1 security · comment · L59-L77 ───────────────────────────────┐
│ │
├─ sample_project_BE/src/main/java/..../dia…/PasswordResetService.java (added) ┤
│ │
│ 59 + Optional<User> found = │
│ + userRepository.findByEmailIgnoreCase(email); │
│ 60 + if (found.isEmpty()) { │
│ 61 + log.info("Password reset requested for an unregistered │
│ + email; nothing sent"); │
│ 62 + return; │
│ 63 + } │
│ 64 + │
│ 65 + User user = found.get(); │
│ 66 + String pin = generatePin(); │
│ 67 + │
│ 68 + // Only the newest PIN is ever valid. │
│ 69 + tokenRepository.deleteAllByUser(user); │
│ 70 + tokenRepository.save(PasswordResetToken.builder() │
│ 71 + .user(user) │
│ 72 + .pinHash(passwordEncoder.encode(pin)) │
│ 73 + .createdAt(Instant.now()) │
│ 74 + .expiresAt(Instant.now().plus(properties.ttlMinutes(), │
│ + ChronoUnit.MINUTES)) │
│ 75 + .build()); │
│ 76 + │
│ 77 + mailer.sendPin(user.getEmail(), user.getUsername(), pin, │
│ + properties.ttlMinutes()); │
│ │
├──────────────────────────────────────────────────────────────────────────────┤
│ Timing Reveals Registered Emails │
│ │
│ Unknown addresses return immediately, while registered addresses perform │
│ BCrypt hashing, token deletion and insertion, and synchronous SMTP delivery │
│ with five-second timeouts. Because this endpoint is public and unthrottled, │
│ repeated timing samples can reveal which emails have accounts despite the │
│ identical response body. Equalize the work or move delivery asynchronously │
│ and add request throttling. │
│ │
│ How this was verified: The unknown-user branch returns directly, while the │
│ registered-user branch performs BCrypt, database writes, and blocking mail │
│ delivery before responding. │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Comment 3 · P1 security · comment · L121-L129 ─────────────────────────────┐
│ │
├─ sample_project_BE/src/main/java/..../dia…/PasswordResetService.java (added) ┤
│ │
│ 121 + if (!passwordEncoder.matches(pin, token.getPinHash())) { │
│ 122 + token.setAttempts(token.getAttempts() + 1); │
│ 123 + tokenRepository.save(token); │
│ 124 + throw new InvalidResetPinException(INVALID_PIN_MESSAGE); │
│ 125 + } │
│ 126 + │
│ 127 + if (consume) { │
│ 128 + token.setConsumedAt(now); │
│ 129 + tokenRepository.save(token); │
│ │
├──────────────────────────────────────────────────────────────────────────────┤
│ Token Updates Race │
│ │
│ PIN attempts and consumption use unlocked read-modify-write operations on an │
│ entity without optimistic versioning. Concurrent wrong guesses can read the │
│ same attempt count and overwrite one another's increments, allowing more │
│ guesses than the configured limit. Concurrent correct requests can likewise │
│ both see an unconsumed token and redeem the nominally single-use PIN. Make │
│ validation and the state transition atomic with locking, versioning, or │
│ conditional database updates. │
│ │
│ How this was verified: The public endpoints read token state and later save │
│ incremented or consumed state without a repository lock, version field, or │
│ conditional update. │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Comment 4 · P0 security · comment · L64-L66 ───────────────────────────────┐
│ │
├─ sample_project_BE/src/main/resources/application.yml ───────────────────────┤
│ │
│ 64 + # Used only when no mail app password is configured: the PIN is not │
│ 65 + # emailed, it is fixed to this value and written to the server log. │
│ 66 + dev-pin: ${RESET_DEV_PIN:1234} │
│ │
├──────────────────────────────────────────────────────────────────────────────┤
│ Default PIN Enables Takeover │
│ │
│ If the application is deployed without mail credentials, it silently uses │
│ the documented reset PIN 1234. The reset endpoints are public, so an │
│ attacker who knows a registered email can request a token and submit 1234 to │
│ replace that account's password. Restrict this fallback to an explicit │
│ development profile or reject missing mail configuration outside │
│ development. │
│ │
│ How this was verified: Blank mail defaults select properties.devPin(), and │
│ the integration test shows the public reset flow changing a password with │
│ 1234. │
└──────────────────────────────────────────────────────────────────────────────┘
