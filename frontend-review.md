# Frontend Code Review — `sample_project_FE`

**Scope:** all of `sample_project_FE/src`, plus `index.html`, `vite.config.ts`, `package.json`, `.env*`.
**Stack:** React 19 + TypeScript (strict, `noUncheckedIndexedAccess`) · Vite · React Router 7 · Axios · TanStack Query 5 · React Hook Form + Zod · Tailwind 4.

**Overall:** this is a well-built codebase. Types mirror the backend DTOs, there is no `dangerouslySetInnerHTML`/`innerHTML`/`eval` anywhere, secrets are not committed (`.env` is gitignored and holds no secret), `dist/` is not tracked, errors are consistently funnelled through `utils/errors.ts`, and most components already carry sensible ARIA. The findings below are mostly correctness edge cases, a few genuine a11y defects, and one silently-wrong-results bug.

**No critical findings.** 2 high, 6 medium, 7 low.

---

## HIGH

### `src/hooks/useDiaries.ts:33` (with `src/components/diary/DiaryFilters.tsx`, `src/pages/Dashboard.tsx:56`)
**The applied date range is silently discarded whenever a search keyword is present — the UI still shows the filter as active.**

`useDiaryList` branches on `isSearching` and calls `diaryApi.searchDiaries({ keyword, page, size })`, dropping `from`/`to` entirely. The backend confirms there is nowhere to put them: `DiaryController.search` accepts only `keyword`, `page`, `size` (`sample_project_BE/.../DiaryController.java`), while `findAll` accepts `from`/`to`.

Concrete scenario: the user opens the date filter, sets 2026-01-01 → 2026-01-31, clicks Apply (list correctly narrows), then types "holiday" in the search box. The result set now spans **all** dates, but `DiaryFilters` still renders the "Date filter" button in the `primary` (active) variant and the panel still shows the two dates, so the user reads the unfiltered results as date-filtered. `Dashboard.isFiltering` also still reports `true`. Either disable/visually neutralise the date inputs while searching with an explanatory note, or filter the search results client-side, or extend the backend endpoint.

### `src/api/axios.ts:3-23`
**The JWT is persisted in `localStorage`, and `index.html` ships no Content-Security-Policy.**

`diary.token` survives tab close and browser restart and is readable by any script executing on the origin. The app itself has no XSS sink today, but it loads a third-party stylesheet from `fonts.googleapis.com` with no `integrity` and no CSP (`index.html:9-13`), so one injected or compromised script yields a long-lived token, not just a session. Preferred fix is an httpOnly, `SameSite=Strict` cookie issued by the backend; if the token must stay client-side, prefer `sessionStorage`, add a CSP `<meta http-equiv>` (or server header) restricting `script-src` to `'self'`, and see the expiry finding below.

---

## MEDIUM

### `src/components/common/ConfirmDialog.tsx:44,56`
**Hard-coded `id="confirm-dialog-title"` produces duplicate IDs, mislabelling the logout dialog.**

`AppLayout` always mounts a logout `ConfirmDialog`, and `Dashboard` / `DiaryEntryPage` mount a delete `ConfirmDialog` at the same time inside `<Outlet />`. Both `<h2>` elements carry the same `id`, and `aria-labelledby` resolves to the **first** match in document order — the Dashboard delete dialog, since `<main>` precedes the layout-level dialog. Scenario: a screen-reader user on `/dashboard` clicks "Logout"; the dialog is announced as *"Delete diary entry?"*. Use `useId()` for the title id (and also add `aria-describedby` for the description and `role="alertdialog"`, which is the correct role for a destructive confirmation).

### `src/components/common/ToastViewport.tsx:11`
**The `aria-live` region is created at the same moment as its content, so the first toast is often not announced.**

`if (toasts.length === 0) return null` means the live region does not exist in the DOM until a toast appears. Most screen readers only observe mutations inside a live region that was already present; a region inserted together with its content is commonly missed. Scenario: a blind user deletes an entry; "Entry deleted." is rendered and auto-dismissed after 4s without ever being announced. Render the wrapper `<div aria-live="polite">` unconditionally and only map the (possibly empty) list inside it.

