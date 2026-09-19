# Backend Code Review — sample_project_BE

## Scope

Full read of the backend at `sample_project_BE` (working tree clean, `target/` ignored). Files read in full:

**Build / infra / config**
- `sample_project_BE/pom.xml`
- `sample_project_BE/Dockerfile`
- `sample_project_BE/.dockerignore`
- `sample_project_BE/docker-compose.yml`
- `sample_project_BE/.gitignore`
- `sample_project_BE/.env` (untracked) and `.env.example` (tracked)
- `sample_project_BE/src/main/resources/application.yml`
- `sample_project_BE/src/test/resources/application-test.yml`
- `sample_project_BE/README.md`

**Main sources** (all 27 files under `src/main/java/com/sampleproject/diary`)
- `DiaryApplication.java`
- `config/JwtConfig.java`, `config/OpenApiConfig.java`, `config/SecurityConfig.java`
- `controller/AuthController.java`, `controller/DiaryController.java`
- `dto/AuthResponse.java`, `dto/DiaryEntryRequest.java`, `dto/DiaryEntryResponse.java`, `dto/ErrorResponse.java`, `dto/LoginRequest.java`, `dto/PageResponse.java`, `dto/RegisterRequest.java`, `dto/UserResponse.java`
- `entity/DiaryEntry.java`, `entity/User.java`
- `exception/DuplicateResourceException.java`, `exception/GlobalExceptionHandler.java`, `exception/ResourceNotFoundException.java`, `exception/UnauthorizedException.java`
- `repository/DiaryEntryRepository.java`, `repository/UserRepository.java`
- `security/AuthenticatedUser.java`, `security/CurrentUserProvider.java`, `security/JwtAuthenticationFilter.java`, `security/JwtPrincipal.java`, `security/JwtProperties.java`, `security/JwtService.java`, `security/RestAccessDeniedHandler.java`, `security/RestAuthenticationEntryPoint.java`
- `service/AuthService.java`, `service/DiaryService.java`, `service/DiaryUserDetailsService.java`

**Tests** (all 5 files)
- `src/test/java/com/sampleproject/diary/AbstractIntegrationTest.java`, `AuthControllerIntegrationTest.java`, `DiaryControllerIntegrationTest.java`, `OpenApiDocumentationTest.java`, `service/DiaryServiceTest.java`

**Also inspected:** the tracked leftover scaffold under `demo/`.

---

## Critical

### 1. A known, publicly-committed JWT secret boots the app without complaint

`sample_project_BE/.env.example:23` — the placeholder `JWT_SECRET` is 61 characters, so it satisfies JJWT's 256-bit minimum and the application starts normally with it; nothing at startup rejects it. The local `.env` on disk is a byte-identical copy of `.env.example`, which is exactly the "copy the example and run" path the README prescribes.

Failure scenario: an operator follows §5 of the README, copies `.env.example` to `.env`, edits `DB_PASSWORD` (docker-compose fails loudly without it) but leaves `JWT_SECRET` at the placeholder — because nothing fails. `JwtService` (`security/JwtService.java:25`) happily derives an HMAC key from the string that is sitting in the public repository. Anyone who can read the repo mints a token for any username: `{"sub":"victim","uid":"<any>"}`, signs it with the published placeholder, and `JwtAuthenticationFilter` accepts it and loads the victim's account. Full account takeover of every user, with no credential needed.

Fix — make the placeholder unusable and validate at startup:

```java
// security/JwtProperties.java
@ConfigurationProperties(prefix = "app.jwt")
@Validated
public record JwtProperties(
        @NotBlank @Size(min = 32, message = "app.jwt.secret must be at least 32 characters") String secret,
        @Positive long expiration,
        @NotBlank String issuer) {

    private static final String PLACEHOLDER = "replace-with-a-random-secret-of-at-least-32-characters";

    public JwtProperties {
        if (PLACEHOLDER.equals(secret)) {
            throw new IllegalStateException(
                    "app.jwt.secret is still the .env.example placeholder; generate one with: openssl rand -base64 48");
        }
    }
}
```

