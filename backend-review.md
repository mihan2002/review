# Backend Code Review — `sample_project_BE`

**Scope:** every file under `sample_project_BE/` except `target/`. Spring Boot 3.4.5 / Java 21 diary API
(Spring Web, Data JPA, Security + JJWT 0.12, Bean Validation, Lombok, PostgreSQL, springdoc-openapi).
**Method:** read-only review of source, config, build and container files. Findings below were verified
by reading the code; where I could not confirm something from the files, I say so.

**Severity scale**

| Severity | Meaning |
| --- | --- |
| Critical | Exploitable or data-losing as written; must fix before merge. |
| High | Real security weakness or bug under plausible production conditions. |
| Medium | Correctness, robustness or performance problem worth fixing. |
| Low | Quality, clarity, maintainability, polish. |

---

## What the code already gets right

Worth stating up front, because it narrows where the real risk lives:

- **Object-level authorization is correct.** Every diary query goes through
  `findByIdAndUserId` / `existsByIdAndUserId` / `deleteByIdAndUserId` / `findByUserId…`
  (`repository/DiaryEntryRepository.java`), and the owner id always comes from
  `CurrentUserProvider.requireCurrentUserId()` reading the `SecurityContext` — never from the request
  body or a path/query parameter. `DiaryEntryRequest` has no `userId` field to spoof. Foreign entries
  return 404, not 403, so ids are not enumerable. This is the part that usually goes wrong in a project
  like this, and it is right, including in tests (`DiaryControllerIntegrationTest.cannotTouchAnotherUsersEntry`).
- **No injection surface.** The only hand-written query (`DiaryEntryRepository:48-56`) is JPQL with
  `@Param` binding; everything else is a derived query. No string concatenation, no native SQL.
- **Passwords** use `BCryptPasswordEncoder` (`SecurityConfig.java:64`), the hash is never mapped into a
  response DTO (`UserResponse` exposes id/username/email/createdAt only), and `@Size(max = 72)` on the
  registration password correctly avoids BCrypt's silent 72-byte truncation.
- **No stack-trace or DB-detail leakage.** `server.error.include-stacktrace: never`,
  `include-message: never`, and `GlobalExceptionHandler` returns a fixed safe message for the catch-all
  case while logging the real exception server-side.
- **JWT signature and expiry are genuinely verified** — `Jwts.parser().verifyWith(key).parseSignedClaims(...)`
  (`JwtService.java:44-48`) rejects `alg: none` and tampered/expired tokens; the algorithm is not
  attacker-controlled. The secret is sourced from `${JWT_SECRET}` with no fallback, so a missing secret
  fails startup rather than silently using a default.
- **CSRF disabled is correct here** — the token is a bearer header, not a cookie, and the session policy
  is `STATELESS`.
- **Layering is clean:** controllers are thin and DTO-in/DTO-out, no repository is touched from a
  controller, `open-in-view: false`, and no entity is serialized to the wire.

No **Critical** findings. The issues below are real but none of them is a directly exploitable
authorization or injection bug in the application code.

---

## High

### `sample_project_BE/.env` (whole file) — a working `.env` ships with a publicly-known JWT signing key

`.env` on disk is a byte-for-byte copy of `.env.example`, including
`JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters`. That string is 53 characters, so
`Keys.hmacShaKeyFor` (`JwtService.java:25`) accepts it without complaint and nothing else in the stack
checks it. `docker-compose.yml:35` reads `JWT_SECRET` from exactly this file.

**Failure scenario:** someone clones the repo, runs `docker compose up`, and deploys. Every token is
signed with a secret that is printed in `.env.example` in a public repo. An attacker mints
`{"sub":"<any username>","uid":"<any uuid>"}`, signs it with that string, and `JwtAuthenticationFilter`
accepts it — full account takeover of every user, with no credentials needed. Note the JWT already
carries the username in `sub`, and usernames are discoverable through the registration 409 (see below).

`.env` is correctly listed in `.gitignore:35` and is **not** tracked (verified with `git ls-files`), so
nothing secret is in git history. The hazard is the file's presence in the working tree, not the repo.

**Fix — fail fast on a placeholder or short secret:**

```java
public JwtService(JwtProperties properties) {
    String secret = properties.secret();
    if (secret == null || secret.isBlank() || secret.startsWith("replace-with-")
            || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
        throw new IllegalStateException(
                "app.jwt.secret must be set to a unique random value of at least 32 bytes");
    }
    this.properties = properties;
    this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
}
```

