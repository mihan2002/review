---
name: My Diary — The Card Catalog
description: A private diary filed like a library card cabinet — oak case, manila cards on a rod, brass hardware, typewriter ink.
colors:
  case: "#241b12"
  case-ink: "#e4dac2"
  case-ink-soft: "#c4a05a"
  deep: "#17110a"
  deep-ink: "#e4dac2"
  deep-ink-soft: "#cfae6a"
  card: "#dfd3b6"
  card-sunk: "#cdbf9c"
  rule: "#bfae84"
  ink: "#191309"
  ink-soft: "#5e5138"
  brass: "#b08a3e"
  brass-bright: "#d8ab50"
  stamp: "#9b2318"
  focus: "#d8ab50"
  day-case: "#c0a880"
  day-case-ink: "#241b12"
  day-case-ink-soft: "#40301a"
  day-deep: "#6b563c"
  day-deep-ink: "#f6eedc"
  day-deep-ink-soft: "#ecd09a"
  day-card: "#efe6cf"
  day-card-sunk: "#ddd0ae"
  day-rule: "#cdbc94"
  day-ink-soft: "#6b5d42"
  day-focus: "#3a2c10"
typography:
  drawer-head:
    fontFamily: "'Courier Prime', ui-monospace, 'Courier New', monospace"
    fontSize: "clamp(1.75rem, 5vw, 2.375rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.06em"
  entry-title:
    fontFamily: "'Faustina Variable', 'Faustina', ui-serif, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "normal"
  card-title:
    fontFamily: "'Faustina Variable', 'Faustina', ui-serif, Georgia, serif"
    fontSize: "clamp(1.375rem, 3vw, 1.5rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  hand-body:
    fontFamily: "'Faustina Variable', 'Faustina', ui-serif, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: "1.75rem"
    letterSpacing: "normal"
  record-prose:
    fontFamily: "'Courier Prime', ui-monospace, 'Courier New', monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
    fontFeature: "tabular-nums"
  record:
    fontFamily: "'Courier Prime', ui-monospace, 'Courier New', monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.13em"
    fontFeature: "tabular-nums"
  record-sm:
    fontFamily: "'Courier Prime', ui-monospace, 'Courier New', monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.16em"
    fontFeature: "tabular-nums"
  stamp:
    fontFamily: "'Courier Prime', ui-monospace, 'Courier New', monospace"
    fontSize: "0.5625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.18em"
rounded:
  hairline: "1px"
  card: "2px"
  drawer: "3px"
  tab: "3px 3px 0 0"
  pull: "999px"
spacing:
  rule-step: "1.75rem"
  gutter: "1rem"
  gutter-lg: "1.5rem"
  card-gap: "0.875rem"
  group-gap: "2.25rem"
  section-gap: "2.5rem"
  container: "64rem"
components:
  button-brass:
    textColor: "#1a1204"
    typography: "{typography.record}"
    rounded: "{rounded.card}"
    padding: "0 1.15rem"
    height: "2.75rem"
  button-card:
    backgroundColor: "{colors.card-sunk}"
    textColor: "{colors.ink}"
    typography: "{typography.record}"
    rounded: "{rounded.card}"
    padding: "0 1.15rem"
    height: "2.75rem"
  button-card-hover:
    backgroundColor: "{colors.card}"
  button-case:
    textColor: "{colors.deep-ink}"
    typography: "{typography.record}"
    rounded: "{rounded.card}"
    padding: "0 1.15rem"
    height: "2.75rem"
  button-quiet:
    textColor: "{colors.ink-soft}"
    typography: "{typography.record}"
    rounded: "{rounded.card}"
    padding: "0 1.15rem"
    height: "2.75rem"
  button-stamp:
    textColor: "{colors.stamp}"
    typography: "{typography.record}"
    rounded: "{rounded.card}"
    padding: "0 1.15rem"
    height: "2.75rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1rem 1.25rem 2.5rem"
  drawer:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.drawer}"
    padding: "1rem"
  blank-card:
    textColor: "#1a1204"
    typography: "{typography.record}"
    rounded: "{rounded.card}"
    padding: "0.95rem 1.15rem 2.5rem"
    height: "10rem"
  field:
    backgroundColor: "{colors.card-sunk}"
    textColor: "{colors.ink}"
    typography: "{typography.record-prose}"
    rounded: "1px 1px 0 0"
    padding: "0.7rem 0.85rem"
    width: "100%"
  tab:
    backgroundColor: "{colors.card-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tab}"
    padding: "0.3rem 0.85rem 0.35rem"
  stamp-mark:
    textColor: "{colors.stamp}"
    typography: "{typography.stamp}"
    rounded: "{rounded.hairline}"
    padding: "0.15rem 0.4rem"
  brass-plate:
    textColor: "#1a1204"
    typography: "{typography.record}"
    rounded: "{rounded.card}"
    padding: "0.375rem 0.75rem"