and change `.env.example` to a value that cannot work, e.g. `JWT_SECRET=` (empty — the app then fails fast on the missing `${JWT_SECRET}` placeholder resolution).

---

## Major

### 2. Concurrent registration of the same username returns 500 instead of 409

`sample_project_BE/src/main/java/com/sampleproject/diary/service/AuthService.java:39-52` — `existsByUsername` / `existsByEmail` are a check-then-act with no handling of the unique-constraint violation that the DB will raise at commit.

Failure scenario: two registrations for username `mihan` arrive in parallel. Both pass `existsByUsername` (neither transaction has committed), both call `save`, and the second commit violates `uk_users_username`. Spring translates this to `DataIntegrityViolationException`, which has no handler in `GlobalExceptionHandler`, so it falls through to `handleUnexpected` (`exception/GlobalExceptionHandler.java:102-108`) and the client sees `500 An unexpected error occurred` with a stack trace in the server log — for what is an ordinary 409. The data stays correct (the constraints exist), but the contract documented in README §10 is broken.

Fix — add a handler that maps the constraint back to 409:

```java
// exception/GlobalExceptionHandler.java
@ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex,
                                                         HttpServletRequest request) {
    log.warn("Constraint violation on {} {}", request.getMethod(), request.getRequestURI());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(
            HttpStatus.CONFLICT.value(), "Username or email is already registered", request.getRequestURI()));
}
```

### 3. `/api/auth/login` has no rate limiting or lockout

`sample_project_BE/src/main/java/com/sampleproject/diary/config/SecurityConfig.java:26-27` permits `/api/auth/login` and `/api/auth/register` to everyone, and nothing downstream counts failures.

Failure scenario: the API enforces only `@Size(min = 8)` on passwords (`dto/RegisterRequest.java:23`) — its own Swagger example is `password123`. An attacker scripts `POST /api/auth/login` against a known username. BCrypt at the default strength 10 gives roughly 10–15 attempts/second per core, unlimited and unlogged; a short password list finds the account. There is no failed-login log line either, so nothing is detectable after the fact.

Fix — at minimum a per-IP+username bucket in front of the login endpoint, or Spring Security 6.5's built-in lockout. A minimal in-process guard:

```java
// service/AuthService.java
private final Map<String, AtomicInteger> failures = Caffeine.newBuilder()
        .expireAfterWrite(Duration.ofMinutes(15)).<String, AtomicInteger>build().asMap();

public AuthResponse login(LoginRequest request) {
    String key = request.username().toLowerCase(Locale.ROOT);
    if (failures.getOrDefault(key, new AtomicInteger()).get() >= 10) {
        throw new BadCredentialsException("locked");   // still renders as the generic 401
    }
    try {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        failures.remove(key);
        ...
    } catch (AuthenticationException ex) {
        failures.computeIfAbsent(key, k -> new AtomicInteger()).incrementAndGet();
        log.warn("Failed login for '{}'", key);   // username only, never the password
        throw ex;
    }
}
```

Note the deliberate asymmetry with finding 4: the *response* must stay identical; only the internal counter and the log distinguish cases.

### 4. Registration discloses whether an email address is already registered

`sample_project_BE/src/main/java/com/sampleproject/diary/service/AuthService.java:42-44` returns the distinct message `"Email is already registered"`, and `AuthControllerIntegrationTest.java:62` locks that behavior in.

Failure scenario: `/api/auth/register` is unauthenticated. An attacker POSTs `{"username":"<random>","email":"target@corp.com","password":"xxxxxxxx"}`. A 409 with `"Email is already registered"` confirms that address has an account here; a 201 confirms it does not (and silently creates junk accounts as a side effect). For a *diary* product, "does this person keep a diary here" is precisely the fact users expect to stay private — this is the one enumeration vector the login path (correctly, per `AuthService.java:55-58`) closes.

Fix — collapse the email branch to a generic conflict, or better, decouple it: accept the registration, return 201 regardless, and send a "this address is already registered" email out-of-band. The minimal change:

