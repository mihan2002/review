# Frontend Code Review — `sample_project_FE`

**Stack:** React 19 · TypeScript (strict, `noUncheckedIndexedAccess`) · Vite · TanStack Query · axios · react-router-dom · react-hook-form + zod · Tailwind v4 · oxlint
**Scope:** all of `sample_project_FE` — every file under `src/` (api, components, context, hooks, pages, routes, types, utils), plus `index.html`, `vite.config.ts`, `package.json`, `.env`, `.env.example`, `.gitignore`, `.oxlintrc.json`, `tsconfig*.json`, `public/`. Excluded: `node_modules/`, `dist/`, `.claude-flow/`, `.impeccable/`.
**Method:** three parallel read-only review passes (security, correctness/performance, accessibility/quality), with the highest-severity findings re-verified against source before inclusion.

---

## Summary

**No Critical findings.** There is no exploitable vulnerability, no data-loss bug, and no authorization flaw in this codebase.

The code is in good shape overall. TypeScript is strict with zero `any`, zero `@ts-ignore`, and zero unsound casts. There are no `console.*` calls, no `TODO`/`FIXME` comments, no `dangerouslySetInnerHTML`, no `innerHTML`, and no `target="_blank"` anywhere in `src/`. All user content renders through normal JSX escaping. `npm audit` against the committed lockfile reports 0 known vulnerabilities. Context providers memoize their values correctly, list keys are stable, and the `ConfirmDialog`/`ShortcutsSheet` use native `<dialog>` + `showModal()`, which gets focus trapping, Escape, focus restore, and background inertness right for free.

The real weaknesses cluster in three places: **accessibility gaps on core controls**, a **pagination state bug that misreports an empty cabinet**, and the **complete absence of automated tests**.

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 6 |
| Medium | 16 |
| Low | 15 |

---

## Critical

None found.

---

## High

### `src/components/common/Pagination.tsx:54-62`, `:80-88` — Back/Next buttons have no accessible name below 640px

The icon is `aria-hidden="true"` and the only text label is wrapped in `hidden sm:inline`. Tailwind's `hidden` is `display: none`, which removes the text from the accessibility tree entirely — not merely visually. Below the `sm` breakpoint these buttons have **zero** accessible name. (Verified in source; the numbered page buttons at `:65-77` are fine — they carry `aria-label={`Tray ${index + 1}`}` and `aria-current="page"`.)

**Failure scenario:** A screen-reader user on a phone with more than 10 entries reaches the pagination controls and hears only "button" for both Back and Next, with no way to tell them apart. WCAG 4.1.2 (Name, Role, Value) failure on a primary navigation control.

```tsx
<button
  type="button"
  onClick={() => onPageChange(page - 1)}
  disabled={page === 0}
  aria-label="Previous tray"
  className="btn btn-case min-h-9 px-2.5"
>
  <ChevronLeft className="size-4" strokeWidth={2} aria-hidden="true" />
  <span className="hidden sm:inline">Back</span>
</button>
```

---

### `src/pages/Dashboard.tsx:56` — `page` is never clamped, so deleting the last item on a page shows a false "cabinet is empty"

`page` is local state that is never reset or clamped when the result set shrinks. `useDeleteDiary`'s `onSuccess` (`src/hooks/useDiaries.ts:79-82`) only invalidates queries; it never checks whether the page still exists. `isEmpty` is computed as `data.content.length === 0` (`:106`), and the pagination control is gated behind `data.content.length > 0` (`:264`) — so when the page empties, the escape hatch disappears with it.

**Failure scenario:** 11 entries, page size 10. The user is on page 1 (one item) and deletes it. The refetch returns `content: []` with `totalPages: 1`. `isEmpty` is true and `isFiltering` is false, so the app renders "Nothing is filed yet — The drawer is waiting. Type a card about today and it will be the first one in." (`:250-262`) while 10 entries still sit on page 0. Pagination is not rendered, so there is no in-UI route back. The filtered variant produces a misleading "Nothing answers that enquiry" the same way.

```tsx
useEffect(() => {
  if (data && data.totalPages > 0 && page >= data.totalPages) {
    setPage(data.totalPages - 1)
  }
}, [data, page])
```

