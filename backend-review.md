# Backend Code Review — `sample_project_BE`

Scope: full review of the Spring Boot 3.4.5 / Java 21 diary backend (`sample_project_BE`).
Working tree is clean and the branch has no diff against `origin/v1`, so the whole module was
reviewed rather than a change set.

Overall the code is well structured: ownership is consistently enforced at the repository layer
(`findByIdAndUserId`, `existsByIdAndUserId`), the client never supplies a user id, passwords are
BCrypt-hashed and never serialized, `open-in-view` is off, and errors go through a single advice.
The findings below are mostly operational hardening plus a handful of real behavioural bugs.

No **critical** (directly exploitable, data-loss or auth-bypass) issues were found.

---

## High

### `src/main/java/com/sampleproject/diary/config/SecurityConfig.java:25-32`
**Swagger UI and the OpenAPI document are permanently public.** `/v3/api-docs`, `/v3/api-docs/**`,
`/swagger-ui.html` and `/swagger-ui/**` are in `PUBLIC_ENDPOINTS` with no profile guard and no
`springdoc.*.enabled` toggle in `application.yml`. Deploying the image built by `Dockerfile`
publishes the complete API surface — every route, parameter and schema — to anonymous internet
callers. Restrict these matchers to a `dev` profile, or set `springdoc.api-docs.enabled=false` /
`springdoc.swagger-ui.enabled=false` by default and enable them per-environment.

### `src/main/java/com/sampleproject/diary/service/AuthService.java:60` (and `AuthController.java:60`)
**No brute-force or rate-limit protection on `/api/auth/login`.** Nothing throttles by IP or
username, there is no account lockout, no CAPTCHA and no exponential backoff. An attacker can
credential-stuff the endpoint at full request rate; combined with the 8-character minimum password
(`RegisterRequest.java:23`) this is a practical account-takeover path. `/api/auth/register` is
likewise unthrottled and allows unbounded account creation. Add Bucket4j/Resilience4j rate limiting
or a failed-attempt counter with temporary lockout.

### `src/main/resources/application.yml:16` and `docker-compose.yml:37`
**Hibernate `ddl-auto` defaults to `update` in the deployable artifact.** Both the application
default (`${JPA_DDL_AUTO:update}`) and the compose default (`${JPA_DDL_AUTO:-update}`) are `update`,
so a production deployment that forgets to set `JPA_DDL_AUTO` lets Hibernate mutate the live schema
on every boot — silently adding columns, and never dropping or correcting them. The default should
be `validate` (or `none`) with a Flyway/Liquibase migration set; `update` should be opt-in for dev
only. There are currently no migration scripts in the repo at all.

### `src/main/java/com/sampleproject/diary/service/AuthService.java:39-52`
**Check-then-insert race on registration returns 500 instead of 409.** `existsByUsername` /
`existsByEmail` run in the same transaction as the later `save`, but nothing serialises two
concurrent registrations for the same username. Both requests pass the `exists` checks, and the
second `save` violates `uk_users_username` (`User.java:22-25`). The resulting
`DataIntegrityViolationException` is not handled by `GlobalExceptionHandler`, so it falls through to
`handleUnexpected` (`GlobalExceptionHandler.java:102`) and the client gets a 500 with
"An unexpected error occurred" rather than the documented 409. Catch
`DataIntegrityViolationException` and translate it to `DuplicateResourceException`; keep the
pre-checks only as a fast path.

### `src/main/java/com/sampleproject/diary/security/JwtService.java:43-50`
**Tokens cannot be revoked, and the `issuer` claim is written but never verified.** `generateToken`
sets `.issuer(properties.issuer())` (line 34) but `parseToken` only calls `verifyWith(signingKey)` —
it never asserts the issuer, so any token signed with the same secret by any co-located service is
accepted. There is also no logout, no deny-list and no refresh/short-lived-access-token split, while
`JWT_EXPIRATION` defaults to 86400s: a leaked token stays valid for 24 hours with no way to kill it.
Add `.requireIssuer(properties.issuer())` to the parser, shorten the access-token lifetime, and add
a revocation mechanism (jti deny-list or token version column on `users`).

