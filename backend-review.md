# Backend Code Review — `sample_project_BE`

Scope: the `com.sampleproject.diary` Spring Boot 3.4.5 / Java 21 service, plus its
build, container and configuration files. The PR diff for branch `v2.1` contains no
backend source changes (only `.claude-flow` state files), so the whole backend tree
was reviewed as the named target.

Overall the design is sound: every diary query is scoped by `(id, userId)`, passwords
are BCrypt-hashed, the principal is never taken from the request body, errors go through
a single `@RestControllerAdvice`, and `open-in-view` is off. The findings below are the
gaps in that otherwise solid baseline.

Severity counts: **Critical 1 · High 4 · Medium 6 · Low 4**

---

## Critical

### `.env:21` (and `.env.example:21`, `docker-compose.yml:35`)
**A fully functional placeholder JWT signing key ships with the repo.**
`JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters` is exactly 52
characters, so `Keys.hmacShaKeyFor` accepts it and the application boots normally with it.
`docker-compose.yml` only asserts the variable is *set* (`${JWT_SECRET:?...}`), never that
it was changed. Scenario: someone runs `cp .env.example .env && docker compose up` on a
public host; the signing key is a public, greppable string, so anyone can mint a token for
any username and read/modify that user's entire diary. Fail fast at startup instead —
reject a secret equal to the placeholder, and have compose refuse to start on the default.

---

## High

### `src/main/java/com/sampleproject/diary/security/JwtService.java:49`
**`UUID.fromString(null)` throws an uncaught `NullPointerException`.**
`claims.get(CLAIM_USER_ID, String.class)` returns `null` when the `uid` claim is absent.
`UUID.fromString(null)` then throws `NullPointerException`, which is *not* in the
`JwtAuthenticationFilter` catch list (`JwtException | IllegalArgumentException |
UsernameNotFoundException`, line 48). Because the throw happens inside a servlet filter,
`GlobalExceptionHandler` never sees it either — the request dies with a container-level
500/whitelabel page instead of the intended 401. Scenario: any validly-signed token that
lacks `uid` (a token minted by an older build, or by any other service sharing the secret).
Same applies to a `null` subject, which reaches `loadUserByUsername(null)`.
Fix: validate both claims explicitly and throw `JwtException`, or widen the catch to
`RuntimeException`.

### `src/main/java/com/sampleproject/diary/security/JwtService.java:43-50`
**The `issuer` claim is written but never verified.**
`generateToken` sets `.issuer(properties.issuer())`, but `parseToken` only calls
`verifyWith(...).parseSignedClaims(...)` — no `requireIssuer`, no audience check, no
allowed clock skew. Scenario: two environments (or two services) share the HMAC secret;
a token issued for the staging issuer authenticates against production. The config value
gives a false impression of a check that does not exist.

### `src/main/java/com/sampleproject/diary/config/SecurityConfig.java:28-31`
**Swagger UI and the OpenAPI document are unauthenticated in every profile.**
`/v3/api-docs`, `/v3/api-docs/**`, `/swagger-ui.html` and `/swagger-ui/**` are in
`PUBLIC_ENDPOINTS` with no profile guard. Scenario: the container is deployed as-is; an
anonymous visitor to `/swagger-ui.html` gets the complete API surface, parameter
constraints and example payloads — a free reconnaissance map. Gate these behind a
`@Profile("!prod")` filter chain or `springdoc.api-docs.enabled=false` in production.

### `src/main/java/com/sampleproject/diary/controller/AuthController.java:60` / `service/AuthService.java:60`
**No brute-force protection on `POST /api/auth/login`.**
There is no rate limiting, no per-account failed-attempt counter, no lockout, no CAPTCHA
and no delay. `RegisterRequest` allows 8-character passwords (`password123` is even the
Swagger example). Scenario: an attacker who knows a username — trivially discovered, since
registration returns 409 "Username is already taken" — can run an unbounded online
dictionary attack at full server throughput. Add a bucket/lockout filter in front of the
login endpoint and log repeated failures.