---

### `src/index.css:45`, `:83`, `:135-139` — `:focus-visible` ring is near-invisible on the app's own card and deep surfaces

Computed WCAG contrast ratios (SC 1.4.11 Non-text Contrast requires ≥ 3:1):

| Theme | Focus token | Against | Ratio |
|---|---|---|---|
| Night (default) | `--color-focus: #d8ab50` | `--color-card` `#dfd3b6` | **1.43:1** |
| Night (default) | `--color-focus: #d8ab50` | `--color-card-sunk` `#cdbf9c` | **1.17:1** |
| Day | `--color-focus: #3a2c10` | `--color-deep` `#6b563c` | **1.95:1** |

`Button.tsx` sets no custom focus style, so every button in the app — dialog Cancel/Confirm, form Submit/Cancel, Header icon buttons, `YearSheet` nav — depends on this one global outline. `TextField`/`TextArea` are unaffected; they override `outline: none` and use a border-thickening indicator instead.

**Failure scenario:** A keyboard-only user tabbing through `ConfirmDialog`'s "Keep it filed" / "Withdraw card" buttons in the default night theme cannot see which is focused before pressing Enter on a destructive delete.

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-ink) 25%, transparent);
  border-radius: 1px;
}
```

---

### `src/context/ToastProvider.tsx:5`, `:15-22` — error toasts auto-dismiss after 4s and are the only error surface for several mutations

`showToast` unconditionally schedules dismissal for every toast regardless of variant. There is no pause-on-hover, no pause-on-focus, and no way to extend the duration. For `CreateDiary.tsx:45`, `EditDiary.tsx:78`, and `Dashboard.tsx:99`, the toast is the *only* place the failure is communicated — no persistent inline error is shown.

**Failure scenario:** A submission fails with a 409 or 500. The toast "The card could not be filed." vanishes after 4 seconds — potentially before a screen reader has finished announcing it, since removing the node can cut off the `aria-live="polite"` announcement mid-utterance. The user is left with no explanation and no way to re-read it. WCAG 2.2.1 (Timing Adjustable) failure.

```tsx
const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
  const id = nextId.current++
  setToasts((current) => [...current, { id, message, variant }])
  if (variant !== 'error') {
    window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS)
  }
  // error toasts persist until dismissed via the existing X button
}, [dismissToast])
```

---

### `src/hooks/useShortcuts.ts:14-18` — global single-key shortcuts still fire while a modal dialog is open

`isTyping()` suppresses shortcuts only for `INPUT`/`TEXTAREA`/`SELECT`/`contentEditable`. It has no `dialog[open]` check. Because the listener is bound to `window` and key events bubble there regardless of the dialog's modal state, pressing `n`, `/`, `t`, or `?` while focus sits on a button *inside* an open dialog still triggers the global handler. (Verified in source — the guard is exactly the four-way tag check and nothing more.)

**Failure scenario:** The user opens the logout confirmation, and with Cancel focused presses `n` (habitually meaning "no"). The app navigates to `/diary/new`, silently abandoning the dialog and the logout flow. Separately, unmodified single-character shortcuts active globally with no way to disable or remap them is a WCAG 2.1.4 (Character Key Shortcuts) violation affecting speech-input and switch-access users.

```ts
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('dialog[open]')) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
```

---

### `package.json:6-11`, `:12-35` — zero automated tests, and no test tooling installed at all

No `test` script, and no `vitest`, `@testing-library/react`, `jsdom`, or `playwright` in dependencies. A repo-wide search for `*.test.*` / `*.spec.*` returns nothing.

**Failure scenario:** The app has non-trivial pure logic with no regression net — `groupByDate`, `pageWindow`'s window-centering math, `callNumber`, and `parseLocalDate` (which silently returns the raw string on parse failure at several call sites). Any refactor of these can break production silently.

Start with the pure functions in `src/utils/` (`date.ts`, `catalog.ts`, `text.ts`, `errors.ts`) — they are trivially unit-testable and currently 100% unverified.

---

## Medium

### `src/pages/EditDiary.tsx:63-66` + `src/hooks/useDraft.ts:31` — a previous entry's draft and defaults can leak into the next edit

React Router re-renders rather than remounts when only a route param changes, and neither `useDraft`'s `restored` (a `useState` initializer) nor RHF's `defaultValues` reacts to a changed `draftKey`. The codebase already knows this gotcha and works around it elsewhere — `DiaryFilters.tsx:203` mounts `<DrawerRangeForm key={...}>` for exactly this reason — but `EditDiary` has no `key`.

**Precondition (verified, and it narrows this finding):** `useDiary` (`src/hooks/useDiaries.ts:41-48`) does **not** set `placeholderData: keepPreviousData`, unlike `useDiaryList`. On a cold cache, `data` goes `undefined` during the id change, the `{entry && <DiaryForm/>}` gate at `:63` unmounts the form, and it remounts clean. The bug only fires when the next entry is **already in the query cache** (within the default 5-minute `gcTime`) — e.g. browser back/forward between two recently-visited edit URLs. That is why this is Medium rather than High.

**Failure scenario:** Under that warm-cache path, the form keeps showing entry A's values and offers to restore entry A's held draft. Clicking "Restore it" runs `reset(heldDraft.values, { keepDefaultValues: true })` (`DiaryForm.tsx:110`), overwriting the intended edit of entry B with entry A's content.

```tsx
<DiaryForm
  key={entry.id}
  draftKey={entry.id}
  defaultValues={{ title: entry.title, content: entry.content, entryDate: entry.entryDate }}
  ...