---

# Design System: My Diary — The Card Catalog

## Overview

**Creative North Star: "The Card Catalog"**

The interface is a library card cabinet, not a feed. A varnished-oak case holds recessed drawers; inside each drawer, buff manila cards sit ruled and punched for a filing rod, with brass rails, guide tabs, label holders and pulls as the only hardware. The catalog types in typewriter carbon; the author writes in a book serif; a red rubber stamp marks anything that departs from the ordinary. Everything is made of the case, the recess, card stock, brass and ink — there is no sixth material, and nothing in the build is a neutral grey box.

Density is high but orderly: labels are small, uppercase and widely letterspaced; the content they label is large and comfortable. The single strongest tension in the system is the split between the two typographic voices — the cabinet's own speech and the author's hand — and the build enforces that split everywhere, including on the dashboard's largest heading, which stays in the typewriter because the catalog, not the author, is speaking there.

Two themes ship: **night** is the default, chosen for the product's real scene (a dim bedroom at the end of the day), and **day** is a reading room under daylight. They are not a ground swap: the case changes from dark walnut to daylit timber and the recess from near-black to mid walnut, while card stock, ink, brass and stamp red hold their values so the cards look like the same paper under a different lamp. The theme is written to `data-theme` on `<html>` before first paint by an inline script, so the drawer never flashes.

**Key Characteristics:**
- Two enforced typographic voices: Courier Prime for the catalog, Faustina for the author.
- Near-square corners (2px) on every surface; no rounded-card language anywhere.
- Five materials only: oak case, dark recess, manila card stock, brass, stamp red.
- Physical depth — recessed drawers, cast shadows, bevelled brass — instead of flat tonal panels.
- One authored motion (a card settling onto the filing rod) plus one receipt (a stamp press).
- Browser chrome is themed as part of the cabinet: selection, caret, scrollbar, focus ring, date picker.

## Colors

Five materials, each with its own ink; nothing in the palette is a neutral grey.

