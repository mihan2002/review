# Diary Backend

A production-ready, backend-only REST API for a personal diary. Registered users authenticate with a
JWT and manage **only their own** diary entries — create, read, update, delete, search and filter by date.

No frontend is included.

---

## 1. Project overview

| Capability     | Detail                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| Authentication | Register + login, BCrypt password hashing, stateless JWT bearer tokens |
| Diary CRUD     | Create, list, read, update, delete entries                             |
| Search         | Case-insensitive keyword match on title and content                    |
| Filtering      | Inclusive `from`/`to` range on `entryDate`                             |
| Pagination     | `page` / `size` params, newest diary date first                        |
| Docs           | Swagger UI with a preconfigured JWT "Authorize" button                 |
| Errors         | Central `@RestControllerAdvice`, consistent JSON, no stack traces      |
| Infrastructure | PostgreSQL + multi-stage Docker build + Docker Compose                 |

**Authorization rule:** every diary query is executed as `findByIdAndUserId(entryId, authenticatedUserId)`.
The client can never submit a `userId`; the owner is always taken from the JWT. An entry belonging to
another user is reported as `404 Not Found`, so the API does not even reveal that the id exists
(IDOR/BOLA protection).

---

## 2. Technology stack

- Java 21
- Spring Boot 3.4.5 (Web, Data JPA, Security, Validation)
- Hibernate 6 / PostgreSQL 16
- JJWT 0.12 (HMAC-SHA256)
- springdoc-openapi 2.8 (Swagger UI)
- Maven, Docker, Docker Compose
- JUnit 5, Mockito, Spring Security Test, H2 (tests only)

---

## 3. Architecture

```
HTTP  ->  Controller  ->  Service  ->  Repository  ->  PostgreSQL
              (thin)     (business    (Spring Data
                          rules +      JPA)
                          ownership)
```

```
src/main/java/com/sampleproject/diary/
├── config/       SecurityConfig, OpenApiConfig, JwtConfig
├── controller/   AuthController, DiaryController          (thin, DTO in/out)
├── dto/          request/response records + ErrorResponse + PageResponse
├── entity/       User, DiaryEntry                         (JPA, auditing)
├── exception/    domain exceptions + GlobalExceptionHandler
├── repository/   UserRepository, DiaryEntryRepository     (owner-scoped queries)
├── security/     JwtService, JwtAuthenticationFilter, AuthenticatedUser,
│                 CurrentUserProvider, 401/403 JSON handlers
├── service/      AuthService, DiaryService, DiaryUserDetailsService
└── DiaryApplication.java
```

JPA entities are never returned from a controller; every response is a DTO record.

### Data model

```
User 1 ────< DiaryEntry
```

| `users`                  | `diary_entries`                          |
| ------------------------ | ---------------------------------------- |
| `id` UUID PK             | `id` UUID PK                             |
| `username` unique        | `user_id` FK -> users(id), not updatable |
| `email` unique           | `title`, `content`, `entry_date`         |
| `password_hash` (BCrypt) | `created_at`, `updated_at` (auditing)    |
| `created_at`             |                                          |

Indexes: `user_id`, `entry_date`, and the composite `(user_id, entry_date)` that backs the default
listing and date-range filter.

---

## 4. Prerequisites

- **Docker** route: Docker + Docker Compose (nothing else).
- **Local** route: JDK 21, a running PostgreSQL 14+ (the bundled `./mvnw` supplies Maven).

---

## 5. Environment variables

Copy the template and fill it in — `.env` is gitignored and must never be committed:

```bash
cp .env.example .env
```

| Variable         | Default          | Description                                                       |
| ---------------- | ---------------- | ----------------------------------------------------------------- |
| `DB_HOST`        | `localhost`      | Database host (Compose sets it to `postgres`)                     |
| `DB_PORT`        | `5432`           | Database port                                                     |
| `DB_NAME`        | `diarydb`        | Database name                                                     |
| `DB_USERNAME`    | `diary`          | Database user                                                     |
| `DB_PASSWORD`    | — (**required**) | Database password                                                 |
| `DB_PORT_HOST`   | `5432`           | Host port PostgreSQL is published on                              |
| `SERVER_PORT`    | `8080`           | HTTP port                                                         |
| `JPA_DDL_AUTO`   | `update`         | Hibernate schema handling (`update` for dev, `validate` for prod) |
| `JWT_SECRET`     | — (**required**) | HMAC key, **at least 32 characters**                              |
| `JWT_EXPIRATION` | `86400`          | Token lifetime in seconds (24 h)                                  |

Generate a secret:

```bash
openssl rand -base64 48
```

Compose fails fast with a clear message if `DB_PASSWORD` or `JWT_SECRET` is missing.

---

## 6. Running with Docker (recommended)

```bash
cp .env.example .env          # then edit DB_PASSWORD and JWT_SECRET
docker compose up --build
```

This builds the app with a multi-stage Dockerfile (Maven build stage -> `eclipse-temurin:21-jre-alpine`
runtime, running as a non-root `spring` user) and starts PostgreSQL with a persistent `postgres-data`
volume. The app waits for the database health check before starting.

- API: <http://localhost:8080>
- Swagger UI: <http://localhost:8080/swagger-ui.html>

Stop, keeping data: `docker compose down` — stop and wipe data: `docker compose down -v`.

---

## 7. Running locally

Start PostgreSQL only:

```bash
docker compose up -d postgres
```

Then run the app (values come from the environment; nothing is hardcoded):