```java
if (userRepository.existsByUsername(request.username())) {
    throw new DuplicateResourceException("Username is already taken");
}
if (userRepository.existsByEmail(request.email())) {
    // Same message as the username case: do not confirm which field collided.
    throw new DuplicateResourceException("Username is already taken");
}
```

and update `AuthControllerIntegrationTest.rejectsDuplicateEmail` to assert only the 409 status.

### 5. `ddl-auto: update` is the default in the production profile

`sample_project_BE/src/main/resources/application.yml:17` defaults to `update`, and `docker-compose.yml` passes `JPA_DDL_AUTO: ${JPA_DDL_AUTO:-update}` — so the shipped container runs Hibernate schema generation against the real database. The inline comment acknowledges this ("use Flyway/Liquibase migrations for production") but the default was never flipped.

Failure scenario: someone shortens `@Column(length = 20000)` on `DiaryEntry.content` or renames a field, deploys, and Hibernate silently alters the live table — or, more commonly, `update` quietly *fails* to apply a change it cannot express and the app runs against a schema that no longer matches the entities, producing runtime errors far from the cause. There is no migration history and no rollback.

Fix — default to `validate` and let dev opt in:

```yaml
# application.yml
jpa:
  hibernate:
    ddl-auto: ${JPA_DDL_AUTO:validate}
```

```yaml
# docker-compose.yml
JPA_DDL_AUTO: ${JPA_DDL_AUTO:-validate}
```

and add `spring-boot-starter-flyway` with `V1__initial_schema.sql` matching the current entities.

---

## Minor

### 6. A signed token missing the `uid` claim causes a 500, not a 401

`sample_project_BE/src/main/java/com/sampleproject/diary/security/JwtService.java:49` — `UUID.fromString(claims.get(CLAIM_USER_ID, String.class))` throws `NullPointerException` (not `IllegalArgumentException`) when the claim is absent, and `JwtAuthenticationFilter.java:48` catches only `JwtException`, `IllegalArgumentException` and `UsernameNotFoundException`.

Failure scenario: a token minted by an older or future build of this service that omits `uid`, presented after a rolling deploy. The NPE escapes `doFilterInternal`, bypasses `@RestControllerAdvice` entirely (filter-level exceptions never reach it), and the container returns a bare 500. The correct answer is 401.

Fix:

```java
public JwtPrincipal parseToken(String token) throws JwtException {
    Claims claims = Jwts.parser()
            .verifyWith(signingKey)
            .requireIssuer(properties.issuer())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    String userId = claims.get(CLAIM_USER_ID, String.class);
    if (userId == null || claims.getSubject() == null) {
        throw new io.jsonwebtoken.MalformedJwtException("Token is missing required claims");
    }
    return new JwtPrincipal(UUID.fromString(userId), claims.getSubject());
}
```

Note this also adds `.requireIssuer(...)`: `JwtProperties.issuer` is written into every token at `JwtService.java:33` but never checked on the way back in, so the claim is currently decorative.

### 7. `JwtPrincipal.userId` is parsed and then discarded

`sample_project_BE/src/main/java/com/sampleproject/diary/security/JwtAuthenticationFilter.java:43-44` — the filter extracts the principal but re-resolves the account by `principal.username()`, ignoring `principal.userId()`.

Failure scenario: user `mihan` (id A) is deleted while holding a valid 24-hour token; a different person registers the now-free username `mihan` (id B). The old token still parses, `loadUserByUsername("mihan")` returns id B, and the first person reads and writes the second person's diary until the token expires. Narrow today (there is no delete-account endpoint) but the mismatch is latent and the `uid` claim exists precisely to prevent it.

Fix — bind the identity check to the immutable id:

```java
JwtPrincipal principal = jwtService.parseToken(token);
AuthenticatedUser user = userDetailsService.loadUserByUsername(principal.username());
if (!user.getId().equals(principal.userId())) {
    throw new io.jsonwebtoken.JwtException("Token subject no longer matches the account");
}
```

### 8. `handleBadRequest` swallows every `IllegalArgumentException` in the application, unlogged

`sample_project_BE/src/main/java/com/sampleproject/diary/exception/GlobalExceptionHandler.java:55-62` lumps `IllegalArgumentException` in with genuine binding failures and logs nothing.