### `src/main/resources/application.yml:16`
**`ddl-auto` defaults to `update` and there is no migration tool.**
`ddl-auto: ${JPA_DDL_AUTO:update}` and `docker-compose.yml:37` propagates the same default,
so the shipped compose stack lets Hibernate mutate the schema at every boot. Scenario: a
column is renamed in a later release — Hibernate silently adds the new column and leaves
the old one with the live data behind, with no reviewable change and no rollback path. The
comment in the file acknowledges this ("use Flyway/Liquibase for production") but nothing
enforces it. Default to `validate` and add Flyway.

---

## Medium

### `src/main/java/com/sampleproject/diary/service/AuthService.java:39-52`
**Check-then-insert race on uniqueness returns 500, not 409.**
`existsByUsername` / `existsByEmail` are evaluated before `save`, with no handler for
`DataIntegrityViolationException` anywhere in `GlobalExceptionHandler`. Scenario: two
concurrent registrations of the same username both pass the `exists` checks; the second
`save` violates `uk_users_username`, the exception falls through to
`handleUnexpected(Exception)` and the client gets `500 An unexpected error occurred`
instead of the documented `409`. Catch `DataIntegrityViolationException` and map it to 409.

### `src/main/java/com/sampleproject/diary/service/AuthService.java:39-50`
**Username and email are not normalized before the uniqueness check.**
Values are stored and compared verbatim. Scenario: `mihan` registers, then `Mihan` and
`MIHAN` register successfully as separate accounts; likewise `a@x.com` and `A@X.com` both
pass `existsByEmail`. Login is then username-exact, which is confusing at best and an
account-confusion vector at worst. Lower-case (and trim) both fields on write, and back it
with a functional/lower-case unique index.

### `src/main/java/com/sampleproject/diary/repository/DiaryEntryRepository.java:48-56`
**Unescaped LIKE wildcards plus an unindexable leading-wildcard scan.**
The keyword is interpolated into `like lower(concat('%', :keyword, '%'))` with no escaping.
Two consequences: (a) a keyword of `%` or `_` silently changes the match semantics — `%`
returns every entry the caller owns, which is not what "search for the literal string %"
should do; (b) `lower(content) like '%…%'` on a `varchar(20000)` column can never use an
index, so every search is a sequential scan over all of the user's rows, decoding full
entry bodies. Escape `%`, `_` and `\` in the service and add `escape '\'`; for real search
volume move to a `pg_trgm` GIN index or `tsvector`.

### `src/main/java/com/sampleproject/diary/exception/GlobalExceptionHandler.java:55-62`
**`IllegalArgumentException` is globally mapped to 400 and never logged.**
The handler lumps `IllegalArgumentException` in with genuinely client-caused exceptions and
returns a fixed "Malformed or invalid request". Scenario: a server-side bug — say
`UUID.fromString` on a malformed value read from the database, or an
`IllegalArgumentException` from a future collaborator — is reported to the caller as *their*
mistake and leaves no log line at all, so the defect is invisible in monitoring. It also
swallows the specific message from `DiaryService.findAll:64` (`'from' must not be after
'to'`), which the caller would actually benefit from. Introduce a dedicated
`InvalidRequestException` for intentional 400s and let `IllegalArgumentException` fall
through to the logged 500 handler.

### `src/main/java/com/sampleproject/diary/service/DiaryService.java:84-91`
**Lost update: no optimistic locking on `DiaryEntry`.**
`update` loads the entity, overwrites all three mutable fields and saves, with no `@Version`
column. Scenario: the user has the same entry open in two tabs; tab A saves a long edit,
tab B (loaded earlier) then saves, and A's content is silently overwritten with no conflict
signalled. Add `@Version` and map `OptimisticLockingFailureException` to 409.