```bash
export DB_HOST=localhost DB_PORT=5432 DB_NAME=diarydb DB_USERNAME=diary DB_PASSWORD=your-password
export JWT_SECRET=your-random-secret-of-at-least-32-characters
./mvnw spring-boot:run
```

PowerShell:

```powershell
$env:DB_PASSWORD="your-password"; $env:JWT_SECRET="your-random-secret-of-at-least-32-characters"
./mvnw spring-boot:run
```

## 8. PostgreSQL configuration

The datasource is assembled entirely from environment variables in `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:diarydb}
    username: ${DB_USERNAME:diary}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: ${JPA_DDL_AUTO:update}
    open-in-view: false
```

`ddl-auto: update` generates the schema automatically for development. For production, set
`JPA_DDL_AUTO=validate` and manage the schema with migrations (Flyway/Liquibase).

---

## 9. Authentication flow

1. `POST /api/auth/register` — the password is BCrypt-hashed before storage; the response contains
   the user id, username and email, never the password or its hash.
2. `POST /api/auth/login` — Spring Security verifies the credentials and a signed JWT is returned.
   A wrong username and a wrong password produce the identical `401` message, so accounts cannot be enumerated.
3. Send the token on every protected call: `Authorization: Bearer <JWT>`.
4. `JwtAuthenticationFilter` validates the signature and expiry on **every** request and loads the
   identity into the security context. An invalid, expired or missing token yields a JSON `401`.

The JWT carries the username (`sub`) and the user id (`uid`) claim. The signing secret lives only in
the environment.

---

## 10. API endpoints

| Method | Endpoint                             | Auth | Description                      | Success |
| ------ | ------------------------------------ | ---- | -------------------------------- | ------- |
| POST   | `/api/auth/register`                 | —    | Register a user                  | `201`   |
| POST   | `/api/auth/login`                    | —    | Obtain a JWT                     | `200`   |
| POST   | `/api/diaries`                       | JWT  | Create an entry (owner = caller) | `201`   |
| GET    | `/api/diaries?page=&size=&from=&to=` | JWT  | List own entries, newest first   | `200`   |
| GET    | `/api/diaries/search?keyword=`       | JWT  | Search own title + content       | `200`   |
| GET    | `/api/diaries/{id}`                  | JWT  | Get one own entry                | `200`   |
| PUT    | `/api/diaries/{id}`                  | JWT  | Update title/content/entryDate   | `200`   |
| DELETE | `/api/diaries/{id}`                  | JWT  | Delete an own entry              | `204`   |

Status codes: `400` validation/malformed, `401` missing or invalid JWT, `403` access denied,
`404` not found _or not owned_, `409` duplicate username/email, `500` unexpected (message only, never a stack trace).

---

## 11. Swagger / OpenAPI

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>

To test protected endpoints: call `/api/auth/login`, copy the `token`, press **Authorize**, paste the
token (no `Bearer ` prefix needed) and call any diary endpoint.

---

## 12. Example requests

Register:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"mihan","email":"mihan@example.com","password":"password123"}'
```

Login and capture the token:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mihan","password":"password123"}' | jq -r .token)
```

Response shape:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400
}
```

Create an entry:

```bash
curl -X POST http://localhost:8080/api/diaries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"A Productive Day","content":"Today I worked on my backend project and learned about JWT authentication.","entryDate":"2026-09-18"}'
```

```json
{
  "id": "6f1c1f0a-6f32-4f4a-9a2a-1f1a1d0b2c33",
  "title": "A Productive Day",
  "content": "Today I worked on my backend project and learned about JWT authentication.",
  "entryDate": "2026-09-18",
  "createdAt": "2026-09-18T15:30:00Z",
  "updatedAt": "2026-09-18T15:30:00Z"
}
```

List, filter, search, update, delete:

```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/diaries?page=0&size=10"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/diaries?from=2026-09-01&to=2026-09-18"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/diaries/search?keyword=project"

curl -X PUT http://localhost:8080/api/diaries/{id} \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Updated title","content":"Updated content","entryDate":"2026-09-18"}'

curl -X DELETE http://localhost:8080/api/diaries/{id} -H "Authorization: Bearer $TOKEN"   # 204
```

Paginated list response:

```json
{
  "content": [
    {
      "id": "...",
      "title": "...",
      "content": "...",
      "entryDate": "2026-09-18",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1,
  "last": true
}
```

Validation error response:

```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": { "title": "Title is required", "content": "Content is required" },
  "path": "/api/diaries",
  "timestamp": "2026-09-18T15:30:00Z"
}
```

---

## 13. Running tests

```bash
./mvnw test
```

Tests run against in-memory H2 (`src/test/resources/application-test.yml`) and need no Docker or
PostgreSQL. 20 tests cover:

- **Auth** — successful registration (and that the stored password is a BCrypt hash, never echoed back),
  duplicate username, duplicate email, invalid registration payload, successful login, invalid credentials.
- **Diary** — create, list (ownership + sort order + pagination), date filtering, search, get, update,
  delete, unauthenticated access, invalid payload, and **that another user's entry is invisible to
  read, update and delete while staying intact for its owner**.
- **Unit (Mockito)** — `DiaryService` assigns the authenticated owner, queries by `(id, userId)` rather
  than `id`, refuses foreign entries and rejects a reversed date range.
- **Docs** — the OpenAPI document is published with the JWT security scheme.

---

## 14. Security notes

- Passwords are stored only as BCrypt hashes and never appear in any response.
- The JWT secret and database credentials come from environment variables; `.env` is gitignored.
- Stateless sessions; `server.error.include-stacktrace: never`.
- Token contents and credentials are never logged.
- Every diary read/write/search/delete is owner-scoped at the repository query level.