/>
```

---

### `src/api/axios.ts:3`, `:8-23`, `:30-34` — JWT persisted in `localStorage`, reachable by any script on the origin

The token lives in `localStorage` under `diary.token` with no `HttpOnly` cookie or in-memory option. This is **not currently exploitable** — there is no XSS sink in this app's own code. It is a standing architectural risk: any future unsafe renderer (a markdown/rich-text view), a compromised dependency, or a page-access browser extension can read the token and take over the session outright, with no CSP to slow it down.

Prefer an `HttpOnly`, `SameSite`, `Secure` cookie issued by the backend, or keep the token in memory only. If `localStorage` stays, make it a documented trade-off paired with a CSP and short token lifetimes.

---

### `src/context/AuthProvider.tsx:33-37` + `src/hooks/useDraft.ts:3` — diary drafts are never cleared on logout

`DiaryForm` autosaves in-progress title and content to `localStorage` under `diary.draft.new` or `diary.draft.<entryId>` (`DiaryForm.tsx:72-80`). This is plaintext personal diary content — the data the app exists to protect. `logout()` clears the token and calls `queryClient.clear()`, but never touches `diary.draft.*`.

**Failure scenario:** A user types part of an entry, does not submit or click "Discard", and logs out on a shared machine. The next person — without ever logging in — can open DevTools and read `localStorage['diary.draft.new']`, seeing private text that was never even sent to the server.

```ts
const logout = useCallback(() => {
  setStoredToken(null)
  setToken(null)
  queryClient.clear()
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('diary.draft.'))
      .forEach((k) => localStorage.removeItem(k))
  } catch { /* storage unavailable */ }
}, [queryClient])
```

---

### `src/hooks/useDraft.ts:3-4`, `:41-46` — unbounded draft accumulation with no TTL or eviction

`EditDiary` keys drafts per entry id, so every entry ever opened and typed into gets a permanent `diary.draft.<id>` key. The only cleanup paths are submit (`DiaryForm.tsx:84`) and the explicit "Discard" button — so any *abandoned* edit leaves its key behind forever.

**Failure scenario:** Enough abandoned edits accumulate to approach the storage quota. Once `setItem` starts throwing, the `catch { /* silently ignored */ }` at `:44-46` disables draft-saving for *all* entries with no user-facing signal. Cap retained drafts or prune by age on mount.

---

### `src/routes/AppRoutes.tsx:3-9` — no route-level code splitting

All seven pages are statically imported, so Vite ships the entire app — including the full react-hook-form + zod editing stack — in the initial chunk, even though an unauthenticated visitor only needs Login/Register.

```tsx
const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })))
// <Route path="/dashboard" element={<Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense>} />
```

---

### `src/hooks/useYearIndex.ts:41-52` — sequential page walk, and fully re-walked on every unrelated mutation

Two issues. The loop `await`s each page inside a `for`, rather than fetching page 0 to learn `totalPages` and parallelizing the rest. And the query key `['diaries', 'year-index', year]` is prefix-matched by `diaryKeys.all = ['diaries']`, so every create/update/delete invalidates it (`useDiaries.ts:57`, `:69`, `:81`).

**Failure scenario:** A year with 300+ entries costs up to 6 sequential round-trips to open the year sheet. Creating one entry while the sheet is open re-issues all of them to reflect a single new dot.

```ts
const first = await diaryApi.getDiaries({ from, to, page: 0, size: PAGE_SIZE })
const pagesNeeded = Math.min(MAX_PAGES, first.totalPages)
const rest = await Promise.all(
  Array.from({ length: pagesNeeded - 1 }, (_, i) =>
    diaryApi.getDiaries({ from, to, page: i + 1, size: PAGE_SIZE })),
)
```

---

### `src/pages/CreateDiary.tsx:38`, `src/pages/EditDiary.tsx:70`, `src/components/layout/AppLayout.tsx:29-30` — no unsaved-changes guard

`DiaryForm` computes `isDirty` (`:67`) but only uses it to gate autosaving. Nothing consults it before Cancel, the `g d` / `n` shortcuts, or the header logo link.

**Failure scenario:** The user types, then clicks Cancel within the 700ms autosave debounce (`SAVE_DELAY_MS`). Nothing has reached `localStorage` yet, so the content is gone with no confirmation.

```tsx
<Button
  variant="quiet"
  onClick={() => { if (!isDirty || window.confirm('Discard unsaved changes?')) onCancel() }}
  disabled={isSubmitting}