### `src/pages/Dashboard.tsx:63-77` (with `src/components/common/Pagination.tsx`)
**Deleting the last entry on the last page strands the user on an out-of-range page.**

`page` is React state that only `changeSearch`/`changeRange`/`clearAll`/`Pagination` ever reset. Scenario: 11 entries, user goes to page 2 (index 1, one entry), deletes it. The invalidated query refetches page index 1, the backend returns `content: []` with `totalElements: 10`, so `isEmpty` is true and `isFiltering` false → the user is shown **"Your diary is empty"** while ten entries exist, with no pagination control rendered to get back (the `Pagination` block is inside `data.content.length > 0`). In `useDeleteDiary`'s `onSuccess` (or in the Dashboard callback), clamp: if the current page's content is about to become empty and `page > 0`, `setPage(page - 1)`.

### `src/context/AuthProvider.tsx:20-43` and `src/utils/jwt.ts:48-50`
**Token expiry is only ever evaluated at mount; an expiring session is never proactively cleared.**

`user` is `useMemo(() => userFromToken(token), [token])`, and `token` does not change on its own, so `isTokenExpired` is re-evaluated only on login/logout/reload. Scenario: a user leaves the tab open past the token TTL, comes back and clicks "New Entry" — `ProtectedRoute` still says authenticated, the form renders, they write a long entry, and only on submit does the 401 arrive, clearing the session and losing the draft. Schedule a `setTimeout` for `payload.exp * 1000 - Date.now()` that calls `logout()`, and re-check on `visibilitychange`.

Related, in `isTokenExpired`: `if (typeof payload.exp !== 'number') return false` treats a token with no `exp` as valid forever. The safe default for a missing expiry claim is expired (`return true`).

### `src/api/axios.ts:40-45`
**The "don't sign out on a login failure" exemption is a substring test on an attacker-influenceable URL.**

`if (!url.includes('/auth/'))` is checked against `error.config.url`, which for entry requests is `` `/diaries/${id}` `` with `id` taken verbatim from the route param and never validated. Scenario: a user follows a link to `/diary/%2Fauth%2Fx`; the request URL becomes `/diaries//auth/x`, so when the backend rejects the expired token with 401 the guard matches, `setStoredToken(null)` is skipped and no `UNAUTHORIZED_EVENT` fires — the dead token stays in `localStorage` and the UI keeps claiming the user is signed in. Compare against the exact endpoints instead: `['/auth/login', '/auth/register'].some((p) => url.endsWith(p))`.

### `sample_project_FE/package.json` + build output
**No route-level code splitting: a single ~500 KB (uncompressed) JS chunk.**

`dist/assets/index-HO3QbTo_.js` is 500,459 bytes and there are no other chunks — every page, `lucide-react`, `zod`, `react-hook-form` and TanStack Query are parsed before the login screen paints. On a mobile connection this is a multi-second blank `#root`. Wrap the page components in `React.lazy` + `Suspense` in `AppRoutes.tsx` (the auth pages and the diary pages are naturally separate), which alone moves the editor, Zod schemas and form library off the login critical path.

---

## LOW

### `src/context/ToastProvider.tsx:19,24`
Two small issues. (1) The auto-dismiss `window.setTimeout` is never stored or cleared, so it still fires after a manual dismiss (harmless no-op) and after provider unmount (React state update on an unmounted tree). (2) `value` includes `toasts`, so every toast add/remove re-renders **every** `useToast()` consumer — `Dashboard`, `AppLayout`, `CreateDiary`, `EditDiary`, `DiaryEntryPage`, `Login`, `Register`. Split the context into a stable actions context and a separate state context consumed only by `ToastViewport`.

### `src/pages/EditDiary.tsx:11` (and `src/hooks/useDiaries.ts:41-48`)
`const { id = '' } = useParams()` combined with `enabled: Boolean(id)` is a latent trap: with an empty `id` the query never runs, so `isPending` stays `true` forever and the page renders an infinite skeleton with no error state. Not reachable through the current `/diary/:id/edit` route, but a route change would silently produce a permanently loading page. Prefer rendering an explicit "entry not found" branch when `id` is falsy.