### Primary
- **Brass** (`brass` #b08a3e, `brass-bright` #d8ab50): the cabinet's hardware. It flows only through surfaces — label holders, drawer pulls, rails, the primary button's bevelled face, today's blank card, the scrollbar thumb, the one-card mark on the year sheet, and hairline borders at 25–40% alpha. It is the strongest colour on the page and the reason the primary action needs no other emphasis.

### Secondary
- **Stamp Red** (`stamp` #9b2318): the red ribbon and the rubber stamp. It marks departures from the ordinary — an amended card, the withdraw action, a validation rejection, a held draft, today's label on a guide tab, a writing run, a day with more than one card filed — and the text caret. It is always low-ink: a 1.5px stamp outline, a hairline border, a word, a 14px-tall cell. It never floods a surface.

### Neutral
- **Oak Case** (`case` #241b12 / day #c0a880): the page ground, carried by a three-layer repeating-gradient grain so the timber reads as timber rather than a flat fill. Its text is `case-ink` (#e4dac2) and `case-ink-soft` (#c4a05a).
- **The Recess** (`deep` #17110a / day #6b563c): drawer interiors, the sticky top rail, and the rod hole's shadow. Dark in both themes — daylight reaches into the recess without opening it. Its text is `deep-ink` (#e4dac2) and `deep-ink-soft` (#cfae6a).
- **Card Stock** (`card` #dfd3b6 / day #efe6cf) and **sunk stock** (`card-sunk` #cdbf9c): every card, panel, field, guide tab and dialog. Identical in both themes apart from a slight daylight lift.
- **Rule** (`rule` #bfae84): the printed ruling on a card and every dashed divider drawn inside one.
- **Carbon Ink** (`ink` #191309, `ink-soft` #5e5138): all text sitting on card stock. `ink` is unchanged between themes.

### Named Rules
**The Brass Is Metal Rule.** Brass is a surface material, never a text colour. Type on card stock is `ink` / `ink-soft`; type on a recessed surface (drawer, top rail) is `deep-ink` / `deep-ink-soft`; type on the bare case is `case-ink` / `case-ink-soft`. Text set directly on a brass face is near-black (#1a1204), not brass.

**The Stamp Rule.** Red is an annotation, never a fill. It appears as an outline, a hairline, a caret or a word — and never as the background of anything larger than a marker cell.

**The Constant Stock Rule.** Switching themes changes the case, the recess, the ruling and the shadows. Card stock, carbon ink, brass and stamp red stay put, because paper and hardware do not change colour when the lamp does.

## Typography

**Record Font:** Courier Prime (400/700, self-hosted via @fontsource, fallback `ui-monospace, 'Courier New', monospace`)
**Hand Font:** Faustina Variable (self-hosted, fallback `ui-serif, Georgia, serif`)

**Character:** A typewriter and a fountain pen on the same card. Courier Prime is the machine: uppercase, widely letterspaced, tabular, used for labels, call numbers, dates, counts, buttons and — through `.record-prose` — for the catalog's full sentences. Faustina is the author: mixed case, no tracking, used only for words the author typed into the diary.

### Hierarchy
- **Drawer head** (Courier Prime 700, 1.75rem → 2.375rem, line-height 1.1, tracking 0.06em): the dashboard's date headline. The catalog announcing which drawer is open.
- **Entry title** (Faustina 600, 2rem → 2.5rem, line-height 1.12): the author's own heading on the lifted card.
- **Card title** (Faustina 600, 1.375rem → 1.5rem): the heading on a filed card in the drawer.
- **Day number** (Courier Prime 700, 2.5rem, tracking 0.02em): the large filing date at the head of an entry card.
- **Hand body** (Faustina 400, 1.0625rem, line-height `1.75rem`, max 68ch): the entry text, its leading locked to the card's ruled pitch so the words sit on the printed lines. Card excerpts use the same treatment at 0.9375rem within `max-w-prose`.
- **Record prose** (Courier Prime 400, 0.8125–1.5rem, line-height 1.6, no transform): everything the catalog says in sentences — dialog titles, empty-state copy, auth headings, drawer status lines.
- **Record label** (Courier Prime, 0.6875rem, uppercase, tracking 0.13em): the default catalog label, on call numbers, field labels, buttons, counts, footer.
- **Record small** (Courier Prime, 0.625rem, uppercase, tracking 0.16em): tab fields, meta lines, legends, hints.
- **Stamp** (Courier Prime 700, 0.5625rem, uppercase, tracking 0.18em, rotated −3°): the rubber-stamp mark.

### Named Rules
**The Two Voices Rule.** Faustina is reserved for what the author wrote — entry titles, entry bodies, card excerpts, the compose fields' content, and toast messages quoting the cabinet's reply to the author. Everything else the interface says is Courier Prime, including long sentences, which take `.record-prose` rather than switching to the serif. A serif heading generated by the app, or a monospaced label over the author's own words, is a defect.

**The Ruled Line Rule.** Long-form author text sets its line-height to `var(--rule-step)` (1.75rem) so it sits on the card's ruling. Change the ruling pitch and the prose leading follows; never set one without the other.

**The Tabular Rule.** Numerals are tabular across the whole document (`font-variant-numeric: tabular-nums` on `body`); `.hand` explicitly returns to normal numerals, because the author's writing is not a ledger. Counts are zero-padded to catalog width (007, not 7).

## Layout

One centred column, `max-w-5xl` (64rem), with 1rem gutters rising to 1.5rem at the `sm` breakpoint (640px); the same container governs the top rail, the main region and the footer plate. Main content runs `pt-8 pb-16` (2rem / 4rem), `sm:pt-10`. The header is a 4rem sticky rail at `z-30` over `deep` at 92% with a 3px backdrop blur and a brass hairline beneath it.

Vertical rhythm inside the drawer is three-tiered: 0.875rem between cards in the same day, 2.25rem between date groups, 2.5rem between major regions. The dashboard drawer front is a two-column grid at `sm` (`1fr minmax(0,17rem)`, `items-end`) that stacks on mobile, with today's blank card occupying the narrow column; the compose form pairs heading and date as `2fr 1fr`. Breakpoints in use are Tailwind's `sm` (640px) and `md` (768px) only — the system has no desktop-specific layout beyond the container cap; the 1440px view is the same column, centred on more oak.

Density collapses downward rather than reflowing: button labels beside icons hide below `sm`, the holder's name hides below `md`, and the year sheet keeps one unbroken row per month behind a horizontal scroll (`min-w-[34rem]`) instead of wrapping its days.

### Named Rules
**The Drawer Containment Rule.** Cards never sit directly on the oak. A list of cards, an empty state and a loading state all live inside a `.drawer` — recessed, rail-lined, padded 1rem (1.5rem at `sm`) — so the stack always has a container behind it.

## Elevation & Depth

Depth is physical and consistent with the material: the case is lit from above, drawers are cut into it, cards lie on top of the drawer floor, and brass catches a highlight on its top edge. There are exactly three shadow tokens plus a family of inset bevels applied directly to brass surfaces, and both themes redefine the shadows — night casts nearly black, day casts warm brown at lower alpha.

### Shadow Vocabulary
- **Card at rest** (`--shadow-card`: `0 1px 2px rgb(0 0 0 / 0.28), 0 8px 18px -10px rgb(0 0 0 / 0.6)`): every card lying in a drawer. A tight contact shadow plus a long soft cast.
- **Card lifted** (`--shadow-lift`: `0 2px 4px rgb(0 0 0 / 0.3), 0 18px 30px -14px rgb(0 0 0 / 0.68)`): a card raised by hover, 7px of real travel.
- **Recess** (`--shadow-drawer`: `inset 0 2px 10px rgb(0 0 0 / 0.55), inset 0 -1px 0 rgb(255 255 255 / 0.05)`): the drawer interior and anything cut into the case.
- **Brass bevel** (`inset 0 1px 0 rgb(255 255 255 / 0.5), inset 0 -1px 0 rgb(0 0 0 / 0.3), 0 1px 2px rgb(0 0 0 / 0.35)`): every brass face, alongside a top-to-bottom bright→shade gradient.

### Named Rules
**The Real Travel Rule.** Lift is movement plus shadow, never shadow alone: `.liftable` and `.blank-card` translate −7px on hover while the cast shadow lengthens and, on a punched card, the rod hole darkens beneath it. Pressing reverses it — +1px and an inset shadow, as if the card were pushed down onto the rod.

**The No Flat Panel Rule.** A surface is either case, recess, card stock or brass, and each carries its own depth cue (grain, inset shadow, cast shadow, bevel). A borderless flat rectangle of arbitrary colour has no place in the cabinet.

## Shapes

Corners are 2px everywhere — cards, buttons, brass plates, the blank card — with 1px on the smallest marks (field top corners, stamp, skeleton lines, icon-button hit areas) and 3px on the drawer body. The only round geometry in the system is functionally round: the filing-rod hole (a 13px circle with an inset shadow, centred 6px above a card's bottom edge) and the drawer pulls (fully rounded brass bars).

Guide tabs are the one non-rectangular silhouette: a trapezoid clipped with `polygon(0 100%, 4px 0, calc(100% - 4px) 0, 100% 100%)`, rounded 3px on the top corners only, with an inset highlight and an upward shadow so it reads as standing proud of the cards behind it.

Edges are drawn by material, not by strokes. A card has no border: it has a fiber edge (a top-to-bottom light/dark gradient), a faint turbulence overlay at 32% multiply, and optional printed ruling. Where a line is genuinely needed inside a card, it is a dashed `rule` divider; on the case, it is a brass hairline at 25–40% alpha.

### Named Rules
**The Square Corner Rule.** 2px is the radius. There is no `md`/`lg`/`xl` radius scale and nothing in the system is pill-shaped except a drawer pull and the rod hole.

**The Material Edge Rule.** Card stock is bounded by its own fiber gradient and cast shadow, not by a 1px border. Reach for a border only for a dashed internal rule or a brass hairline on the case.

## Components

### Buttons
- **Shape:** near-square (2px), 2.75rem tall by default, 0 1.15rem padding, Courier Prime 700 at 0.6875rem, uppercase, tracking 0.16em, with a 0.5rem gap for an optional Lucide icon. Sizes: `sm` 2.25rem / 0.625rem type, `md` 2.75rem, `lg` 3.25rem / 0.75rem type.
- **Brass (primary, default):** a bevelled brass face — bright→brass→shaded gradient, inset highlight and shade, near-black (#1a1204) label. Hover rises 1px and deepens the cast shadow; active drops 1px into an inset press.
- **Card:** `card-sunk` fill with carbon-ink label and an inset top highlight, for actions sitting on card stock; hover lightens to full `card`.
- **Case:** transparent with a brass hairline inset and `deep-ink` label, for actions on a recessed surface (top rail, inside a drawer); hover washes 22% brass behind it.
- **Quiet:** transparent with a 40% `ink-soft` hairline, for cancel and dismissal on a card.
- **Stamp:** transparent with a 55% stamp-red hairline and red label, reserved for withdrawal.
- **Loading:** the label swaps to a working phrase and three 3px pulsing dots type ahead of it (`motion-safe` only); the button sets `aria-busy` and disables. Disabled is 0.55 opacity and `not-allowed`.

### Cards / Containers
- **Corner Style:** 2px.
- **Background:** `card` stock with a fiber-edge gradient; `.card-fiber` adds an inline SVG turbulence at 32% multiply; `.card-ruled` prints the full 1.75rem ruling at 72% rule strength, `.card-ruled-faint` the same at 42% for surfaces carrying long prose.
- **Shadow Strategy:** `--shadow-card` at rest; `.liftable` upgrades to `--shadow-lift` on hover.
- **Border:** none. Internal separation is a dashed `rule` line.
- **Internal Padding:** 1rem–1.25rem sides (1.5rem+ at `sm`), with an enlarged bottom (2.5rem–3.5rem) whenever `.card-punch` is applied, so nothing sits on top of the rod hole.

### Inputs / Fields
- **Style:** `.field` is a typing slot, not a box — `card-sunk` at 80% alpha, no side or top border, a single 1px `ink-soft` line along the bottom, 1px top corners, Courier Prime at 0.875rem with 0.02em tracking, 0.7rem/0.85rem padding.
- **Focus:** the typing line thickens to 2px in full `ink` and the bottom padding compensates, so nothing shifts. The browser outline is suppressed here only because the line itself is the focus signal; everywhere else the global `:focus-visible` ring applies (2px solid `focus`, 2px offset, 1px radius).
- **Error:** `aria-invalid` turns the same line 2px stamp red, with a bold red `record-sm` message below carrying `role="alert"`. Red is never used for focus and ink is never used for error, so the two states cannot be confused.
- **Labels:** `.record` uppercase above the field. Hints and errors are `.record-sm` below it; the caret is stamp red in every field.

### Navigation
The top rail is the cabinet's front edge: sticky, recessed, brass-hairlined. The identity is a brass label holder (`.brass-plate`) with a small screw mark and the cabinet's name in Courier Prime bold, followed on `sm` and up by the record-small line "Card Catalog". Controls on the right are all `btn-case` icon buttons (2.25rem tall) for lamp, instructions and lock; the holder's username sits in a brass-hairlined chip from `md`. Below the drawer, pagination is a separate nav — "Cards 001–012 of 137 · Tray 2/9" in record type, with brass-hairlined tray buttons and the current tray flooded in brass.

### Signature: the filed card
A `.card .card-fiber .card-punch .liftable .file-in` article: the call number ("DY·2026.09.18·7K") in record type across the top with an "Amended" stamp opposite; the author's title in Faustina; a ruled excerpt in Faustina; a meta line and two icon actions at the foot; a rod hole punched through the bottom edge. The title's link stretches across the whole card via a `::before` overlay, and the edit/withdraw actions are raised above it at `z-10` and fade from 70% to full on hover or focus-within.

### Signature: today's blank card
The primary action on the dashboard is not a button but `.blank-card` — a brass-flooded card, ruled in 16%-black lines on the same 1.75rem pitch, punched like every other card, 10rem tall, with the drawer's month label at the top and "Type today's card" at the foot. It lifts 7px and brightens 6% on hover and presses 1px into an inset on active.

### Signature: the guide tab
`.tab` is a trapezoidal manila tab holding, in one line, the weekday, the day number (record type at 0.9375rem bold), the month, an optional red "Today", and the card count. Its horizontal slot comes from a deterministic hash of the date modulo four positions, offset in steps of 22% of the drawer width.

### Signature: the year sheet
A card holding a 12×31 grid of 14px day cells: unfiled days at 38% rule, one card in brass, more than one in stamp red, with a 2px ink ring on the selected day and a lighter ring on today. Legend and a "read the first N of M cards" honesty note are set in record-small beneath it.

### Stamps, toasts and dialogs
`.stamp` is a −3° rotated, 1.5px-outlined red mark at 88% opacity, used in a card's corner to record an amendment. Toasts are small cards that arrive with a stamp press, carrying a three-letter record code ("REC" / "REJ", red on error) and the message in Faustina; an error toast adds a 1.5px stamp-red ring to the card shadow. The confirm dialog is a native `<dialog>` card with a 72% near-black backdrop and 2px blur, a record-prose title, a dashed rule above its actions, and a quiet/stamp button pair.

### Named Rules
**The Corner Stamp Rule.** A stamp mark belongs in a card's corner, opposite its call number. It is never a pill in a header row and never a coloured chip.

**The Deterministic Tab Rule.** A guide tab's slot is derived from its date, so a given day always stands in the same place across sessions and pages. Tab position is never random and never sequential.

## Do's and Don'ts

### Do:
- **Do** set every new surface in one of the five materials — case, recess, card stock, brass, stamp red — and give it that material's depth cue.
- **Do** use `.record` / `.record-sm` / `.record-prose` for everything the interface says, and `.hand` only for text the author wrote.
- **Do** lock long-form author prose to `line-height: var(--rule-step)` so it sits on the card's ruling, and cap the measure (68ch on the entry, `max-w-prose` on excerpts).
- **Do** keep corners at 2px, and reach for 1px only on marks smaller than a button.
- **Do** put actions on the correct ground: `btn-brass` for the primary act, `btn-card` on card stock, `btn-case` on the rail or inside a drawer, `btn-quiet` for dismissal, `btn-stamp` for withdrawal.
- **Do** pad the bottom of any `.card-punch` surface to at least 2.5rem so the rod hole stays clear.
- **Do** carry state changes on real travel plus shadow (`.liftable`), and let `--ease-rail` (`cubic-bezier(0.16, 0.84, 0.28, 1)`) carry anything that slides.
- **Do** theme the browser's own surfaces — selection, caret, scrollbar, focus ring, underline offset, tabular numerals, the native date-picker indicator — as part of the cabinet.
- **Do** disable the authored motion under `prefers-reduced-motion`, keeping only the shadow change on hover.
- **Do** zero-pad counts to catalog width (`typedCount`) and show dates as the catalog would file them.

### Don't:
- **Don't** set text in brass, or set a brass surface's label in anything but near-black (#1a1204).
- **Don't** flood a surface in stamp red or use it for focus; it is an annotation for amendment, withdrawal, rejection and exception only.
- **Don't** put a small uppercase label above a heading. The system has no kickers or eyebrows; a heading stands alone and a record label sits beside or beneath its content.
- **Don't** introduce a rounded-card radius, a pill button or a radius scale beyond 1px/2px/3px.
- **Don't** fade anything in. The one authored entrance (`.file-in`, 300ms) starts fully visible and is carried by clip-path, translation and a travelling shadow; opacity is used only for the stamp press receipt.
- **Don't** add a second entrance animation, a spinner, or a decorative transition; the system has exactly one authored moment and one receipt.
- **Don't** draw a 1px border around a card, or use a flat grey panel as a container.
- **Don't** let cards sit directly on the oak — wrap any stack, empty state or loading state in a `.drawer`.
- **Don't** use glyph or emoji icons; icons are Lucide SVG at `size-4` (1rem) with 1.75 stroke, 2 for directional chevrons, and they never replace a text label on a primary control.
- **Don't** treat the day theme as a light-mode inversion: card stock, ink, brass and stamp red hold their values, and only the case, recess, ruling and shadows change.