---

## Medium

### `src/main/java/com/sampleproject/diary/exception/GlobalExceptionHandler.java:102-108`
**The `Exception` catch-all converts legitimate 4xx conditions into 500s.** The advice does not
extend `ResponseEntityExceptionHandler` and does not handle Spring MVC's standard exceptions, so:
`HttpRequestMethodNotSupportedException` (e.g. `PATCH /api/diaries/{id}`) → 500 instead of 405;
`HttpMediaTypeNotSupportedException` (wrong `Content-Type`) → 500 instead of 415; and in Boot 3.2+
`NoResourceFoundException` for an unknown authenticated path → 500 instead of 404. Every one of
these also writes a full stack trace at ERROR level, so a scanner hitting unknown URLs will flood
the logs. Add explicit handlers (or extend `ResponseEntityExceptionHandler`) before the catch-all.

### `src/main/java/com/sampleproject/diary/security/JwtAuthenticationFilter.java:44`
**A database round-trip per authenticated request.** After verifying the signature, the filter calls
`userDetailsService.loadUserByUsername(...)`, adding a `SELECT` against `users` to every single API
call even though the JWT already carries both `uid` and `sub`. Under load this multiplies DB traffic
and consumes Hikari connections (pool size 10). The `uid` claim is in fact never used — the
`JwtPrincipal.userId()` returned at line 43 is discarded. Either build the `AuthenticatedUser`
directly from the claims, or cache the lookup.