>
  Cancel
</Button>
```

A `useBlocker` from react-router-dom would also cover in-app navigation.

---

### `src/components/layout/AppLayout.tsx` — no "skip to main content" link

`Header` renders a sticky bar with logo, theme toggle, help, and logout before `<main>`. A keyboard user tabs through all of them on every page before reaching content. A repo-wide search confirms no skip link exists.

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 ...">
  Skip to the drawer
</a>
...
<main id="main-content" ...>
```

---

### `src/components/auth/AuthCard.tsx:12-38`, `src/pages/NotFound.tsx:10-27` — no `<main>` landmark on auth and 404 pages

These render outside `AppLayout` (`AppRoutes.tsx:18-21`, `:32`), so they never receive the `<main>` landmark that `AppLayout.tsx:48` provides. A screen-reader user navigating by landmark on login, register, or 404 finds none and must read linearly. Wrap the content `<div>` in `<main>`.

---

### `src/components/common/ConfirmDialog.tsx:43-60` — description not tied to the dialog via `aria-describedby`

Only `aria-labelledby="confirm-dialog-title"` is set. The consequence text ("There is no second copy.") has no `id` and is not referenced, contrary to the WAI-ARIA dialog pattern. Some screen reader/browser pairs announce only the accessible name on open, so the user must navigate manually to discover the consequence before confirming a destructive delete.

```tsx
<div id="confirm-dialog-description" className="record-prose mt-2.5 ...">{description}</div>
<dialog ref={dialogRef} aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" ...>
```

---

### `src/components/common/TextField.tsx`, `src/components/common/TextArea.tsx` — required fields are not indicated

Forms use `noValidate` (e.g. `Login.tsx:68`) with pure zod validation, so there is no `required` attribute, no `aria-required`, and no visual marker — despite every field in the app being mandatory. A screen-reader user gets no signal until after a failed submit.

```tsx
<label htmlFor={inputId} className="record block text-ink-soft">
  {label}{props.required && <span aria-hidden="true"> *</span>}
</label>
<input ... aria-required={props.required || undefined} />
```

---

### `src/pages/Dashboard.tsx:297-300` — page-change smooth scroll ignores `prefers-reduced-motion`

`index.css:627-647` carefully guards CSS animation behind a reduced-motion query, but this JS `window.scrollTo({ behavior: 'smooth' })` sits outside that mechanism and always animates. A user with a vestibular disorder who set the OS preference still gets an animated scroll on every page change.