…and delete the working-tree `.env`, or replace its values with `openssl rand -base64 48` output.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/controller/AuthController.java:60` — no brute-force protection on login

`POST /api/auth/login` is `permitAll` (`SecurityConfig.java:26`) with no rate limit, no lockout, no
backoff and no CAPTCHA. `RegisterRequest` only requires a password of 8 characters with no complexity
or breach check.

**Failure scenario:** an attacker learns a username (trivially — see the enumeration finding), then
sends `POST /api/auth/login` in a loop against a common-password list. BCrypt's default cost of 10
caps throughput at roughly a few hundred attempts/second/core, which is ample for a top-10k password
list against an 8-character minimum, and every attempt also burns a connection from the 10-slot Hikari
pool, so a sustained run doubles as a denial of service against legitimate traffic.

**Fix — a per-username + per-IP counter in front of the authentication manager. Sketch using Bucket4j:**

```java
@Service
public class LoginRateLimiter {
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public void checkAndConsume(String key) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(15))))
                .build());
        if (!bucket.tryConsume(1)) {
            throw new TooManyRequestsException("Too many login attempts; try again later");
        }
    }
}
```

Call it at the top of `AuthService.login` with `request.username()` and the caller IP, map the exception
to `429` in `GlobalExceptionHandler`, and evict entries on success. A shared store (Redis) is needed if
you ever run more than one instance.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/service/AuthService.java:39-52` — TOCTOU on registration returns 500 instead of 409

`existsByUsername` / `existsByEmail` are checked, then `save` runs. Nothing between them holds a lock,
and `DataIntegrityViolationException` has no handler in `GlobalExceptionHandler`, so it falls through to
`handleUnexpected` (`GlobalExceptionHandler.java:102-108`).

**Failure scenario:** two clients POST `/api/auth/register` with username `mihan` within the same few
milliseconds. Both `existsByUsername` calls return `false`, both proceed to `save`, the second one hits
`uk_users_username` and throws `DataIntegrityViolationException`. The caller gets
`500 {"message":"An unexpected error occurred"}` instead of `409 Username is already taken`, and an
`ERROR`-level stack trace is written for what is an ordinary client-side condition. This will also fire
in normal use from a double-clicked submit button.

**Fix — keep the friendly pre-check, but treat the constraint as the real arbiter:**

```java
@Transactional
public UserResponse register(RegisterRequest request) {
    if (userRepository.existsByUsername(request.username())) {
        throw new DuplicateResourceException("Username is already taken");
    }
    if (userRepository.existsByEmail(request.email())) {
        throw new DuplicateResourceException("Email is already registered");
    }
    User user = User.builder()
            .username(request.username())
            .email(request.email())
            .passwordHash(passwordEncoder.encode(request.password()))
            .build();
    try {
        return UserResponse.from(userRepository.saveAndFlush(user));
    } catch (DataIntegrityViolationException ex) {
        throw new DuplicateResourceException("Username or email is already registered");
    }
}
```

Note `saveAndFlush` rather than `save`: with plain `save` the insert may be deferred to transaction
commit, which happens *after* the method returns, so the `catch` would never fire. Add a
`@ExceptionHandler(DataIntegrityViolationException.class)` → 409 as a backstop for other paths.

---

### `sample_project_BE/src/main/resources/application.yml:16` and `docker-compose.yml:37` — `ddl-auto: update` is the production default

`JPA_DDL_AUTO` defaults to `update` in `application.yml`, in `docker-compose.yml` and in `.env`. There is
no Flyway or Liquibase dependency in `pom.xml`, so `update` is the only thing creating the schema.

**Failure scenario:** a developer renames `DiaryEntry.content` to `body` and deploys. Hibernate's `update`
adds a `body` column and silently leaves `content` behind with all the data in it, unread — a silent data
loss from the application's perspective, with no migration to reverse. Conversely, shortening
`@Column(length = 200)` is simply ignored, so the schema and the code drift apart with no error. `update`
also takes DDL locks against the live table at every startup.