### `src/main/java/com/sampleproject/diary/security/JwtProperties.java:9`
**Configuration properties are unvalidated.**
`JwtProperties` has no `@Validated` / `@NotBlank` / `@Positive`. Scenario: `JWT_SECRET` is
unset outside compose (`application.yml:36` has no default) — the context fails with a
placeholder-resolution error, or, if resolved to an empty string, with an opaque
`WeakKeyException` from the `JwtService` constructor. Likewise a zero or negative
`JWT_EXPIRATION` produces tokens that are already expired at issue, with no complaint at
startup. Annotate the record and fail with a readable message.

---

## Low

### `src/main/java/com/sampleproject/diary/config/SecurityConfig.java:49,53`
**`OPTIONS /**` is permitted but no CORS is configured — the permit is dead and slightly
weakening.** `http.cors(...)` is never called and there is no `CorsConfigurationSource`
bean, so preflights get no `Access-Control-Allow-Origin` and fail anyway; the frontend
works only because `sample_project_FE/vite.config.ts` proxies `/api`. The line therefore
buys nothing while exposing every endpoint to unauthenticated `OPTIONS`. Either add an
explicit `cors()` configuration with an allow-list, or drop the matcher. CSRF disabling
(line 49) is correct for a stateless bearer-token API, but only as long as the token is
never stored in a cookie.

### `src/main/java/com/sampleproject/diary/service/DiaryService.java:93-100`
**`delete` issues three statements where one would do.**
`existsByIdAndUserId` is a `select`, then the derived `deleteByIdAndUserId` does its own
`select` followed by the `delete`. Change `deleteByIdAndUserId` to a `@Modifying @Query`
returning the affected row count and throw `ResourceNotFoundException` when it is 0 — one
round trip, same 404 semantics, and no TOCTOU window between the check and the delete.

### `src/main/java/com/sampleproject/diary/security/JwtAuthenticationFilter.java:44`
**A database round trip per authenticated request, and no token revocation.**
`loadUserByUsername` runs on every call even though the JWT already carries the user id and
username. Combined with a 24-hour lifetime (`.env:23`) and no denylist, a leaked or
logged-out token stays valid for a full day. Consider a short-lived access token plus a
refresh endpoint, or a small cache keyed on username with an explicit invalidation hook.

### `Dockerfile:10`, `sample_project_BE/demo/`
**Build and repo hygiene.**
`RUN mvn -B clean package` (note the trailing whitespace) runs the whole test suite inside
the image build, so an image build needs the H2 test stack and takes minutes; the earlier
`dependency:go-offline` layer is largely wasted because `clean` re-resolves plugins. Prefer
`-DskipTests` in the image and run tests in CI. The image also has no `HEALTHCHECK` while
`docker-compose.yml` sets `restart: unless-stopped`, so a wedged JVM is never restarted.
Separately, the committed `demo/` module (`com.example.demo` scaffolding, its own
`pom.xml`, `mvnw`, and a stale `target/classes/application.properties`) is dead weight that
confuses newcomers about which module is the application — delete it.

---

## Things that were checked and look correct

- **IDOR/BOLA**: every read, update and delete goes through `findByIdAndUserId` /
  `existsByIdAndUserId`, and `DiaryEntryRequest` has no `userId` field. Another user's entry
  is a 404, not a 403 — the right choice.
- **Algorithm confusion**: JJWT 0.12's `verifyWith(SecretKey)` constrains verification to
  MAC algorithms, so `alg: none` and RS256→HS256 swaps are not exploitable here.
- **Credential handling**: BCrypt via `DaoAuthenticationProvider`, identical failure for
  unknown-user and wrong-password, `passwordHash` never present on any response DTO.
- **Error surface**: `server.error.include-stacktrace/include-message: never`, and the
  catch-all handler logs the exception server-side while returning a generic body.
- **Pagination bounds**: `@Min(0)` on `page` and `@Min(1) @Max(100)` on `size` are enforced
  by `@Validated` and surface as 400s.
- **Indexes**: `idx_diary_entries_user_id_entry_date` matches the default
  `(entryDate desc, createdAt desc)` sort used by the list endpoints.