### `src/pages/DiaryEntryPage.tsx:38` / `src/pages/EditDiary.tsx:18`
Only status 404 is mapped to the "Entry not found" copy. The backend declares `@PathVariable UUID id`, so a non-UUID path segment (`/diary/abc`, a truncated shared link) returns **400**, which `getErrorMessage` renders as *"Some of the details are invalid. Please check the form and try again."* — on a page with no form. Treat 400 and 404 alike here, or validate the UUID shape before querying.

### `src/App.tsx` (no error boundary anywhere in the tree)
There is no `ErrorBoundary` between `QueryClientProvider` and the routes. Any render-time throw — including the intentional `throw new Error('useAuth must be used inside an AuthProvider')` in `hooks/useAuth.ts:6` — unmounts the whole tree and leaves a blank white page with no recovery path. Add a top-level boundary with a "reload" affordance.

### `src/components/diary/DiaryFilters.tsx:78`
`isLoading={isFetching && hasRange}` disables the **Apply** button during *any* background refetch, not just a range-driven one. Scenario: a user with a date range applied types in the search box; each debounced refetch sets `isFetching`, so Apply flickers between disabled and enabled and clicks are dropped. Gate on a range-specific pending flag, or just drop the loading state on this button.

### `src/pages/Dashboard.tsx:43-49`
`changeSearch` resets `page` to 0 immediately while the query still uses the pre-debounce `debouncedSearch`, so the first keystroke typed while on page 2+ fires an extra request for *page 0 with the old keyword* that is thrown away ~350 ms later. Debounce the page reset alongside the keyword, or derive the effective page from the debounced criteria.

### `src/components/diary/DiaryFilters.tsx:121-138`
`<input type="search">` renders the browser's own clear affordance (the WebKit/Chromium "✕") on top of the custom absolutely-positioned clear button, giving two overlapping controls. Use `type="text"` with `role="searchbox"`, or suppress the native one via `[type='search']::-webkit-search-cancel-button { display: none }`. Also consider `aria-controls` on the "Date filter" toggle, which currently sets `aria-expanded` with nothing to point at.

### `index.html:9-13`
The Google Fonts stylesheet is render-blocking, third-party, and has no `integrity` attribute or local fallback. A slow or blocked `fonts.googleapis.com` delays first paint for every visitor (and the app is otherwise fully self-hosted). Self-host Inter/Lora via `@fontsource`, or at minimum load the stylesheet non-blockingly (`media="print" onload="this.media='all'"`).

---

## Things checked and found clean

- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or `document.write`. Entry titles/content are rendered as React children, so stored XSS from diary content is not possible.
- `vite.config.ts` uses `loadEnv(mode, cwd, '')` (all variables, no prefix) but only reads `VITE_API_PROXY_TARGET` for the dev proxy — no non-`VITE_` variable leaks into the client bundle.
- `.env` is gitignored and contains no secret; `.env.example` is accurate; `dist/` is not tracked.
- TypeScript is `strict` with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` — no `any` or non-null assertions in application code (`useDiaries.ts:44`'s `id as string` is guarded by `enabled`).
- `utils/jwt.ts` decodes base64url defensively (URL-safe alphabet, padding, `TextDecoder` for non-ASCII usernames) and returns `null` on every failure path; the comment correctly notes the token drives display only.
- `utils/date.ts` parses backend `LocalDate` strings component-wise, avoiding the classic `new Date('2026-09-18')` UTC off-by-one.
- `TextField`/`TextArea` wire `useId`, `htmlFor`, `aria-invalid`, `aria-describedby` and `role="alert"` correctly; icons are consistently `aria-hidden`; icon-only controls have `aria-label`s; `prefers-reduced-motion` is honoured in `index.css:71`.
- Query cache is cleared on both login and logout (`AuthProvider.tsx:36,50`), so one user's entries cannot leak into another's session on a shared device.
- The retry predicate in `App.tsx:14-18` correctly refuses to retry 4xx while still retrying transient 5xx/network failures.