**Fix:** add Flyway, move the current schema into `V1__initial_schema.sql`, and set

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: ${JPA_DDL_AUTO:validate}
```

Keep `update` only in a `dev` profile.

---

## Medium

### `sample_project_BE/src/main/java/com/sampleproject/diary/security/JwtAuthenticationFilter.java:43-44` — the `uid` claim is parsed and then ignored

`parseToken` returns a `JwtPrincipal(userId, username)`, but the filter uses only `principal.username()`
to reload the user and never checks that the loaded user's id equals `principal.userId()`. Authorization
therefore binds to whoever currently holds that username, not to the account the token was issued for.

**Failure scenario:** user `alice` (uuid A) is deleted — today via direct DB access, tomorrow via a
delete-account endpoint — and a different person registers the now-free username `alice` (uuid B). The
old, unexpired token still parses, `loadUserByUsername("alice")` returns uuid B, and the previous owner
reads and writes the new user's diary for the rest of the token's 24-hour life. The same mismatch would
appear the moment a username-change feature is added.

**Fix — assert the two agree:**

```java
JwtPrincipal principal = jwtService.parseToken(token);
AuthenticatedUser user = userDetailsService.loadUserByUsername(principal.username());
if (!user.getId().equals(principal.userId())) {
    throw new JwtException("Token subject no longer matches the stored account");
}
```

Better still, make `uid` the authoritative claim and load by id.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/security/JwtService.java:44-48` — the `issuer` claim is written but never verified

`generateToken` sets `.issuer(properties.issuer())`; `parseToken` never calls `requireIssuer`, so the
claim is decorative.

**Failure scenario:** the same `JWT_SECRET` is reused for a second service (a common operational
shortcut, and `.env.example` gives no warning against it). A token minted by that service — with
whatever `sub` and `uid` it chose — is accepted verbatim by this API. Verifying the issuer is the cheap
defence that makes that cross-service confusion fail closed.

**Fix:**

```java
Claims claims = Jwts.parser()
        .verifyWith(signingKey)
        .requireIssuer(properties.issuer())
        .build()
        .parseSignedClaims(token)
        .getPayload();
```

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/security/JwtService.java:35` — 24-hour tokens with no revocation path

`JWT_EXPIRATION` defaults to 86400 seconds, there is no refresh token, no `jti`, no deny-list and no
logout endpoint. Nothing invalidates an issued token.

**Failure scenario:** a token leaks (shared device, browser extension, proxy log). The user notices and
changes their password — except there is no password-change endpoint, and even if there were, the leaked
token keeps working for up to 24 hours because validation reads nothing but the signature and `exp`. The
user and the operator have no way to cut access short.

**Fix:** shorten the access token to ~15 minutes, add a refresh token stored server-side (so it can be
revoked), and include a `jti` so individual tokens can be denied. A cheaper interim measure is a
`tokens_valid_from` timestamp on `User`, bumped on password change and logout, and compared against the
token's `iat` in the filter.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/exception/GlobalExceptionHandler.java:55-62` — `IllegalArgumentException` is mapped to 400, masking server bugs

`IllegalArgumentException` is grouped with the genuinely client-caused exceptions and answered with a
flat 400 `"Malformed or invalid request"`.

**Failure scenario, two ways it bites:**
1. `DiaryService.findAll` throws `IllegalArgumentException("'from' must not be after 'to'")`
   (`DiaryService.java:64`). The client receives `"Malformed or invalid request"` — the specific,
   actionable message the service wrote is discarded, and `DiaryServiceTest.findAllRejectsReversedRange`
   asserts on the exception type only, so nothing catches the loss.
2. Any internal `IllegalArgumentException` — a bad `UUID.fromString`, a misconfigured
   `PageRequest.of(-1, …)`, an argument-validation failure deep in a library — is reported to the client
   as *their* mistake with a 200-family-adjacent 400, is **not** logged (only `handleUnexpected` logs),
   and so never shows up in error dashboards. A real server-side defect becomes invisible.

**Fix — give the domain its own exception and let `IllegalArgumentException` fall through to the 500 handler:**