```tsx
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
```

---

### `.oxlintrc.json:3` — `jsx-a11y` plugin not enabled

`"plugins": ["react", "typescript", "oxc"]`. The installed `oxlint@1.83.0` supports `"jsx-a11y"` (confirmed in its `configuration_schema.json`), but it is not enabled, so no accessibility rule runs in CI. This would have caught the Pagination naming failure above automatically.

```json
"plugins": ["react", "typescript", "oxc", "jsx-a11y"]
```

---

### `src/pages/Dashboard.tsx:307-320` and `src/pages/DiaryEntryPage.tsx:154-169` — delete-confirmation dialog duplicated verbatim

Both render an identical `ConfirmDialog` with the same title, the same description JSX, and the same `isLoading`/`loadingText` wiring, differing only in the entry reference and callbacks. Extract a `<DeleteEntryDialog entry isLoading onConfirm onCancel />` into `src/components/diary/`.

---

### `src/pages/DiaryEntryPage.tsx:40`, `:71-82` and `src/pages/EditDiary.tsx:19`, `:50-61` — not-found / load-error logic duplicated

Both compute `const notFound = getErrorStatus(error) === 404` and render an almost character-for-character identical `ErrorState` with the same title and message ternaries. Extract a shared `<DiaryLoadError>` component or a `useDiaryLoadError(error)` hook returning `{ title, message }`.

---

## Low

### `index.html:1-59`, `vite.config.ts:1-21` — no Content-Security-Policy

No CSP at dev server or in the built output. Combined with the token in `localStorage`, this removes the defense-in-depth layer that would contain an injected script's ability to `fetch` to an attacker origin. Add at the hosting/reverse-proxy layer (Vite's static build cannot emit response headers):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

Note the inline theme script at `index.html:10-27` would need a nonce or extraction under `script-src 'self'`.

---

### `.gitignore:26-28` — `.env` is not ignored, only `.env.local` / `.env.*.local`

Independently verified: `.env` is **not** currently tracked, has never been committed, and contains no secrets — only `VITE_API_BASE_URL=/api` and `VITE_API_PROXY_TARGET=http://localhost:8080`. So there is no leak today. But the project's convention is to keep config in `.env`, and nothing stops the first real secret added there from being swept up by a `git add -A`.

```
.env
.env.local
.env.*.local
!.env.example
```

---

### `src/utils/jwt.ts:48-51`, `src/context/AuthProvider.tsx:9-16`, `:31` — expiry is never re-checked after mount

Two compounding issues: `isTokenExpired` returns `false` when `exp` is absent (treating the token as never-expiring), and `user`/`isAuthenticated` is a `useMemo` keyed only on the token string, so it never re-evaluates as wall-clock time passes. The only thing that currently corrects state is a live 401 (`src/api/axios.ts:36-49`).

**Failure scenario:** A tab left open past expiry on a page making no further API calls keeps reporting `isAuthenticated === true` and rendering protected UI until the next network call happens to fail.

```ts
useEffect(() => {
  const id = window.setInterval(() => {
    const payload = token ? decodeToken(token) : null
    if (payload && isTokenExpired(payload)) logout()
  }, 30_000)
  return () => window.clearInterval(id)
}, [token, logout])
```

---

### `src/utils/errors.ts:23-44` — backend `message` is forwarded to the UI for any status, including 5xx

The generic `STATUS_MESSAGES[500]` fallback is only reached when `data.message` is falsy, so any body matching `{status, message}` is displayed verbatim regardless of status. **Not currently exploitable** — the backend's catch-all handler returns a hardcoded "An unexpected error occurred" — but it is a fragile contract: a misconfigured gateway, WAF error page, or future backend change fitting that shape would put internal detail straight on screen.

```ts
if (data.message && status !== undefined && status < 500) return data.message
```

---

### `src/pages/Register.tsx:22` — email has no `max` length, unlike the backend's `@Size(max = 255)`

Every other field (`username` 3–50, `password` 8–72, `title` ≤200, `content` ≤20000) mirrors the backend constraints exactly; email is the one gap. Not a bypass — the server still enforces it, and the field error round-trips correctly — just a wasted round trip.

