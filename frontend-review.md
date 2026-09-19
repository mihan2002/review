# Frontend code review — `sample_project_FE`

React 19 + TypeScript + Vite + TanStack Query + react-hook-form/zod diary client.
Reviewed: all of `src/`, `index.html`, `vite.config.ts`, `package.json`, `.env*`.

Overall the codebase is well structured: a single typed API contract mirroring the
backend DTOs, centralised error mapping, consistent query-key factory, native
`<dialog>` for modals, labelled inputs everywhere, and `useId` for id generation.
The findings below are the places where that discipline breaks.

---

## Critical

_None found._ No XSS sinks (`dangerouslySetInnerHTML`, `eval`, `innerHTML`), no
credentials in source, no authorisation decided on the client (`jwt.ts` is
documented as display-only and the backend re-verifies every request).

---

## High

### `src/hooks/useDraft.ts:3` — drafts are not scoped to a user and survive logout

`PREFIX = 'diary.draft.'` plus a key of `"new"` or the entry id. The full text of an
unsaved entry is written to `localStorage`, and `logout()`
(`src/context/AuthProvider.tsx:33`) clears only the token and the query cache — never
`diary.draft.*`.

Scenario: user A starts a card, navigates away without saving, and locks the
cabinet. User B signs in on the same browser and opens "Type a new card": the
banner "A draft was held at …" appears and restores user A's private text. A
single-user-per-device assumption is stated in the UI copy ("no readers but you"),
but nothing enforces it.

Fix: include the user id in the key and delete all `diary.draft.*` entries in
`logout()`.

### `src/pages/Dashboard.tsx:56` — `page` is never clamped when the result set shrinks

`page` is reset to 0 on search/range/day changes, but not when a delete removes the
last card of the last tray.

Scenario: 21 cards, `PAGE_SIZE = 10`, user is on tray 3 (`page === 2`) which holds one
card, and withdraws it. `invalidateQueries` refetches page 2, which now returns
`content: []` with `totalElements: 20`. `isEmpty` becomes true, so the list block —
which also contains `<Pagination>` (guarded by `data.content.length > 0`, line 264) —
is not rendered. The user sees "Nothing is filed yet" with no pagination control and
no way back to trays 1–2 except a manual reload.

Fix: after the data arrives, if `page > 0 && content.length === 0 && totalPages > 0`,
`setPage(Math.min(page, totalPages - 1))`.

---

## Medium

### `src/components/diary/DiaryForm.tsx:82` — the draft is discarded before the save is known to have succeeded

```ts
const submit = (submitted: DiaryFormValues) => {
  cleared.current = true
  clear()              // localStorage entry removed here
  onSubmit(submitted)  // mutation may still fail
}
```

Scenario: the user finishes a long card offline, presses "File this card", the POST
fails with `ERR_NETWORK`, a toast appears — but the held draft is already gone and
`cleared.current` permanently suppresses the restore banner. If the tab is closed
before another keystroke re-triggers the debounced save, the entry is lost. This is
exactly the failure the draft feature exists to prevent.

Fix: call `clear()` from the mutation's `onSuccess`, not before dispatch.

### `src/components/common/ConfirmDialog.tsx:45` — hard-coded element id, rendered more than once

`aria-labelledby="confirm-dialog-title"` and `<h2 id="confirm-dialog-title">` are
literals. `AppLayout` always renders the logout `ConfirmDialog` (line 66), and
`Dashboard`/`DiaryEntryPage` render a second one inside it.

Scenario: on `/dashboard`, two elements carry `id="confirm-dialog-title"`. When the
"Withdraw this card?" dialog opens, `getElementById` semantics resolve
`aria-labelledby` to the first match — the logout dialog's heading — so a screen
reader announces "Lock the cabinet?" for a destructive, irreversible delete.

Fix: `const titleId = useId()`.

### `src/components/common/ToastViewport.tsx:12` — the live region is unmounted when idle

`if (toasts.length === 0) return null` removes the `aria-live="polite"` container from
the DOM. Assistive technology has to observe a live region *before* content is
inserted into it; a region that appears simultaneously with its first child is
commonly not announced (NVDA/JAWS/VoiceOver all exhibit this).

Scenario: a screen-reader user deletes a card. "Card withdrawn." and every error
toast pass silently; since the confirm dialog also closes, there is no other
confirmation the action happened.

Fix: always render the container; conditionally render only its children. The same
pattern applies to `Dashboard.tsx:200` and `Pagination.tsx:43`, whose
`aria-live="polite"` paragraphs also mount and unmount with their content.

### `src/index.css:512` — focus indicator is removed from inputs, and is invisible on invalid ones

`.field:focus { outline: none }` overrides the global `:focus-visible` outline
(line 135) for every input, substituting a 1px→2px bottom-border change. Worse,
`.field[aria-invalid='true']` (line 521) has equal specificity and comes later, so it
wins.

Scenario: a field fails validation and turns red with a 2px bottom border. The
keyboard user tabs onto it — and nothing changes: same colour, same width. Focus is
completely invisible on exactly the field the user was sent back to fix. WCAG 2.4.7 /
2.4.11.