Two consequences. First, a real internal bug — any library or of our own code throwing IAE deep in a service — surfaces to the client as `400 Malformed or invalid request` and leaves no trace in the log, so it is invisible in production. Second, the deliberate, informative message from `DiaryService.java:64` (`"'from' must not be after 'to'"`) is replaced by the generic string, so a client passing `?from=2026-09-18&to=2026-09-01` cannot tell what it did wrong.

Fix — give the domain case its own exception and log the catch-all:

```java
// A small domain exception beats reusing IllegalArgumentException:
public class InvalidRequestException extends RuntimeException { ... }

@ExceptionHandler(InvalidRequestException.class)
public ResponseEntity<ErrorResponse> handleInvalidRequest(InvalidRequestException ex, HttpServletRequest request) {
    return ResponseEntity.badRequest().body(ErrorResponse.of(
            HttpStatus.BAD_REQUEST.value(), ex.getMessage(), request.getRequestURI()));
}

@ExceptionHandler({HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class})
public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex, HttpServletRequest request) {
    log.debug("Bad request on {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
    return ResponseEntity.badRequest().body(ErrorResponse.of(
            HttpStatus.BAD_REQUEST.value(), "Malformed or invalid request", request.getRequestURI()));
}
```

with `DiaryService.findAll` throwing `InvalidRequestException` and `DiaryServiceTest.findAllRejectsReversedRange` updated.

### 9. The `JwtException` handler is unreachable dead code

`sample_project_BE/src/main/java/com/sampleproject/diary/exception/GlobalExceptionHandler.java:88-93` handles `JwtException`, but the only place a `JwtException` is thrown is `JwtService.parseToken`, called from `JwtAuthenticationFilter.java:43` — inside the servlet filter chain, *before* `DispatcherServlet`. `@RestControllerAdvice` only sees exceptions from handler-method dispatch, so this branch can never fire. It is harmless, but it reads as protection that does not exist (the actual 401 comes from `RestAuthenticationEntryPoint`).

Fix — drop `JwtException` from the annotation and keep `UnauthorizedException` (which *is* thrown from `CurrentUserProvider` during handler execution and does reach the advice):

```java
@ExceptionHandler(UnauthorizedException.class)
public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex, HttpServletRequest request) { ... }
```

### 10. No CORS configuration, so any non-proxied browser deployment breaks

`SecurityConfig.java:47-59` never calls `.cors(...)` and there is no `CorsConfigurationSource` bean anywhere in the backend. `SecurityConfig.java:53` permits `OPTIONS /**`, which suggests CORS was intended, but permitting the preflight without a `CorsFilter` accomplishes nothing — Spring still returns no `Access-Control-Allow-Origin`.

Failure scenario: today the SPA sets `VITE_API_BASE_URL=/api` and relies on the Vite dev proxy (`sample_project_FE/.env:3-4`), so everything is same-origin and this is invisible. The moment the frontend is deployed on its own origin — the commented-out `VITE_API_BASE_URL=http://localhost:8080/api` in `sample_project_FE/.env.example:12` is exactly that — every request fails CORS in the browser with no server-side error to diagnose from.

Fix — an explicit, allowlisted configuration driven by an environment variable (never `*` alongside credentials):

```java
@Bean
CorsConfigurationSource corsConfigurationSource(
        @Value("${app.cors.allowed-origins:}") List<String> allowedOrigins) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(allowedOrigins);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}
```

then `.cors(Customizer.withDefaults())` in the chain and `app.cors.allowed-origins: ${CORS_ALLOWED_ORIGINS:}` in `application.yml`. With the token in an `Authorization` header rather than a cookie, `allowCredentials` stays false and CSRF-disabled remains the right posture.

### 11. Swagger UI and the OpenAPI document are public in every profile

`sample_project_BE/src/main/java/com/sampleproject/diary/config/SecurityConfig.java:28-31` permits `/v3/api-docs/**` and `/swagger-ui/**` unconditionally.

