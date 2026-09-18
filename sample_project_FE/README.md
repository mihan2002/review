# My Diary — Frontend

A calm, minimal React frontend for the Diary REST API in [`../sample_project_BE`](../sample_project_BE).
Register, sign in with a JWT, then write, read, edit, delete, search, filter and page through your own
diary entries.

The backend is the only API — there is no mock server, and no backend file was modified.

---

## 1. Technology

React 19 · TypeScript (strict) · Vite · React Router · Axios · TanStack Query ·
React Hook Form + Zod · Tailwind CSS v4 · Lucide icons

---

## 2. Requirements

- Node.js 20.19+ (or 22+) and npm
- The Diary backend reachable on `http://localhost:8080` (see its own README for Docker Compose / Maven)

---

## 3. Setup

```bash
cd sample_project_FE
npm install
cp .env.example .env    # already present in this checkout
npm run dev
```

Open <http://localhost:5173>.

### Available scripts

| Script            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Dev server with hot reload on port 5173  |
| `npm run build`   | Type-check (`tsc -b`) and build for prod |
| `npm run preview` | Serve the production build locally       |
| `npm run lint`    | Lint with oxlint                         |

---

## 4. Environment configuration

`.env` (see `.env.example`):

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
```

**Why a relative base URL?** The backend does not enable CORS, so a browser calling
`http://localhost:8080/api` from `http://localhost:5173` would be blocked. The Vite dev server
therefore proxies `/api` to `VITE_API_PROXY_TARGET` (see `vite.config.ts`), which keeps the backend
untouched.

If you enable CORS on the backend, or serve the built frontend behind the same origin / a reverse
proxy, you can instead point straight at it:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

The base URL is read in exactly one place (`src/api/axios.ts`); no URL is hardcoded anywhere else.
`.env` holds no secrets.

---

## 5. Project structure

```
src/
├── api/          axios instance (auth header + 401 handling), authApi, diaryApi
├── components/
│   ├── auth/     AuthCard shell for login/register
│   ├── common/   Button, TextField, TextArea, PasswordField, Pagination,
│   │             ConfirmDialog, EmptyState, ErrorState, Skeleton, ToastViewport
│   ├── diary/    DiaryCard, DiaryForm, DiaryFilters, DiaryListSkeleton
│   └── layout/   AppLayout, Header
├── context/      AuthProvider + ToastProvider (and their context objects)
├── hooks/        useAuth, useToast, useDiaries (TanStack Query), useDebouncedValue
├── pages/        Login, Register, Dashboard, DiaryEntryPage, CreateDiary, EditDiary, NotFound
├── routes/       AppRoutes, ProtectedRoute, PublicOnlyRoute
├── types/        api.ts — the single source of truth for backend DTOs
└── utils/        date, text, errors, jwt, cn
```

---

## 6. API integration

Endpoints consumed (verified against the backend's OpenAPI document at
`http://localhost:8080/v3/api-docs`):

| Method   | Endpoint                                  | Used by                    |
| -------- | ----------------------------------------- | -------------------------- |
| `POST`   | `/api/auth/register`                      | Register                   |
| `POST`   | `/api/auth/login`                         | Login                      |
| `GET`    | `/api/diaries?from&to&page&size`          | Dashboard list + filters   |
| `GET`    | `/api/diaries/search?keyword&page&size`   | Dashboard search           |
| `GET`    | `/api/diaries/{id}`                       | View / edit entry          |
| `POST`   | `/api/diaries`                            | Create entry               |
| `PUT`    | `/api/diaries/{id}`                       | Edit entry                 |
| `DELETE` | `/api/diaries/{id}`                       | Delete entry               |

Notes on matching the real contract:

- **Login uses `username`**, not email — the backend's `LoginRequest` takes `username` + `password`.
- **Registration returns a user, not a token.** After a successful registration the app signs in
  automatically with the same credentials; if that call fails it sends you to `/login` instead.
- **There is no `/me` endpoint**, so the signed-in username is read from the JWT's `sub` claim
  (`src/utils/jwt.ts`) purely for display. Authorisation is always re-verified by the backend.
- Search and date filtering are done **by the backend**, never in the browser.
- Pagination is zero-based, matching `PageResponse`.

---

## 7. Authentication

- The JWT is stored in `localStorage` under `diary.token` and attached as
  `Authorization: Bearer <token>` by an Axios request interceptor.
- A token that is already expired is discarded on startup rather than used.
- A `401` on any non-auth request clears the session and returns you to `/login`; a `401` from the
  login endpoint is shown as an invalid-credentials message instead.
- `/dashboard`, `/diary/new`, `/diary/:id` and `/diary/:id/edit` require a session.
  `/login` and `/register` redirect to `/dashboard` when you already have one.

---

## 8. Features

- **Dashboard** — greeting, entries grouped by date, preview truncation, 10 per page with
  `Showing 1–10 of 34 entries`, skeleton loaders while fetching.
- **Search** — debounced (350 ms), backed by `/api/diaries/search`, with a clear button and a
  dedicated "no results" state.
- **Date filter** — `from`/`to` with Apply, validation that the range runs forwards, and Clear filters.
- **Writing** — one `DiaryForm` shared by create and edit, validated with Zod against the backend's
  own rules (title ≤ 200, content ≤ 20 000, date required).
- **Delete** — always behind a confirmation dialog, with a success toast.
- **Errors** — 400/401/403/404/409/500 and network failures are mapped to short, human messages in
  `src/utils/errors.ts`; field-level validation errors from the backend are surfaced verbatim. Raw
  responses and stack traces are never shown.
- **Accessibility** — semantic landmarks, labelled fields, `aria-invalid` + `role="alert"` on errors,
  a native `<dialog>` for modals (focus trap and Esc for free), visible focus rings, and
  `prefers-reduced-motion` support.
- **Responsive** — single-column forms, stacked actions and compact pagination on small screens.

---

## 9. Verification performed

- `npm run build` — TypeScript strict build and production bundle, clean.
- Full API flow exercised against the running backend through the dev proxy: register → login →
  create → list → paginate → date filter → search → read → update → delete → 401 without a token,
  plus the 400/401/409 error paths.
- Every route rendered headlessly against the live backend with no console errors: login,
  registration, dashboard with real entries, entry view, create, edit, 404 page, protected-route
  redirect when signed out, `/login` redirect when signed in, and the "entry not found" state.