### `src/main/java/com/sampleproject/diary/repository/DiaryEntryRepository.java:48-56`
**Unindexable search query, and LIKE metacharacters are not escaped.**
`lower(d.title) like lower(concat('%', :keyword, '%'))` has a leading wildcard and wraps the column
in `lower()`, so PostgreSQL cannot use any B-tree index and must sequentially scan every row of the
user's entries (content is up to 20 000 chars). A user sending `keyword=%` or `keyword=_` also gets
raw wildcard semantics rather than a literal match. Scope is limited to the caller's own rows, so
this is a correctness/performance issue rather than a data-exposure one. Consider a
`pg_trgm` GIN index or a `tsvector` full-text column, and escape `%`, `_` and `\` in the keyword.

### `src/main/java/com/sampleproject/diary/config/SecurityConfig.java:53`
**`OPTIONS /**` is permitted for everyone although no CORS configuration exists.** There is no
`http.cors(...)`, no `CorsConfigurationSource` bean and no `@CrossOrigin` anywhere in the module —
the frontend relies on the Vite dev proxy (`sample_project_FE/vite.config.ts`). The blanket OPTIONS
exemption therefore buys nothing and unconditionally un-authenticates a verb across the whole app.
Either drop the matcher, or add a real CORS configuration with an allow-list of origins so that a
browser-based deployment works without proxying.

### `src/main/java/com/sampleproject/diary/exception/GlobalExceptionHandler.java:55-62`
**`IllegalArgumentException` is blanket-mapped to 400 and the message is thrown away.** Any internal
`IllegalArgumentException` — a bad `UUID.fromString`, a misconfigured library, a programming error
deep in a service — is reported to the client as a clean "Malformed or invalid request" 400 and is
never logged, so genuine bugs become invisible. Conversely the one intentional use,
`DiaryService.java:64` (`"'from' must not be after 'to'"`), loses its specific message and the caller
cannot tell what was wrong. Introduce a dedicated `BadRequestException` carrying the message, and
let `IllegalArgumentException` fall through to the logged handler.

### `Dockerfile:10`
**The image build runs the whole test suite and produces an unlayered fat jar.** `RUN mvn -B clean
package` executes all integration tests (which boot the full Spring context against H2) inside the
image build — slow, and it makes image builds fail for reasons unrelated to packaging. Use
`-DskipTests` in the image and run tests in CI. Also missing: Maven dependency-layer caching is only
partial (`dependency:go-offline` does not cover plugin deps), there is no `HEALTHCHECK`, and no
`--spring.profiles.active` is set. Note `COPY --from=build /build/target/*.jar` is a glob — if the
build ever emits a second jar the copy becomes ambiguous.

### `sample_project_BE/demo/` (whole directory)
**A leftover Spring Initializr scaffold is committed alongside the real application.** It contains a
second `@SpringBootApplication` (`demo/src/main/java/com/example/demo/DemoApplication.java`), its own
`pom.xml`, wrapper scripts and `application.properties`. It is not a Maven module of the parent pom,
so it is dead weight that confuses tooling and IDE imports, and a future `mvn` aggregation would pick
up a conflicting main class. Delete it.

### `.env` / `.env.example:21`
**Placeholder secret on disk, and no mechanism actually loads `.env` for local runs.** `.env` is
present in the working tree with `JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters`
— a publicly known string. It is correctly git-ignored (`.gitignore:35`) and not tracked, but if it
is ever copied to a server as-is, every JWT in the system is forgeable by anyone who has read the
repo. Separately, nothing in `pom.xml` loads `.env` (no `spring-dotenv`), so `./mvnw spring-boot:run`
outside Docker Compose fails at startup on the unresolvable `${JWT_SECRET}` placeholder
(`application.yml:36`) — only `docker compose` picks the file up. Document this, or add a dotenv
loader. Consider validating at startup that the secret is not the example value.

---

## Low

### `src/main/java/com/sampleproject/diary/service/DiaryService.java:93-100`
**`delete` issues two queries where one suffices.** `existsByIdAndUserId` followed by
`deleteByIdAndUserId` round-trips twice; the derived delete also loads the entity before removing it.
Have `deleteByIdAndUserId` return `int` (with `@Modifying @Query`) and throw
`ResourceNotFoundException` when it returns 0.

### `src/main/java/com/sampleproject/diary/controller/DiaryController.java:86`
**`keyword` has no maximum length.** `@NotBlank` only rejects blank input; a multi-megabyte query
string is accepted and pushed straight into a `LIKE` scan. Add `@Size(max = 200)`.

### `src/main/java/com/sampleproject/diary/entity/DiaryEntry.java:34-38` and `entity/User.java:27-31`
**Class-level `@Setter` and `@AllArgsConstructor` on JPA entities.** `setId(...)`, `setUser(...)` and
`setPasswordHash(...)` are all public, so nothing but convention stops a future caller from
reassigning ownership of an entry. Narrow the setters to the mutable fields
(`title`, `content`, `entryDate`) and drop the all-args constructor in favour of the builder.

### `src/main/java/com/sampleproject/diary/security/CurrentUserProvider.java:15-19`
**`authentication.isAuthenticated()` is not checked.** The `instanceof AuthenticatedUser` test makes
this safe today (anonymous authentication carries a `String` principal), but the guard is implicit;
an explicit `isAuthenticated()` check documents the intent and survives refactoring.

### `docker-compose.yml:10-11`
**PostgreSQL is published on the host.** `"${DB_PORT_HOST:-5432}:5432"` exposes the database outside
the compose network. Only the `app` service needs it — drop the `ports` block (or bind to
`127.0.0.1:5432:5432`) and rely on the internal network.

### `src/main/java/com/sampleproject/diary/config/SecurityConfig.java:70`
**`new DaoAuthenticationProvider()` plus `setUserDetailsService` is deprecated in Spring Security
6.4** (the version shipped with Boot 3.4.5) and will be removed in 7.x. Use the
`DaoAuthenticationProvider(UserDetailsService)` constructor.

---

## Notes on things that are correct

- IDOR/BOLA is properly prevented: every diary query is keyed by `(id, userId)` and a foreign entry
  returns 404 rather than 403, so ids are not enumerable.
- No SQL injection: all persistence goes through derived queries or a JPQL query with named
  parameters.
- User enumeration on login is avoided by delegating to `AuthenticationManager` and returning a
  single "Invalid username or password" message.
- `open-in-view: false`, lazy `@ManyToOne`, and composite `(user_id, entry_date)` index are the right
  choices for the list/filter endpoints.
- Page size is capped at 100 and the page number is bounded below at 0.
- The Docker image runs as a non-root `spring` user.