```ts
email: z.string().trim().min(1, '…').max(255, 'That address is too long.').email('…'),
```

---

### `src/context/ToastProvider.tsx:15-22` — `setTimeout` ids are never tracked or cleared

No cleanup on unmount. Low risk since the provider wraps the whole app and normally never unmounts, but under HMR or a future refactor that moves it lower in the tree, stale timers will fire against an unmounted instance. Track ids in a `useRef(new Set())` and clear them in an unmount effect.

---

### `src/utils/jwt.ts:26-46` — `uid` is not validated before the cast

The runtime guard checks only `typeof payload.sub === 'string'` before `payload as TokenPayload`. `userFromToken` then assigns `id: payload.uid` (`AuthProvider.tsx:15`), so a token without `uid` yields `CurrentUser.id === undefined` at runtime despite being typed `string`. Add `typeof (payload as TokenPayload).uid === 'string'` to the guard.

---

### `src/api/axios.ts:26` — `??` does not guard against an empty-string base URL

`import.meta.env.VITE_API_BASE_URL ?? '/api'` only substitutes on `null`/`undefined`. If the variable is set to `''` in some environment, `baseURL` becomes `''` and requests silently hit the page origin with no `/api` prefix. Use `||`.

---

### `src/components/diary/DiaryForm.tsx:14-31` vs `src/types/api.ts:21-25` — `DiaryFormValues` is not tied to `DiaryEntryRequest`

The inferred zod type happens to match the API DTO today, but nothing enforces it, so a renamed or added required field in `types/api.ts` would not fail compilation — it would surface at runtime.

```ts
const diarySchema = z.object({ /* ... */ }) satisfies z.ZodType<DiaryEntryRequest>
```

---

### `src/pages/Dashboard.tsx:39-47`, `:128-136`, `src/components/diary/GuideTab.tsx:16` — "today" labels go stale across midnight

`todayAsIsoDate()` / `new Date()` are only evaluated during render, and `refetchOnWindowFocus: false` is set globally (`App.tsx:13`) with no interval invalidation. A tab left idle overnight shows the previous day's banner, weekday labels, and today-count until some unrelated re-render. Self-heals on the next interaction.

---

### `src/components/diary/DiaryForm.tsx:82-86`, `src/components/common/Button.tsx:63` — possible double-submit on very fast double-click *(unconfirmed)*

The button is disabled via the mutation's `isPending`, which only applies after React commits the re-render following `mutate()`. In practice React flushes state between discrete click events, so two physical clicks are unlikely to both land first. **This was not confirmed** — ruling it in or out needs an actual browser test (e.g. a Playwright rapid double-click). Flagged as a suspicion, not a verified bug.

---

### `src/components/common/ToastViewport.tsx:38-45` — every visible toast's dismiss button has the same `aria-label`

`aria-label="Dismiss notice"` is identical across the stack, so with two toasts visible a screen-reader user hears two indistinguishable controls. Use `aria-label={`Dismiss: ${toast.message}`}`.

---

### `src/components/layout/Header.tsx:33-40` — username removed from the accessibility tree on small screens

`hidden ... md:inline-block` is `display: none` below `md`, so mobile users — visual and screen-reader alike — cannot confirm which account is signed in from the header. The `title` attribute does not help on a `display: none` element.

---

### `public/icons.svg` — entirely dead code

All six symbols (`bluesky-icon`, `discord-icon`, `documentation-icon`, `github-icon`, `social-icon`, `x-icon`) are unreferenced anywhere in `src/` or `index.html`. Leftover starter-template boilerplate unrelated to a private diary app, shipped to `dist/` on every build. Delete it.

---

### `src/components/diary/GuideTab.tsx:19`, `src/components/diary/DiaryCard.tsx:23` — unnamed magic numbers in inline styles

`paddingLeft: ${slot * 22}%` and `animationDelay: ${Math.min(index, 8) * 35}ms`. These are the only two spots in an otherwise well-named codebase (`SAVE_DELAY_MS`, `AUTO_DISMISS_MS`, `CHORD_WINDOW_MS`, `MAX_NUMBERED`, `PAGE_SIZE`, `MAX_PAGES` are all named) where intent has to be reverse-engineered. Name them: `SLOT_WIDTH_PERCENT`, `STAGGER_MS`, `MAX_STAGGERED_CARDS`.