```java
// exception/InvalidRequestException.java
public class InvalidRequestException extends RuntimeException {
    public InvalidRequestException(String message) { super(message); }
}

// DiaryService.findAll
throw new InvalidRequestException("'from' must not be after 'to'");

// GlobalExceptionHandler
@ExceptionHandler({HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class})
public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex, HttpServletRequest request) { … }

@ExceptionHandler(InvalidRequestException.class)
public ResponseEntity<ErrorResponse> handleInvalidRequest(InvalidRequestException ex,
                                                          HttpServletRequest request) {
    return ResponseEntity.badRequest().body(ErrorResponse.of(
            HttpStatus.BAD_REQUEST.value(), ex.getMessage(), request.getRequestURI()));
}
```

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/repository/DiaryEntryRepository.java:48-56` — `LIKE` wildcards in the keyword are not escaped

`concat('%', :keyword, '%')` interpolates the raw keyword into a `LIKE` pattern. This is *not* SQL
injection — the parameter is bound — but `%` and `_` inside the value are still pattern metacharacters.

**Failure scenario:** `GET /api/diaries/search?keyword=%25` (a literal `%`) becomes `like '%%%'`, which
matches every row the user owns rather than the entries containing a percent sign. Searching for
`50%_off` silently matches far more than intended. In the other direction, a user with a large diary can
send `keyword=%` repeatedly: each request is a `lower(content) like` scan over a 20 000-character column
with no index that can serve it, plus a `count(*)` for the page metadata.

**Fix — escape the metacharacters and declare the escape character:**

```java
@Query("""
        select d from DiaryEntry d
        where d.user.id = :userId
          and (lower(d.title) like lower(concat('%', :keyword, '%')) escape '\\'
               or lower(d.content) like lower(concat('%', :keyword, '%')) escape '\\')
        """)
Page<DiaryEntry> searchByUserAndKeyword(@Param("userId") UUID userId,
                                        @Param("keyword") String keyword,
                                        Pageable pageable);
```

```java
// DiaryService.search
private static String escapeLike(String raw) {
    return raw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
}
…
diaryEntryRepository.searchByUserAndKeyword(userId, escapeLike(keyword.trim()), pageable(page, size));
```

Also add `@Size(max = 100)` to the `keyword` parameter in `DiaryController:86`, which today accepts an
unbounded string.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/controller/DiaryController.java:85-91` — full-text search has no index and will not scale

`lower(title) like '%…%' or lower(content) like '%…%'` cannot use a B-tree index in PostgreSQL; the
leading wildcard rules it out. The only indexes defined (`DiaryEntry.java:28-32`) are on `user_id` and
`entry_date`.

**Failure scenario:** a user with 50 000 entries searches a common word. PostgreSQL scans every one of
that user's rows, lower-casing a column declared `length = 20000`, then runs a second full scan for the
`count(*)` that `Page` requires. Request latency grows linearly with diary size, and each such request
occupies one of the 10 Hikari connections for its duration.

**Fix — use PostgreSQL full-text search with a GIN index:**

```sql
CREATE INDEX idx_diary_entries_fts ON diary_entries
  USING GIN (to_tsvector('english', title || ' ' || content));
```

```java
@Query(value = """
        select * from diary_entries d
        where d.user_id = :userId
          and to_tsvector('english', d.title || ' ' || d.content)
              @@ plainto_tsquery('english', :keyword)
        """,
       countQuery = "...",
       nativeQuery = true)
```