Fix: keep `:focus-visible { outline }` for `.field`, or add a focus rule that also
applies when `aria-invalid` is set.

### `src/hooks/useShortcuts.ts:31` — global shortcuts stay live while a modal is open

The `keydown` listener is on `window` and `isTyping()` only excludes
input/textarea/select/contenteditable. A `<dialog>` opened with `showModal()` blocks
pointer and focus, but keystrokes still bubble to `window`.

Scenario: the "Withdraw this card?" dialog is open and focused on "Keep it filed".
The user presses `n` (or `t`, or `?`): `onNewEntry` fires, the app navigates to
`/diary/new` out from under the modal, and the pending deletion is silently
abandoned. `?` toggles the shortcuts sheet on top of the confirm dialog.

Fix: bail out when `document.querySelector('dialog[open]')` exists, or gate on an
"a modal is open" flag owned by `AppLayout`.

### `src/hooks/useYearIndex.ts:41` — up to six serial, uncancellable requests per year

The `queryFn` awaits `getDiaries` in a loop of up to `MAX_PAGES = 6`, sequentially,
and ignores the `AbortSignal` React Query provides.

Scenario: the user opens the year sheet and clicks the "previous year" chevron five
times quickly. Each year starts its own chain of up to six round trips; none of the
abandoned chains is cancelled, so ~30 requests for 3,000 entries stay in flight while
the user waits on the last one. On a slow link the sheet stalls and the backend is
hammered.

Fix: accept `{ signal }` and pass it into `diaryApi.getDiaries`; consider a
server-side aggregate endpoint instead of client-side paging.

---

## Low

### `src/api/axios.ts:16` — the JWT lives in `localStorage`

Readable by any script on the origin, so a single XSS or a compromised dependency
exfiltrates a bearer token valid until `exp`. There are no injection sinks in this
codebase today, which is why this is Low rather than High, but the mitigation
(`HttpOnly` cookie, or at minimum a short-lived token with refresh) belongs on the
backend's roadmap. Note also that the app never re-checks `exp` during a session:
expiry is only discovered when a request 401s.

### `src/utils/jwt.ts:35` — `uid` is not validated but is typed as `string`

`decodeToken` only checks that `sub` is a string, then casts to `TokenPayload`.
`AuthProvider` builds `{ id: payload.uid, … }`, so a token minted without `uid`
yields `CurrentUser.id === undefined` while TypeScript insists it is a `string`.
Nothing currently reads `user.id`, so this is latent rather than broken. Validate
`uid` alongside `sub`.

### `src/pages/Dashboard.tsx:282` — stagger index is computed wrongly

`index={groupIndex + entryIndex}` mixes two counters: the second entry of group 0 and
the first entry of group 1 both get `1`, so the animation delay repeats instead of
cascading. Cosmetic only. Use a running counter across groups.

### `src/components/diary/YearSheet.tsx:48` — statistics are presented without the partial caveat

When `data.partial` is true the index is missing days, yet `daysFiled` and the
"N-day run" badge are rendered in the header as facts; the "Read the first N of M
cards" disclaimer sits at the very bottom of the sheet. A user with more than 600
entries in a year sees an understated streak with no nearby explanation.

### `src/hooks/useShortcuts.ts:47` / `:59` — modifier and chord handling is loose

`event.shiftKey` is not excluded, so `Shift+N` also creates a card; and after `g` any
non-`d` key is swallowed (`return` at line 56) rather than being handled as its own
shortcut. Both are minor surprises, not failures.

### `src/context/ToastProvider.tsx:19` — dismissal timers are never cleared

`window.setTimeout(… , 4000)` is fired and forgotten. Harmless in practice (the
provider lives for the app's lifetime and `dismissToast` is a no-op filter on an
already-removed id), but it leaks timers across a provider remount in tests.

### `.env` is committed

`.gitignore` covers `.env.local` and `.env.*.local` but not `.env`, which is tracked.
It currently holds only localhost URLs, so nothing is leaked — but the file is the
first place a secret will be added.

### Missing: no tests, no Content-Security-Policy

There is no test runner in `package.json` (`lint` is oxlint only), so none of the
date/catalog/error helpers — the pure, trivially testable parts — are covered.
`index.html` ships no CSP meta tag; adding one would meaningfully limit the blast
radius of the `localStorage` token above.

---

## Notes on things that are correct

- `PageResponse` in `src/types/api.ts` matches `PageResponse.java` field for field
  (`page`/`size`/`totalElements`/`totalPages`/`last`) — no silent `undefined` in the
  pagination footer.
- `PAGE_SIZE`/`useYearIndex`'s `PAGE_SIZE = 100` respect the backend's `@Max(100)`.
- The 401 interceptor correctly exempts `/auth/` so a bad login is not mistaken for
  an expired session, and dispatches an event rather than reaching into React.
- `parseLocalDate` avoids the classic `new Date("2026-09-18")` UTC-shift bug.
- The stretched-link pattern in `DiaryCard` keeps a single accessible link while
  raising the action buttons above it with `z-10`.