---

## Checked and clean

Recorded so future reviews need not re-derive them:

- **No XSS surface.** No `dangerouslySetInnerHTML`, `innerHTML`, `target="_blank"`, or unvalidated URL rendering anywhere in `src/`. All user content goes through JSX escaping.
- **No hydration race.** `AuthProvider` (`src/context/AuthProvider.tsx:20-29`) decodes and expiry-checks the stored JWT synchronously inside the `useState` initializer, so the route guards never render a stale logged-out state on reload. No flash of protected content and no premature redirect.
- **Client JWT claims are never trusted for authorization.** `decodeToken`/`userFromToken` are used only for displaying the username; verified at every call site.
- **CSRF is not applicable.** Bearer-token-in-header only, no cookie auth, so there is no ambient-credential surface.
- **No `VITE_` secret leakage.** Only `VITE_API_BASE_URL` (the non-secret `/api`) reaches client code; `VITE_API_PROXY_TARGET` is read solely in `vite.config.ts`, which runs in Node at build time.
- **Dependencies clean.** `npm audit` against the committed lockfile: 0 known vulnerabilities. No production source maps (Vite's default `build.sourcemap: false`).
- **Type soundness.** Strict TS with `noUncheckedIndexedAccess`; zero `any`, `@ts-ignore`, or unsound casts in the entire codebase.
- **Hooks are correct.** `useDebouncedValue` (clean timer lifecycle) and `useShortcuts` (correct attach/remove, chord timer cleanup, ref-based latest-handlers pattern avoiding stale closures) both check out — the one `useShortcuts` gap is the dialog guard above, not its plumbing.
- **Dates are handled correctly.** `parseLocalDate` builds `Date` from Y/M/D components rather than `new Date(string)`, correctly avoiding UTC-parsing drift on the backend's `LocalDate` strings, and `Invalid Date` is guarded via `Number.isNaN(date.getTime())` at every use.
- **Context values are memoized** in all three providers; **list keys are stable** (`entry.id`, `date`) with no index-as-key issues.
- **Native `<dialog>` + `showModal()`** in `ConfirmDialog` and `ShortcutsSheet` gives correct focus trap, Escape, focus restore, and background inertness.
- **`index.html`** has `lang="en"`, a real `<title>`, and a viewport that does not disable user scaling.
- **`TextField`/`TextArea`** correctly wire `aria-invalid`, `aria-describedby`, and `role="alert"` error text, with a focus indicator that does not depend on the low-contrast global outline.
- **Reduced motion** is well handled in CSS (`index.css:627-647`) — the one gap is the JS scroll above.
- **Pagination's numbered buttons** use `aria-current="page"` correctly, and the `aria-live="polite"` result-count regions (`Pagination.tsx:43`, `Dashboard.tsx:200`) are properly wired.
- **No `console.*` calls and no TODO/FIXME comments** anywhere in `src/`.

---

## Not verifiable from this repo

- Whether the production deployment sets security headers (CSP, `X-Content-Type-Options`, `Strict-Transport-Security`) — that lives in hosting/reverse-proxy config, not here.
- Backend JWT specifics (signing algorithm, TTL, rotation). Only the DTOs and `GlobalExceptionHandler` were consulted, to validate frontend assumptions; a full backend review was out of scope.
- The double-submit suspicion above, which needs a real browser test.

---

## Verdict

This is a well-built frontend with genuinely good hygiene — strict types, no XSS surface, correct date handling, properly memoized contexts, and native dialog semantics. Nothing here blocks a merge on security grounds.

Before shipping to real users, fix the six High findings: the Pagination accessible-name failure and the focus-ring contrast are outright WCAG violations on core controls, the `page` clamp bug actively misleads users into thinking their data is gone, and error toasts that vanish in 4 seconds as the sole error surface will strand people. The absence of any test suite is the most consequential item long-term — the pure functions in `src/utils/` are the cheapest possible place to start.