If substring matching must be kept, a `pg_trgm` GIN index on `lower(title)` / `lower(content)` is the
alternative. Either way this is a schema change, which is another argument for the migration tool above.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/config/SecurityConfig.java:28-31` — Swagger UI and the OpenAPI document are public in every environment

`/v3/api-docs`, `/v3/api-docs/**`, `/swagger-ui.html` and `/swagger-ui/**` are `permitAll` with no profile
guard, and `springdoc` is an unconditional runtime dependency.

**Failure scenario:** the production deployment serves the complete API surface — every route, parameter,
schema and validation rule — to anyone who requests `/v3/api-docs`. That is free reconnaissance for the
brute-force and enumeration attacks described above, and `OpenApiDocumentationTest` asserts that this
works anonymously, so it is a deliberate, tested behaviour rather than an oversight.

**Fix — bind the docs to non-production profiles:**

```yaml
# application.yml
springdoc:
  api-docs:
    enabled: ${SPRINGDOC_ENABLED:false}
  swagger-ui:
    enabled: ${SPRINGDOC_ENABLED:false}
```

and drop the four doc paths from `PUBLIC_ENDPOINTS` in the production profile, or require
authentication for them.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/service/AuthService.java:39-44` — registration enumerates usernames and email addresses

The two distinct 409 messages — `"Username is already taken"` and `"Email is already registered"` — are
an oracle, and both are pinned by tests (`AuthControllerIntegrationTest:47,62`).

**Failure scenario:** an attacker POSTs `/api/auth/register` with a throwaway username and a list of
candidate email addresses. `"Email is already registered"` confirms membership; the endpoint is
unauthenticated and unrated (see the brute-force finding), so the whole list can be checked quickly. For
a diary application, *"this person has an account here"* is itself the sensitive fact. The same probe
against usernames yields the exact input needed for password spraying, since the JWT `sub` is the
username.

The login path is handled correctly and deliberately (`AuthService.java:55-58`) — worth noting that the
inconsistency is only in registration.

**Fix:** the usual trade-off is to keep the username conflict explicit (users need it to pick a name)
and remove the email oracle: respond `202 Accepted` regardless, and send a "you already have an account"
email out-of-band. If that is too much machinery for this project, at minimum collapse both cases to one
message, `"Username or email is already registered"`, and accept that usernames remain enumerable.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/config/SecurityConfig.java:47-60` — no CORS configuration

There is no `.cors(...)`, no `CorsConfigurationSource` bean and no `@CrossOrigin` anywhere in the
backend (verified by grep across `src/`). `.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()`
(line 53) lets preflight requests through the authorization rules, but nothing ever writes an
`Access-Control-Allow-Origin` header, so the browser rejects the response regardless.

**Failure scenario:** `sample_project_FE` currently works only because `VITE_API_BASE_URL=/api` routes
through the Vite dev proxy, making requests same-origin. The moment the SPA is deployed to its own
origin — or a developer uncomments the `VITE_API_BASE_URL=http://localhost:8080/api` line that
`sample_project_FE/.env.example:12` offers — every call fails in the browser with a CORS error while
`curl` continues to work, which is a confusing failure to debug. The permitted `OPTIONS` matcher makes it
look like CORS was considered and handled.

**Fix — an explicit, origin-restricted configuration:**

```java
@Bean
public CorsConfigurationSource corsConfigurationSource(
        @Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(allowedOrigins);              // never "*" alongside credentials
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

and add `.cors(Customizer.withDefaults())` to the filter chain. If the proxy-only deployment is
intentional, say so in a comment on the `OPTIONS` matcher, because as written it reads like a
half-finished CORS setup.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/security/JwtAuthenticationFilter.java:44` — a database round-trip per authenticated request

Every request with a bearer token calls `loadUserByUsername`, which is a `SELECT` on `users`, even though
the token already carries everything `AuthenticatedUser` needs except the password hash — which is never
used on this path.

**Failure scenario:** a client paginating through entries issues one extra `users` query per page. At
sustained load this doubles the query count against a 10-connection pool and adds a round-trip to the
p99 of every endpoint. The lookup buys freshness (a deleted user is rejected immediately), but that
benefit is not currently realised — the id from the token is discarded anyway (see the `uid` finding).

**Fix:** either construct the principal straight from the verified claims —

```java
JwtPrincipal principal = jwtService.parseToken(token);
var user = new AuthenticatedUser(principal.userId(), principal.username(), null);
```

— accepting that revocation then depends entirely on `exp`, or keep the lookup and add a short-TTL
cache (`@Cacheable` on `loadUserByUsername`, 30–60 s) so the freshness guarantee is bounded but the
per-request cost is amortised. Decide deliberately; right now the code pays for the lookup without
getting its benefit.

---

## Low

### `sample_project_BE/src/main/java/com/sampleproject/diary/entity/User.java:27-31` and `entity/DiaryEntry.java:34-38` — `@Setter` exposes fields the schema declares immutable

`id` and `createdAt` on both entities, and `user` on `DiaryEntry`, are mapped `updatable = false`, yet
Lombok generates public setters for all of them. A future `entry.setUser(someoneElse)` compiles cleanly
and silently does nothing at flush time — the ownership change appears to succeed in the Java object
graph and is discarded by Hibernate. Narrow the annotation to the mutable fields:

```java
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiaryEntry {
    @Id @GeneratedValue @Column(nullable = false, updatable = false)
    private UUID id;                 // no setter

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false, …)
    private User user;               // no setter

    @Setter @Column(nullable = false, length = 200)
    private String title;
    // …@Setter on content and entryDate only
}
```

(`@Data` is correctly avoided on these entities — that part is right.)

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/service/DiaryService.java:93-100` — delete runs three queries where one suffices

`existsByIdAndUserId` is a `SELECT`, then the derived `deleteByIdAndUserId` loads the entity with a
second `SELECT` before issuing the `DELETE`. A modifying query returning the affected-row count collapses
this to one statement and removes the (harmless here, but real) window between check and delete:

```java
// DiaryEntryRepository
@Modifying
@Query("delete from DiaryEntry d where d.id = :id and d.user.id = :userId")
int deleteOwned(@Param("id") UUID id, @Param("userId") UUID userId);

// DiaryService
@Transactional
public void delete(UUID id) {
    UUID userId = currentUserProvider.requireCurrentUserId();
    if (diaryEntryRepository.deleteOwned(id, userId) == 0) {
        throw new ResourceNotFoundException("Diary entry not found");
    }
}
```

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/service/DiaryService.java:90` — redundant `save` on a managed entity

`requireOwnedEntry` returns an entity attached to the persistence context, so the setters alone are
enough — JPA flushes the dirty state at commit. `diaryEntryRepository.save(entry)` adds a no-op `merge`
and suggests to a reader that the call is what persists the change. `return DiaryEntryResponse.from(entry);`
is equivalent and clearer.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/config/SecurityConfig.java:70-71` — deprecated `DaoAuthenticationProvider` setup

Spring Security 6.4 (shipped with Boot 3.4.5) deprecates the no-arg constructor plus
`setUserDetailsService` in favour of the constructor that takes the service:

```java
DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
provider.setPasswordEncoder(passwordEncoder);
return new ProviderManager(provider);
```

This compiles with a warning today and will break on the next major upgrade.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/service/AuthService.java:39-49` — usernames and emails are stored and compared case- and whitespace-sensitively

Nothing trims or normalises the input, and the unique constraints are on the raw values. `mihan`,
`Mihan` and `mihan ` are three different accounts, and a user who registers as `Mihan` cannot log in as
`mihan` (`findByUsername` is an exact match). The same applies to email, where case-insensitivity is the
near-universal expectation. Normalise on the way in:

```java
String username = request.username().trim();
String email = request.email().trim().toLowerCase(Locale.ROOT);
```

and add `@Pattern(regexp = "^[a-zA-Z0-9_.-]+$")` to `RegisterRequest.username` so the stored value cannot
contain spaces at all.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/security/AuthenticatedUser.java:14` — no account-state flags

`UserDetails`'s `isEnabled` / `isAccountNonLocked` default to `true` and `User` has no corresponding
columns, so there is no way to disable, lock or soft-delete an account. That forecloses the standard
response to the abuse scenarios above (lock after N failed logins; disable a compromised account). A
`boolean enabled` and `boolean locked` on `User`, surfaced through `AuthenticatedUser`, is cheap to add
now and awkward to retrofit later.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/service/DiaryService.java:62-68` — argument validation runs before the identity check

`findAll` validates the date range before calling `requireCurrentUserId()`. The filter chain means an
anonymous caller never reaches this method, so it is not exploitable — but the ordering is backwards as
a habit, and it makes the method's behaviour depend on the filter chain rather than on itself. Resolve
the user first, then validate.

---

### `sample_project_BE/src/main/java/com/sampleproject/diary/controller/DiaryController.java:112` — inline fully-qualified annotation

`@org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)` is the only
fully-qualified annotation in the file; every other import is at the top. Same pattern in
`JwtAuthenticationFilter.java:48` (`org.springframework.security.core.userdetails.UsernameNotFoundException`
in the catch clause) and `GlobalExceptionHandler.java:95-97`
(`org.springframework.security.access.AccessDeniedException`). Import them.

---

### `sample_project_BE/Dockerfile:2,10` — mutable base tag and tests inside the image build

`maven:3.9-eclipse-temurin-21` is a moving tag, so an image rebuilt in six months may pick up a different
JDK patch level than the one that was tested — pin a digest or a full version. `RUN mvn -B clean package`
also runs the whole integration suite during the image build, which means a flaky test fails a deploy and
the build needs enough memory to boot Spring; run tests in CI and build the image with `-DskipTests`.

The rest of the Dockerfile is good: multi-stage, non-root `spring` user, dependency layer cached ahead of
sources, `MaxRAMPercentage` set for the container. Two small additions worth making — a `HEALTHCHECK`
(there is no actuator dependency, so add `spring-boot-starter-actuator` and probe `/actuator/health`), and
`-XX:+ExitOnOutOfMemoryError` so a heap exhaustion restarts the container instead of leaving it wedged.

---

### `sample_project_BE/src/main/resources/application.yml:8` — weak datasource password default

`password: ${DB_PASSWORD:diary}` silently falls back to `diary` when the variable is unset. Given that
`JWT_SECRET` on line 36 deliberately has *no* default so that a missing value fails startup, the
inconsistency looks accidental. Use `${DB_PASSWORD}` and let it fail loudly.

---

### `sample_project_BE/demo/` — leftover Spring Initializr scaffold

An entire second Maven project (`demo/pom.xml`, `DemoApplication.java`, its own `mvnw`, `HELP.md`) sits
beside the real one. It is not referenced by the root `pom.xml`, is not built, and contains nothing but
the generated skeleton. It adds a second `@SpringBootApplication` for a reader to trip over and a second
dependency tree for a scanner to flag. Delete it.

---

### Test coverage gaps

The existing suite is genuinely good on the part that matters most — `cannotTouchAnotherUsersEntry`
covers read, update and delete cross-user access and asserts the entry survives for its real owner, which
is exactly the right test to have. The gaps are around the token itself and the boundaries:

- **No `JwtService` unit test.** Nothing asserts that an expired token is rejected, that a token signed
  with a different key is rejected, that `alg: none` is rejected, or that the claims round-trip. These are
  the security-critical paths and they are currently untested — `DiaryControllerIntegrationTest:58` only
  checks the string `"not-a-real-token"`, which fails at parsing, not at signature verification.
- **No test for the `@Min`/`@Max` page parameters.** `size=101`, `size=0` and `page=-1` should all be
  400; `@Validated` plus `ConstraintViolationException` handling is wired up, but nothing exercises it.
- **No test for the reversed-range 400 at the HTTP layer.** `DiaryServiceTest.findAllRejectsReversedRange`
  asserts the exception type only, which is why the message-loss described in the `IllegalArgumentException`
  finding goes unnoticed.
- **No test for the duplicate-registration race,** which is inherently hard to write — but a test that
  `DataIntegrityViolationException` maps to 409 is easy and would cover the fix.
- **No `AuthService` unit test** for the register path.

Suggested addition:

```java
@Test
@DisplayName("rejects a token signed with a different key")
void rejectsForeignlySignedToken() throws Exception {
    SecretKey other = Keys.hmacShaKeyFor("a-completely-different-secret-key-32chars".getBytes(UTF_8));
    String forged = Jwts.builder().subject("mihan").claim("uid", UUID.randomUUID().toString())
            .expiration(Date.from(Instant.now().plusSeconds(60))).signWith(other).compact();

    mockMvc.perform(get("/api/diaries").header(HttpHeaders.AUTHORIZATION, "Bearer " + forged))
            .andExpect(status().isUnauthorized());
}
```

---

## Things I could not verify from the files

- **Whether the working-tree `.env` has ever been used for a real deployment.** The file is untracked and
  gitignored, so git history is clean; the High finding is about the hazard the file creates, not about a
  known leak. Checking the actual deployment's `JWT_SECRET` would settle it.
- **Runtime N+1 behaviour.** `DiaryEntryResponse.from` never dereferences `entry.getUser()`, and
  `@ManyToOne` is `LAZY`, so list and search endpoints should issue one query plus one count with no
  per-row user fetch. I could not confirm this against real SQL — `show-sql` is `false` and I did not run
  the application. Enabling `spring.jpa.properties.hibernate.generate_statistics` in a test run would
  confirm it.
- **Whether the missing CORS configuration is deliberate.** The `OPTIONS` permitAll matcher suggests it
  was thought about; the README says "No frontend is included" while `sample_project_FE` exists in the
  same repository. The author's intent would decide whether that finding is a bug or a documentation gap.

---

## Verdict

The security core of this codebase — object-level authorization, password hashing, query parameterisation,
DTO/entity separation and error-response hygiene — is done correctly and is backed by tests that check
the right things, which is more than most projects of this size manage. There are no Critical findings.

What holds it back from production is operational rather than architectural: a working `.env` carrying a
publicly-known JWT signing key, no brute-force protection on an unauthenticated login endpoint,
`ddl-auto: update` as the default schema strategy with no migration tool, and a registration path that
returns 500 on a routine concurrent-signup race. Those four are the merge blockers; each is a contained,
well-understood fix.

The Medium findings — the ignored `uid` claim, the unverified issuer, unrevocable 24-hour tokens, the
unindexed `LIKE` search and the publicly exposed API documentation — are worth scheduling before this
carries real users' diaries, but none of them blocks a merge on its own.
