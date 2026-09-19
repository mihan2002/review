package com.sampleproject.diary.service;

import com.sampleproject.diary.dto.ForgotPasswordRequest;
import com.sampleproject.diary.dto.ResetPasswordRequest;
import com.sampleproject.diary.dto.VerifyResetPinRequest;
import com.sampleproject.diary.entity.PasswordResetToken;
import com.sampleproject.diary.entity.User;
import com.sampleproject.diary.exception.InvalidResetPinException;
import com.sampleproject.diary.repository.PasswordResetTokenRepository;
import com.sampleproject.diary.repository.UserRepository;
import com.sampleproject.diary.security.PasswordResetProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Optional;

/**
 * Forgotten-password flow: request a PIN, verify it, then set a new password.
 *
 * <p>Every step answers the same way whether or not the email belongs to an
 * account, so the endpoints cannot be used to discover who is registered.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String INVALID_PIN_MESSAGE = "That PIN is invalid or has expired. Request a new one.";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailer mailer;
    private final PasswordResetProperties properties;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                PasswordEncoder passwordEncoder,
                                PasswordResetMailer mailer,
                                PasswordResetProperties properties) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailer = mailer;
        this.properties = properties;
    }

    /** Issues a PIN for the account, if there is one. Unknown emails are a no-op. */
    @Transactional
    public void requestReset(ForgotPasswordRequest request) {
        String email = normalise(request.email());
        Optional<User> found = userRepository.findByEmailIgnoreCase(email);
        if (found.isEmpty()) {
            log.info("Password reset requested for an unregistered email; nothing sent");
            return;
        }

        User user = found.get();
        String pin = generatePin();

        // Only the newest PIN is ever valid.
        tokenRepository.deleteAllByUser(user);
        tokenRepository.save(PasswordResetToken.builder()
                .user(user)
                .pinHash(passwordEncoder.encode(pin))
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(properties.ttlMinutes(), ChronoUnit.MINUTES))
                .build());

        mailer.sendPin(user.getEmail(), user.getUsername(), pin, properties.ttlMinutes());
    }

    /**
     * Checks a PIN without spending it, so the UI can gate the new-password step.
     *
     * <p>A rejection must not roll back the transaction: the failed attempt is
     * recorded on the token, and losing that count would make the PIN
     * brute-forceable.
     */
    @Transactional(noRollbackFor = InvalidResetPinException.class)
    public void verifyPin(VerifyResetPinRequest request) {
        consumeToken(request.email(), request.pin(), false);
    }

    /** Sets the new password and burns the PIN. */
    @Transactional(noRollbackFor = InvalidResetPinException.class)
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = consumeToken(request.email(), request.pin(), true);

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        log.info("Password reset completed for user {}", user.getId());
    }

    /**
     * Resolves and validates the PIN. A miss increments the attempt counter so a
     * four-digit PIN cannot be brute-forced; every failure reports the same message.
     */
    private PasswordResetToken consumeToken(String rawEmail, String pin, boolean consume) {
        String email = normalise(rawEmail);
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new InvalidResetPinException(INVALID_PIN_MESSAGE));

        PasswordResetToken token = tokenRepository.findFirstByUserOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new InvalidResetPinException(INVALID_PIN_MESSAGE));

        Instant now = Instant.now();
        if (!token.isUsable(now, properties.maxAttempts())) {
            throw new InvalidResetPinException(INVALID_PIN_MESSAGE);
        }

        if (!passwordEncoder.matches(pin, token.getPinHash())) {
            token.setAttempts(token.getAttempts() + 1);
            tokenRepository.save(token);
            throw new InvalidResetPinException(INVALID_PIN_MESSAGE);
        }

        if (consume) {
            token.setConsumedAt(now);
            tokenRepository.save(token);
        }
        return token;
    }

    /**
     * A random six-digit PIN, or the fixed dev PIN when no mail app password is
     * configured — otherwise nobody could complete a reset on a dev machine.
     */
    private String generatePin() {
        if (!mailer.isMailConfigured()) {
            return properties.devPin();
        }
        return String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
    }

    private static String normalise(String email) {
        return email == null ? "" : email.trim();
    }
}