Failure scenario: the Docker image from `docker-compose.yml` is deployed publicly. Anyone fetches `/v3/api-docs` and gets the complete endpoint inventory, parameter constraints and example payloads — a free map for the unthrottled login endpoint in finding 3. Not a vulnerability by itself; it lowers the cost of every other one.

Fix — gate the springdoc paths on a profile:

```java
@Profile("!prod")
@Bean
SecurityFilterChain docsChain(HttpSecurity http) throws Exception { ... }
```

or simply set `springdoc.api-docs.enabled: false` and `springdoc.swagger-ui.enabled: false` in a `prod` profile and remove those entries from `PUBLIC_ENDPOINTS` there. `OpenApiDocumentationTest` runs under the `test` profile and is unaffected.

### 12. `%` and `_` in a search keyword act as SQL wildcards

`sample_project_BE/src/main/java/com/sampleproject/diary/repository/DiaryEntryRepository.java:48-56` — the parameter is correctly bound (no injection), but `concat('%', :keyword, '%')` interpolates the raw value into a LIKE pattern.

Failure scenario: `GET /api/diaries/search?keyword=%` returns every one of the caller's entries rather than none; `keyword=a_c` matches `abc`. Confined to the caller's own data, so the impact is a wrong result rather than a leak — but combined with the unbounded leading-wildcard LIKE (which cannot use an index and scans the user's whole partition of `diary_entries`), a caller with many long entries can make this expensive on demand.

Fix — escape the metacharacters before binding:

```java
// DiaryEntryRepository
@Query("""
        select d from DiaryEntry d
        where d.user.id = :userId
          and (lower(d.title) like lower(:pattern) escape '\\'
               or lower(d.content) like lower(:pattern) escape '\\')
        """)
Page<DiaryEntry> searchByUserAndKeyword(@Param("userId") UUID userId,
                                        @Param("pattern") String pattern,
                                        Pageable pageable);
```

```java
// DiaryService.search
String pattern = "%" + keyword.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
Page<DiaryEntry> entries = diaryEntryRepository.searchByUserAndKeyword(userId, pattern, pageable(page, size));
```

Longer term, a PostgreSQL trigram index (`pg_trgm`) or full-text search is the right answer for content search on a growing table.

### 13. Deleting an entry costs three round trips instead of one

`sample_project_BE/src/main/java/com/sampleproject/diary/service/DiaryService.java:93-100` runs `existsByIdAndUserId`, then `deleteByIdAndUserId` — and the derived delete itself issues a SELECT before the DELETE. Three statements where one suffices.

Fix — a modifying delete that reports how many rows it touched:

```java
// DiaryEntryRepository
@Modifying
@Query("delete from DiaryEntry d where d.id = :id and d.user.id = :userId")
int deleteOwned(@Param("id") UUID id, @Param("userId") UUID userId);
```

```java
// DiaryService
@Transactional
public void delete(UUID id) {
    UUID userId = currentUserProvider.requireCurrentUserId();
    if (diaryEntryRepository.deleteOwned(id, userId) == 0) {
        throw new ResourceNotFoundException("Diary entry not found");
    }
}
```

This keeps the 404-for-foreign-entries behavior that `DiaryControllerIntegrationTest.cannotTouchAnotherUsersEntry` asserts; `DiaryServiceTest.deleteRejectsForeignEntry` needs its stub updated to `given(...deleteOwned(...)).willReturn(0)`.

### 14. No test covers JWT validation itself

There is no `JwtServiceTest`, and no integration test exercises an expired token, a token signed with a different secret, a token with a tampered payload, or a wrong issuer. `DiaryControllerIntegrationTest.rejectsAnonymousAccess:58` sends `"Bearer not-a-real-token"`, which only proves that a syntactically invalid string is rejected — the easiest case. Given that JWT validation is the entire authorization boundary, these are the paths most worth pinning, and findings 1, 6 and 7 all live in code no test touches.

Fix — a focused unit test:

```java
@Test
@DisplayName("rejects a token signed with a different secret")
void rejectsForeignSignature() {
    JwtService mine = new JwtService(new JwtProperties("a".repeat(32), 3600, "diary-backend"));
    JwtService theirs = new JwtService(new JwtProperties("b".repeat(32), 3600, "diary-backend"));
    String forged = theirs.generateToken(UUID.randomUUID(), "mihan");
    assertThatThrownBy(() -> mine.parseToken(forged)).isInstanceOf(JwtException.class);
}

@Test
@DisplayName("rejects an expired token")
void rejectsExpiredToken() {
    JwtService service = new JwtService(new JwtProperties("a".repeat(32), -1, "diary-backend"));
    String expired = service.generateToken(UUID.randomUUID(), "mihan");
    assertThatThrownBy(() -> service.parseToken(expired)).isInstanceOf(ExpiredJwtException.class);
}
```

Also worth adding: an integration test asserting `400` for `size=0`, `size=101` and `page=-1`, since those `@Min`/`@Max` constraints on `DiaryController.java:75-77` are currently unverified and depend on the class-level `@Validated` staying in place.

### 15. Tokens cannot be revoked

Nothing in `security/` tracks issued tokens. A 24-hour token (`.env.example:26`) stays valid for its full lifetime after a password change or a suspected compromise, and there is no logout endpoint. For a diary app this is a reasonable simplification, but it is not stated anywhere — README §14 lists the security properties without mentioning this limitation. Either add a `tokenVersion` column on `User` that is written into the token and compared on each request, or document the trade-off and shorten the default lifetime to an hour with a refresh token.

---

## Nit

### 16. Leftover Spring Initializr scaffold is committed

`sample_project_BE/demo/` — nine tracked files (`demo/pom.xml`, `demo/src/main/java/com/example/demo/DemoApplication.java`, `demo/mvnw`, etc.) from an abandoned `com.example.demo` project, unreferenced by the real build. It is already excluded from the Docker image via `.dockerignore`, so this is purely repository hygiene. Delete the directory.

### 17. `DaoAuthenticationProvider.setUserDetailsService` is deprecated

`sample_project_BE/src/main/java/com/sampleproject/diary/config/SecurityConfig.java:70-71` — deprecated in Spring Security 6.4 (the version Boot 3.4.5 pulls in) in favour of the constructor. Compiles with a warning today; will break on the 7.x upgrade.

```java
DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
provider.setPasswordEncoder(passwordEncoder);
return new ProviderManager(provider);
```

### 18. `DiaryController.delete` uses a fully-qualified annotation

`sample_project_BE/src/main/java/com/sampleproject/diary/controller/DiaryController.java:112` writes `@org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)` inline while every other annotation in the file is imported. Same in `AbstractIntegrationTest.java:52,57` with `MockMvcResultMatchers`. Add the imports.

### 19. `POST /api/auth/register` returns 201 without a `Location` header

`AuthController.java:46-48` returns `ResponseEntity.status(CREATED)` with no `Location`, whereas `DiaryController.create:63` correctly sets one. Inconsistent, though there is no `GET /api/users/{id}` to point at — arguably the right call is to leave it, but the asymmetry is worth a deliberate decision.

---

## Verdict

The core authorization design is genuinely good and is the hardest part to get right: every diary query is scoped by `(entryId, userId)` at the repository level, the owner is never client-supplied, foreign entries return 404 rather than 403, and `DiaryControllerIntegrationTest.cannotTouchAnotherUsersEntry` proves it end to end — I found no IDOR/BOLA path. Layering, DTO/entity separation and the error contract are all clean.

It is not ready to merge as-is. Finding 1 is the blocker: the documented setup path leaves a deployment signing tokens with a secret that is published in the repo, which is full account takeover, and it needs a startup guard rather than a comment. Findings 2–5 should land in the same pass — the 500-on-concurrent-register, the unthrottled login endpoint, the email enumeration on register, and `ddl-auto: update` against a production database are each straightforwardly fixable and each contradicts a claim the README already makes.

One thing I could not verify from the files: whether this service is ever deployed behind a gateway that already provides TLS termination, rate limiting or CORS. If such a gateway exists, findings 3 and 10 shrink considerably. Point me at the deployment manifests or ingress configuration and I will re-rate those two.
