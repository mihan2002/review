# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person writing a private diary for themselves. The primary scene is end-of-day
on a personal machine or phone — most days, usually at night, often tired, usually
for five to fifteen minutes. There is no second audience: no sharing, no collaborators,
no reader but the author. A returning user arrives either to write today's entry or
to find something they wrote before.

## Product Purpose

A private journal with an account behind it, so entries survive a lost device and stay
reachable from anywhere the author signs in. Success is that the author keeps writing:
the app is fast to open, the writing surface is comfortable, and past entries are easy
to find months later.

## Positioning

A single-author journal with a real server-side account and full-text search over the
author's own entries — not a notes app with a diary template, and not a local-only
file. Every entry is scoped to its owner; search and date filtering happen on the
server, so the archive stays usable when it is large.

## Operating Context

- Spring Boot backend (`sample_project_BE`), React + Vite + TypeScript frontend
  (`sample_project_FE`). The backend is fixed for this work and must not change.
- JWT bearer auth. The token lives in `localStorage` under `diary.token`; a 401 on any
  non-`/auth/` request clears it and signs the user out.
- Entries carry an `entryDate` (the day the entry is *about*) separate from `createdAt`
  and `updatedAt` (when it was written and last edited). These are different facts and
  the interface must not collapse them.
- Typical session: open → read the greeting → either write, or search/filter to find an
  old entry → read → occasionally edit or delete.

## Capabilities and Constraints

Confirmed API surface (unchangeable):

- `POST /api/auth/register` → `UserResponse`; `POST /api/auth/login` → `AuthResponse`
  (`token`, `tokenType`, `expiresIn` seconds). Login is by **username**, not email.
- `GET /api/diaries` — optional `from`, `to` (ISO dates), `page` (default 0),
  `size` (default 10). Returns `PageResponse<DiaryEntry>`, newest first.
- `GET /api/diaries/search` — required `keyword`, plus `page`, `size`.
  **The search endpoint accepts no date range**, so keyword search and date filtering
  cannot be combined server-side. Any UI that appears to combine them is lying.
- `GET|PUT|DELETE /api/diaries/{id}`, `POST /api/diaries`.
- Entry validation mirrored on the client: title 1–200 chars, content 1–20000 chars,
  `entryDate` a valid ISO local date.
- Errors return `ErrorResponse` (`status`, `message`, optional field `errors`).
- No endpoint returns aggregates, tags, moods, attachments, or entry counts by day.
  Anything of that kind must be derived client-side from a fetched page, and must not
  be presented as a whole-archive fact unless the whole archive was fetched.

Scope confirmed for this rebuild: keep every existing feature, and add depth that the
current API already supports (client-side only). The backend is not to be modified.

## Brand Commitments

The product is named "My Diary" in the incumbent build. The name is not pinned; no
logo, typeface, palette, or asset is a confirmed commitment. The incumbent look
(cream ground, serif display, muted sage accent) is explicitly **not** to be preserved
and is named by the user as an anti-reference.

## Evidence on Hand

No real entry content, no users, no screenshots, no marketing copy. All demonstration
entries shown in design work are authored and synthetic, and must be labeled as such
wherever a viewer could mistake them for real. There are no metrics, testimonials, or
usage claims to cite, and none may be invented.

## Product Principles

1. **The archive is the asset.** Writing is a few minutes a day; the entries are kept
   for years. Retrieval must stay fast and calm as the archive grows.
2. **Private by construction.** One author, one account, nothing shared. Nothing in the
   interface should imply an audience, a feed, or social reward.
3. **Two clocks, never merged.** The day an entry is about and the moment it was
   written are distinct facts, both visible where they matter.
4. **Honest about its own limits.** Where the API cannot do something (search plus
   date range, whole-archive statistics), the interface says so rather than faking it.
5. **Cheap to open.** A journal that feels expensive to load is a journal that gets
   skipped on a tired night.

## Accessibility & Inclusion

No formal standard was specified. The incumbent build keeps visible focus rings,
labeled controls, `prefers-reduced-motion` handling, and `role="alert"` on form errors;
these are baseline behavior to preserve, not optional polish.
