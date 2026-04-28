# Budget — Design System

> Personal budget PWA for a couple. Italian-only. Mobile-first (375 px portrait primary).
> Tone: **trustworthy, warm, grown-up** — not banking-cold, not childish, not generic SaaS.
> Tech: Next.js 16 · Tailwind v4 (`@theme` directive) · shadcn/ui base-nova preset (Base UI).

---

## 1. Brand & Tone

### Concept

**"Il quaderno delle spese"** — a well-kept household ledger. Not a fintech dashboard, not a
spreadsheet. The visual language borrows from mid-century Italian printed matter: generous
whitespace, confident serif headlines, restrained colour, zero decorative noise.

### Personality adjectives

Affidabile · caldo · preciso · quotidiano · adulto

### Anti-patterns to avoid

- Cold blue/grey banking palettes
- Neon status colours (electric green, hot red)
- Purple-gradient AI-slop
- Bouncy micro-animations
- Comic/playful iconography (piggy banks, emojis)

### Differentiator

The **terracotta accent** (`#C1603A`) — an earthy sienna pulled from Italian ceramics, used
sparingly on interactive elements and active states. It reads warm without being aggressive.
Paired with cream paper (`#F7F4EF`) as the page background, the result feels like a well-printed
document rather than a software product.

---

## 2. Color Palette

### 2a. Raw Scale (hex)

| Token name      | Hex       | OKLCH (approx)              | Usage                        |
|-----------------|-----------|-----------------------------|------------------------------|
| `clay-50`       | `#FAF8F4` | oklch(0.974 0.010 60)       | Page background alt          |
| `clay-100`      | `#F7F4EF` | oklch(0.963 0.014 60)       | Page background (main)       |
| `clay-200`      | `#EDE7DC` | oklch(0.924 0.022 60)       | Surface / card               |
| `clay-300`      | `#DDD4C5` | oklch(0.866 0.032 60)       | Surface elevated / dividers  |
| `clay-400`      | `#C4B59E` | oklch(0.763 0.042 60)       | Border                       |
| `clay-500`      | `#A99278` | oklch(0.648 0.052 60)       | Muted text                   |
| `clay-600`      | `#8A7259` | oklch(0.524 0.056 60)       | Secondary text               |
| `clay-700`      | `#6B543F` | oklch(0.414 0.055 55)       | Body text                    |
| `clay-800`      | `#4A3728` | oklch(0.299 0.048 50)       | Heading text                 |
| `clay-900`      | `#2C1F14` | oklch(0.187 0.038 45)       | Text primary (near-black)    |
| `terra-400`     | `#D8845A` | oklch(0.672 0.120 40)       | Accent light                 |
| `terra-500`     | `#C1603A` | oklch(0.581 0.133 38)       | **Brand accent**             |
| `terra-600`     | `#A84A29` | oklch(0.495 0.130 36)       | Accent dark / hover          |
| `terra-700`     | `#8A3519` | oklch(0.398 0.120 33)       | Accent deeper                |
| `sage-400`      | `#7BA88A` | oklch(0.665 0.070 150)      | Under-budget light           |
| `sage-500`      | `#5A9169` | oklch(0.572 0.085 150)      | **Under-budget**             |
| `sage-600`      | `#427553` | oklch(0.470 0.088 150)      | Under-budget dark            |
| `amber-400`     | `#E8B84B` | oklch(0.792 0.135 75)       | At-budget light              |
| `amber-500`     | `#D49A26` | oklch(0.706 0.150 72)       | **At-budget**                |
| `amber-600`     | `#B07D10` | oklch(0.598 0.145 70)       | At-budget dark               |
| `sienna-400`    | `#E07B5A` | oklch(0.665 0.128 32)       | Over-budget light            |
| `sienna-500`    | `#C85535` | oklch(0.557 0.148 30)       | **Over-budget**              |
| `sienna-600`    | `#A63C1E` | oklch(0.454 0.140 28)       | Over-budget dark             |
| `slate-400`     | `#8E9BB0` | oklch(0.663 0.040 245)      | Neutral / info light         |
| `slate-500`     | `#6B7A94` | oklch(0.548 0.054 248)      | **Neutral / info**           |

### 2b. Semantic Tokens

| Semantic name         | Light value                  | Role                                              |
|-----------------------|------------------------------|---------------------------------------------------|
| `background`          | `clay-100` `#F7F4EF`         | Page background                                   |
| `surface`             | `#FFFFFF`                    | Card / sheet base                                 |
| `surface-elevated`    | `clay-50` `#FAF8F4`          | Popover, dialog, elevated card                    |
| `border`              | `clay-300` `#DDD4C5`         | Default dividers and input borders                |
| `border-muted`        | `clay-200` `#EDE7DC`         | Subtle separators                                 |
| `text-primary`        | `clay-900` `#2C1F14`         | All primary body & label text                     |
| `text-muted`          | `clay-500` `#A99278`         | Placeholders, secondary labels, captions          |
| `text-inverse`        | `clay-50` `#FAF8F4`          | Text on dark/accent backgrounds                   |
| `accent`              | `terra-500` `#C1603A`        | Interactive elements, active states, brand        |
| `accent-hover`        | `terra-600` `#A84A29`        | Hover / pressed accent                            |
| `accent-foreground`   | `#FFFFFF`                    | Text on accent backgrounds                        |
| `success`             | `sage-500` `#5A9169`         | Under-budget state, positive KPIs                 |
| `warning`             | `amber-500` `#D49A26`        | At-budget state, cautionary                       |
| `danger`              | `sienna-500` `#C85535`       | Over-budget state, destructive actions            |
| `info`                | `slate-500` `#6B7A94`        | Neutral informational                             |
| `focus-ring`          | `terra-500` at 40% opacity   | Keyboard focus outline                            |

### 2c. State Colors for Budget Cards

| State          | Background              | Fill/Bar            | Text                 | Border              |
|----------------|-------------------------|---------------------|----------------------|---------------------|
| Under-budget   | `sage-500/10`           | `sage-500`          | `sage-600`           | `sage-500/25`       |
| At-budget      | `amber-500/10`          | `amber-500`         | `amber-600`          | `amber-500/25`      |
| Over-budget    | `sienna-500/10`         | `sienna-500`        | `sienna-600`         | `sienna-500/25`     |
| Neutral        | `surface`               | `clay-400`          | `text-primary`       | `border`            |

### 2d. Contrast — WCAG Compliance

| Pair                                  | Ratio   | Level      |
|---------------------------------------|---------|------------|
| `text-primary` on `background`        | ≥ 12:1  | AAA        |
| `text-primary` on `surface`           | ≥ 12:1  | AAA        |
| `accent` on `background`             | ≥ 4.8:1 | AA         |
| `accent-foreground` on `accent`      | ≥ 5.5:1 | AA+        |
| `text-muted` on `background`         | ≥ 4.6:1 | AA         |
| `sage-600` on `sage-500/10` bg       | ≥ 6:1   | AA         |
| `amber-600` on `amber-500/10` bg     | ≥ 5.5:1 | AA         |
| `sienna-600` on `sienna-500/10` bg   | ≥ 6:1   | AA         |
| **Tabular numbers** (currency)        | ≥ 7:1   | AAA target |

---

## 3. Typography

### 3a. Type Families

| Role           | Family               | Source       | Fallback                  |
|----------------|----------------------|--------------|---------------------------|
| Display/Heading| **DM Serif Display** | Google Fonts | Georgia, serif            |
| Body/UI        | **DM Sans**          | Google Fonts | system-ui, sans-serif     |
| Numbers/Mono   | **DM Mono**          | Google Fonts | "Courier New", monospace  |

**Rationale:** The DM family was designed as a harmonious typographic system. DM Serif Display
brings editorial warmth to headlines while DM Sans provides clean, legible body text. DM Mono
ensures perfectly tabular, zero-ambiguity number rendering — critical for currency comparisons.

### 3b. Type Scale

| Token    | rem     | px (16-base) | line-height | Weight | Usage                                   |
|----------|---------|--------------|-------------|--------|-----------------------------------------|
| `text-xs`  | 0.6875 | 11           | 1.6         | 400    | Captions, timestamps, badge labels      |
| `text-sm`  | 0.8125 | 13           | 1.55        | 400    | Secondary labels, table cells           |
| `text-base`| 1.0    | 16           | 1.5         | 400    | Body text, list items                   |
| `text-md`  | 1.0625 | 17           | 1.45        | 500    | Input values, primary labels            |
| `text-lg`  | 1.1875 | 19           | 1.4         | 500    | Section headings, card titles           |
| `text-xl`  | 1.375  | 22           | 1.35        | 600    | KPI values (secondary)                  |
| `text-2xl` | 1.625  | 26           | 1.25        | 600    | KPI primary values, amount totals       |
| `text-3xl` | 2.0    | 32           | 1.15        | 700    | Hero balance figure (DM Serif Display)  |
| `text-4xl` | 2.5    | 40           | 1.1         | 700    | Oversized display numbers               |

### 3c. Tabular Figures

**Critical for currency display.** Ensure `font-feature-settings: "tnum" 1` on all elements
displaying monetary amounts. This prevents column-jumping when digits change (e.g. live updates,
pacing bar).

Apply globally via:
```css
body { font-feature-settings: "tnum"; }
```

Or per-element using the Tailwind utility `tabular-nums`.

### 3d. Italian Accent Rendering

All four major fonts (DM Serif Display, DM Sans, DM Mono) include full Latin Extended character
sets covering Italian accented vowels: à è é ì ò ù. No substitution glyphs or tofu expected.

### 3e. Number Format Contract

All monetary values must be rendered as `€ 1.234,56`:
- Euro sign followed by non-breaking space (` `)
- Thousands separator: period (`.`)
- Decimal separator: comma (`,`)
- Always 2 decimal places
- Rendered in DM Mono with `tabular-nums` feature active
- Minimum touch target if interactive: 44 px height

---

## 4. Spacing

**Base grid: 4 px.** Composition favours multiples of 8 px for most layout decisions; 4 px used
for tight internal padding and fine-grained adjustments.

| Token       | px  | rem    | Use                                            |
|-------------|-----|--------|------------------------------------------------|
| `spacing-0` | 0   | 0      |                                                |
| `spacing-1` | 4   | 0.25   | Icon-to-label gap, badge inner padding         |
| `spacing-2` | 8   | 0.5    | Tight internal padding, chip gaps              |
| `spacing-3` | 12  | 0.75   | Input vertical padding, small card inner gap   |
| `spacing-4` | 16  | 1.0    | Default horizontal screen padding              |
| `spacing-5` | 20  | 1.25   | Card inner padding (mobile)                    |
| `spacing-6` | 24  | 1.5    | Section gap, card gap in list                  |
| `spacing-8` | 32  | 2.0    | Section top/bottom padding                     |
| `spacing-10`| 40  | 2.5    | Large section gap                              |
| `spacing-12`| 48  | 3.0    | Page-level vertical rhythm                     |
| `spacing-16`| 64  | 4.0    | Hero/header vertical padding                   |
| `spacing-20`| 80  | 5.0    | Bottom safe-area padding (FAB clearance)       |

**Screen-edge gutter:** 16 px (1 rem) on ≤ 639 px; 24 px on ≥ 640 px; 32 px on ≥ 1024 px.

---

## 5. Radii, Borders, Shadows

### Radii

| Token         | Value  | px  | Use                                          |
|---------------|--------|-----|----------------------------------------------|
| `radius-none` | 0      | 0   | Sharp rules, dividers                        |
| `radius-sm`   | 0.25rem| 4   | Badges, chips, small tags                    |
| `radius-md`   | 0.5rem | 8   | Inputs, buttons, small cards                 |
| `radius-lg`   | 0.75rem| 12  | Standard cards, KPI cards                    |
| `radius-xl`   | 1rem   | 16  | Large cards, category panels                 |
| `radius-2xl`  | 1.5rem | 24  | Bottom sheets, dialog                        |
| `radius-full` | 9999px | —   | Pills, FAB, avatar                           |

### Borders

- Default border: `1px solid` using `--border` token
- Input focus border: `2px solid` accent, no outline (custom focus ring instead)
- Divider: `1px solid border-muted` — use `<hr>` or a full-width `border-t`
- Progress bar track: `1px solid border-muted`, radius-full inner track

### Shadows

| Token            | Value                                      | Use                        |
|------------------|--------------------------------------------|----------------------------|
| `shadow-none`    | none                                       | Flat cards on bg           |
| `shadow-xs`      | `0 1px 2px oklch(0 0 0 / 6%)`             | Subtle lift (button)       |
| `shadow-sm`      | `0 1px 4px oklch(0 0 0 / 8%)`             | Card on page background    |
| `shadow-md`      | `0 4px 12px oklch(0 0 0 / 10%)`           | Floating card, sheet       |
| `shadow-lg`      | `0 8px 24px oklch(0 0 0 / 12%)`           | Dialog, modal              |
| `shadow-fab`     | `0 4px 16px oklch(0 0 0 / 20%)`           | FAB button                 |

Avoid box-shadow on progress bars and badges — they add visual noise on currency-dense screens.

---

## 6. Motion

**Philosophy:** Motion must be *purposeful* and *fast*. This is a daily-use tool on a phone;
animations that feel "cute" on first use become friction after 100 uses. Prioritise immediate
feedback over elaborate transitions.

### Durations

| Token          | ms  | Use                                     |
|----------------|-----|-----------------------------------------|
| `duration-fast`| 100 | Button press, checkbox toggle           |
| `duration-base`| 180 | Default transition (color, opacity)     |
| `duration-slow`| 280 | Page slide, bottom-sheet entry          |
| `duration-lazy`| 400 | Progress bar fill on load              |

### Easings

| Token            | Value                          | Use                          |
|------------------|--------------------------------|------------------------------|
| `ease-default`   | `cubic-bezier(0.2,0,0,1)`     | Most transitions             |
| `ease-spring`    | `cubic-bezier(0.34,1.56,0.64,1)` | FAB appearance, sheet   |
| `ease-in`        | `cubic-bezier(0.4,0,1,1)`     | Exit transitions             |
| `ease-out`       | `cubic-bezier(0,0,0.2,1)`     | Entry transitions            |

### Rules

- `@media (prefers-reduced-motion: reduce)` must disable all transitions and animations
- Progress bar fills animate once on mount (duration-lazy, ease-out)
- Bottom sheets enter from bottom (translate-y, duration-slow, ease-out)
- KPI card values do **not** count-up animate — legibility over spectacle
- No skeleton loaders that pulse aggressively — use a subtle opacity fade (0.5→1)

---

## 7. Components — Design Tokens

> All components must meet **minimum 44 × 44 px tap target**. Where visual size is smaller,
> extend the touch area with padding or pseudo-element.

### Button

| Variant       | Background      | Text               | Border          | Hover                    |
|---------------|----------------|--------------------|-----------------|--------------------------|
| `primary`     | `accent`       | `accent-foreground`| none            | bg `accent-hover`        |
| `secondary`   | `surface`      | `text-primary`     | `border` 1px    | bg `clay-200`            |
| `ghost`       | transparent    | `text-primary`     | none            | bg `clay-200`            |
| `destructive` | `danger`       | white              | none            | bg `sienna-600`          |

- Height: 44 px minimum (use `h-11` / 2.75 rem)
- Padding: 0 20 px horizontal; icon-only: 44 × 44 px
- Radius: `radius-md` (8 px)
- Font: DM Sans 500, `text-base`
- Transition: bg/color `duration-fast ease-default`
- Active (pressed): scale(0.97) — use `active:scale-[0.97]`
- Disabled: 40% opacity, pointer-events-none

### Input

- Height: 44 px minimum
- Padding: 0 12 px
- Radius: `radius-md`
- Border: 1px `border` → focus: 2px `accent` (no default browser outline)
- Font: DM Sans, `text-base`; for currency inputs: DM Mono `tabular-nums`
- Placeholder: `text-muted`
- Error state: border `danger`, helper text in `danger` below

### Select

- Same height and radius as Input
- Arrow icon: `ChevronDown` from lucide-react, 16 px, `text-muted`
- Uses Base UI `<Select>` primitive

### Date Input

- Same as Input but with a trailing `CalendarDays` icon (16 px, `text-muted`)
- Format: `DD/MM/YYYY` (Italian locale)
- Native date picker on mobile; custom picker on desktop (Phase 2)

### Card — KPI

```
┌─────────────────────────────┐
│  Label (text-sm, muted)     │
│  € 1.234,56 (text-2xl mono) │
│  Δ Desc (text-xs, state)    │
└─────────────────────────────┘
```
- Background: `surface`
- Border: 1px `border`
- Radius: `radius-lg`
- Padding: 16 px
- Shadow: `shadow-sm`
- Number: DM Mono, `text-2xl`, `tabular-nums`
- State indicator: left border 3px in state color

### Card — Category

```
┌─────────────────────────────┐
│  Icon  Name      € 342,00   │
│  [████████░░░░░░] 68%        │
│  speso € 342 / prev. € 500  │
└─────────────────────────────┘
```
- Background: `surface`
- Border: 1px `border` (state-tinted when non-neutral)
- Radius: `radius-lg`
- Padding: 16 px
- Progress bar height: 6 px, `radius-full`, track `clay-300`
- Progress fill: state color (sage/amber/sienna)
- Percentage text: `text-xs`, `tabular-nums`

### Progress Bar

- Track: `clay-300`, height 6 px (default) / 8 px (prominent), `radius-full`
- Fill: state color, `radius-full`, `duration-lazy ease-out` on mount
- Overflow cap: fill colour `sienna-500`, visual width capped at 100% but bar turns red
- Accessible: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`

### Pacing Bar

Shows how much time has elapsed in the current pay cycle vs. spend.

```
Cycle: [████████████░░░░░░░░] 60% di 30 giorni
Spesa: [██████░░░░░░░░░░░░░░] 42% del budget
```
- Two stacked bars, each 8 px height
- Labels: `text-xs`, `text-muted`
- "Spesa" bar: state colour based on whether spending outpaces time
- Pacing warning: if `spesa% > tempo% + 10%` → state = over-budget

### Badge

- Padding: 2 px 8 px
- Height: 20 px
- Radius: `radius-sm`
- Font: DM Sans 500, `text-xs`
- Variants match semantic states (success/warning/danger/neutral)
- Background: state color at 15% opacity; text: state color (dark variant)

### FAB (Floating Action Button)

- Size: 56 × 56 px (visual), tap target identical
- Radius: `radius-full`
- Background: `accent`
- Icon: `Plus` from lucide-react, 24 px, white
- Shadow: `shadow-fab`
- Position: fixed, bottom `spacing-6 + safe-area-inset-bottom`, right `spacing-4`
- Entry animation: scale 0→1 with `ease-spring`, `duration-slow`
- Active: scale(0.92)

### Sheet (Bottom Sheet)

- Slides up from bottom, covers ~85 vh on mobile
- Backdrop: `oklch(0 0 0 / 40%)`, blur(4px) — subtle, not black-out
- Radius: `radius-2xl` top corners only
- Background: `surface`
- Handle: 4 × 32 px `clay-400`, centered, `radius-full`
- Entry: translateY(100%) → translateY(0), `duration-slow ease-out`
- Exit: translateY(0) → translateY(100%), `duration-base ease-in`
- Safe area: `padding-bottom: env(safe-area-inset-bottom)`

### Dialog

- Max-width: 380 px on mobile (fills most of 375 px viewport with 16 px gutter)
- Background: `surface-elevated`
- Shadow: `shadow-lg`
- Radius: `radius-xl`
- Entry: fade + scale(0.95→1), `duration-base ease-out`

---

## 8. Layout

### Breakpoints

| Name | Min-width | Gutter | Max container |
|------|-----------|--------|---------------|
| `base` | 0       | 16 px  | 100%          |
| `sm` | 640 px    | 24 px  | 640 px        |
| `md` | 768 px    | 32 px  | 768 px        |
| `lg` | 1024 px   | 40 px  | 1024 px       |
| `xl` | 1280 px   | 40 px  | 1024 px (centered) |

**Primary design target:** 375 px portrait (iPhone SE / older Android). All layouts must be
usable at this width without horizontal scroll.

### App Structure (mobile)

```
┌──────────────────────────────┐
│  Header (sticky, 56 px)      │  ← page title + avatar
├──────────────────────────────┤
│                              │
│  Content (scrollable)        │
│                              │
│    KPI cards (2-col grid)    │
│    Pacing bar                │
│    Category list             │
│    Transaction list          │
│                              │
├──────────────────────────────┤
│  Bottom nav (56 px + safe)   │  ← Home / Aggiungi / Storico
└──────────────────────────────┘
│  FAB (fixed, overlays nav)   │
```

### Safe Areas

Always consume `env(safe-area-inset-*)` for:
- Bottom nav: `padding-bottom: calc(env(safe-area-inset-bottom) + 8px)`
- FAB: `bottom: calc(env(safe-area-inset-bottom) + 72px)`
- Sheet: `padding-bottom: env(safe-area-inset-bottom)`

### KPI Card Grid

```css
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 12px; /* spacing-3 */
```

On `md+`: up to 4 columns.

---

## 9. Iconography

**Library:** `lucide-react` — consistent stroke-width 1.5, size 20 px (UI) / 24 px (FAB/hero).

| Context                | Icon               | Size |
|------------------------|--------------------|------|
| Add transaction        | `Plus`             | 24   |
| Home / Dashboard       | `LayoutDashboard`  | 20   |
| Transaction history    | `History`          | 20   |
| Categories             | `Tags`             | 20   |
| Settings               | `Settings`         | 20   |
| Delete                 | `Trash2`           | 16   |
| Edit                   | `Pencil`           | 16   |
| Calendar / date input  | `CalendarDays`     | 16   |
| Cycle indicator        | `RefreshCw`        | 16   |
| Amount / money         | `Banknote`         | 20   |
| Under-budget state     | `TrendingDown`     | 16   |
| Over-budget state      | `TrendingUp`       | 16   |
| Info                   | `Info`             | 16   |
| Close / dismiss        | `X`                | 20   |
| Chevron (select/nav)   | `ChevronDown`      | 16   |
| Back                   | `ChevronLeft`      | 20   |
| User / profile         | `User`             | 20   |
| Logout                 | `LogOut`           | 16   |
| Search                 | `Search`           | 20   |

**Rules:**
- Never mix icon libraries
- Icons are decorative unless they carry unique meaning — always pair with a visible label on
  navigation items
- `aria-hidden="true"` on all decorative icons
- `aria-label` on icon-only buttons

---

## 10. Accessibility

### Focus Management

- Custom focus ring: `outline: 2px solid var(--terra-500); outline-offset: 2px` — replaces
  browser default
- Focus must be visible on all interactive elements including custom Base UI primitives
- Focus order must follow reading order (top-to-bottom, left-to-right)
- Bottom sheet: trap focus while open, return to trigger on close

### Motion Reduction

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This is included in the `@layer base` block. Do not add individual overrides — rely on the
global rule.

### Color-Blind Safety

State colours (sage/amber/sienna) are distinguishable in deuteranopia/protanopia simulations
because they vary in luminance (light sage vs dark sienna), not just hue. Always pair colour
state with an icon (`TrendingDown`, `TrendingUp`) and a text label.

### ARIA

- `role="progressbar"` + `aria-valuenow` + `aria-label` on all bars
- `role="status"` on KPI card values that update dynamically
- `aria-live="polite"` on transaction list when new items are added
- `aria-expanded` on collapsible category rows

### Color Scheme Declaration

```html
<meta name="color-scheme" content="light" />
```

In `<head>` of `layout.tsx`. Prevents OS-level dark mode overriding backgrounds before CSS loads.

---

## 11. Tailwind v4 @theme block

Paste this block into `src/app/globals.css`, **replacing or extending** the existing `@theme inline { ... }` block. The `inline` keyword is used here to keep values resolving through CSS variables — do not remove it.

```css
@theme inline {
  /* ─── Font Families ─── */
  --font-sans: "DM Sans", system-ui, sans-serif;
  --font-mono: "DM Mono", "Courier New", monospace;
  --font-display: "DM Serif Display", Georgia, serif;
  --font-heading: "DM Serif Display", Georgia, serif;

  /* ─── Brand / Accent Colors ─── */
  --color-terra-400: oklch(0.672 0.120 40);
  --color-terra-500: oklch(0.581 0.133 38);
  --color-terra-600: oklch(0.495 0.130 36);
  --color-terra-700: oklch(0.398 0.120 33);

  /* ─── Neutral / Clay Scale ─── */
  --color-clay-50:  oklch(0.974 0.010 60);
  --color-clay-100: oklch(0.963 0.014 60);
  --color-clay-200: oklch(0.924 0.022 60);
  --color-clay-300: oklch(0.866 0.032 60);
  --color-clay-400: oklch(0.763 0.042 60);
  --color-clay-500: oklch(0.648 0.052 60);
  --color-clay-600: oklch(0.524 0.056 60);
  --color-clay-700: oklch(0.414 0.055 55);
  --color-clay-800: oklch(0.299 0.048 50);
  --color-clay-900: oklch(0.187 0.038 45);

  /* ─── Semantic State Colors ─── */
  --color-sage-400: oklch(0.665 0.070 150);
  --color-sage-500: oklch(0.572 0.085 150);
  --color-sage-600: oklch(0.470 0.088 150);

  --color-budget-amber-400: oklch(0.792 0.135 75);
  --color-budget-amber-500: oklch(0.706 0.150 72);
  --color-budget-amber-600: oklch(0.598 0.145 70);

  --color-sienna-400: oklch(0.665 0.128 32);
  --color-sienna-500: oklch(0.557 0.148 30);
  --color-sienna-600: oklch(0.454 0.140 28);

  --color-slate-400: oklch(0.663 0.040 245);
  --color-slate-500: oklch(0.548 0.054 248);

  /* ─── Semantic Aliases (map to CSS vars from :root) ─── */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-elevated: var(--surface-elevated);
  --color-border: var(--border);
  --color-border-muted: var(--border-muted);
  --color-text-primary: var(--text-primary);
  --color-text-muted: var(--text-muted);
  --color-text-inverse: var(--text-inverse);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-foreground: var(--accent-foreground);

  /* Budget state aliases */
  --color-under-budget: var(--under-budget);
  --color-under-budget-bg: var(--under-budget-bg);
  --color-under-budget-border: var(--under-budget-border);
  --color-at-budget: var(--at-budget);
  --color-at-budget-bg: var(--at-budget-bg);
  --color-at-budget-border: var(--at-budget-border);
  --color-over-budget: var(--over-budget);
  --color-over-budget-bg: var(--over-budget-bg);
  --color-over-budget-border: var(--over-budget-border);

  /* ─── Shadcn token pass-throughs (keep from existing block) ─── */
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-destructive: var(--destructive);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* ─── Border Radius ─── */
  --radius-none: 0px;
  --radius-sm:   0.25rem;
  --radius-md:   0.5rem;
  --radius-lg:   0.75rem;
  --radius-xl:   1rem;
  --radius-2xl:  1.5rem;
  --radius-full: 9999px;

  /* ─── Shadows ─── */
  --shadow-xs:  0 1px 2px oklch(0 0 0 / 6%);
  --shadow-sm:  0 1px 4px oklch(0 0 0 / 8%);
  --shadow-md:  0 4px 12px oklch(0 0 0 / 10%);
  --shadow-lg:  0 8px 24px oklch(0 0 0 / 12%);
  --shadow-fab: 0 4px 16px oklch(0 0 0 / 20%);

  /* ─── Motion ─── */
  --duration-fast: 100ms;
  --duration-base: 180ms;
  --duration-slow: 280ms;
  --duration-lazy: 400ms;

  --ease-default: cubic-bezier(0.2, 0, 0, 1);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);

  /* ─── Font Size Scale ─── */
  --text-xs:   0.6875rem;
  --text-sm:   0.8125rem;
  --text-base: 1rem;
  --text-md:   1.0625rem;
  --text-lg:   1.1875rem;
  --text-xl:   1.375rem;
  --text-2xl:  1.625rem;
  --text-3xl:  2rem;
  --text-4xl:  2.5rem;
}
```

---

## 12. Additional CSS variables (:root / .dark)

Paste the budget-specific semantic tokens inside the existing `:root` block in `globals.css`.
These complement the shadcn-generated variables already there — do not remove those.

```css
/* ─── Budget: Page & Surface ─── */
--background: oklch(0.963 0.014 60);        /* clay-100 — warm ivory page */
--surface: oklch(1 0 0);                    /* white card surface */
--surface-elevated: oklch(0.974 0.010 60);  /* clay-50 elevated panel */

/* ─── Budget: Text ─── */
--text-primary: oklch(0.187 0.038 45);      /* clay-900 */
--text-muted: oklch(0.648 0.052 60);        /* clay-500 */
--text-inverse: oklch(0.974 0.010 60);      /* clay-50 */

/* ─── Budget: Borders ─── */
--border-muted: oklch(0.924 0.022 60);      /* clay-200 */

/* ─── Budget: Accent (Terracotta) ─── */
--accent: oklch(0.581 0.133 38);            /* terra-500 */
--accent-hover: oklch(0.495 0.130 36);      /* terra-600 */
--accent-foreground: oklch(1 0 0);          /* white */

/* ─── Budget: State — Under-budget (Sage) ─── */
--under-budget: oklch(0.572 0.085 150);     /* sage-500 */
--under-budget-bg: oklch(0.572 0.085 150 / 10%);
--under-budget-border: oklch(0.572 0.085 150 / 25%);
--under-budget-text: oklch(0.470 0.088 150); /* sage-600 */

/* ─── Budget: State — At-budget (Amber) ─── */
--at-budget: oklch(0.706 0.150 72);         /* budget-amber-500 */
--at-budget-bg: oklch(0.706 0.150 72 / 10%);
--at-budget-border: oklch(0.706 0.150 72 / 25%);
--at-budget-text: oklch(0.598 0.145 70);    /* budget-amber-600 */

/* ─── Budget: State — Over-budget (Sienna) ─── */
--over-budget: oklch(0.557 0.148 30);       /* sienna-500 */
--over-budget-bg: oklch(0.557 0.148 30 / 10%);
--over-budget-border: oklch(0.557 0.148 30 / 25%);
--over-budget-text: oklch(0.454 0.140 28);  /* sienna-600 */

/* ─── Budget: shadcn token overrides ─── */
/* Override shadcn's monochrome primaries with our brand accent */
--primary: oklch(0.581 0.133 38);           /* terra-500 */
--primary-foreground: oklch(1 0 0);         /* white */
--ring: oklch(0.581 0.133 38);              /* focus ring = accent */

/* Card uses our surface token */
--card: oklch(1 0 0);
--card-foreground: oklch(0.187 0.038 45);

/* Muted uses clay scale */
--muted: oklch(0.924 0.022 60);             /* clay-200 */
--muted-foreground: oklch(0.648 0.052 60);  /* clay-500 */
--border: oklch(0.866 0.032 60);            /* clay-300 */
--input: oklch(0.866 0.032 60);             /* clay-300 */

/* Destructive stays red-adjacent — sienna is close enough */
--destructive: oklch(0.557 0.148 30);       /* sienna-500 */
```

For the `.dark` block (v1: leave the existing shadcn dark defaults in place — they won't be
activated since we don't toggle the `.dark` class in v1. When dark mode is added in a future
phase, replace with these intent values):

```css
/* .dark — FUTURE USE — do not activate in v1 */
/* --background: oklch(0.145 0.010 45);        dark earth */
/* --surface: oklch(0.205 0.012 45);           dark card */
/* --surface-elevated: oklch(0.230 0.012 45);  */
/* --text-primary: oklch(0.963 0.014 60);      clay-100 on dark */
/* --text-muted: oklch(0.648 0.052 60);        clay-500 */
/* --accent: oklch(0.672 0.120 40);            terra-400 (lighter on dark) */
/* ... (full dark palette to be defined in Phase N) */
```

---

## 13. Examples

### Currency display (tabular numbers)

```tsx
// All monetary values rendered through lib/format/eur.ts
// The formatEur() function returns "€ 1.234,56" with non-breaking space
// Render with DM Mono font-feature-settings: "tnum"

<span className="font-mono tabular-nums text-2xl">
  {formatEur(amount)}
</span>
```

### KPI Card

```tsx
<div className="rounded-lg border bg-[var(--surface)] p-4 shadow-sm">
  <p className="text-sm text-[var(--text-muted)]">Rimasto</p>
  <p className="font-mono tabular-nums text-2xl text-[var(--text-primary)]">
    € 342,00
  </p>
  <div className="mt-1 flex items-center gap-1 text-xs text-[var(--under-budget-text)]">
    <TrendingDown size={12} aria-hidden="true" />
    <span>sotto budget</span>
  </div>
</div>
```

### Progress Bar (accessible)

```tsx
<div
  role="progressbar"
  aria-valuenow={68}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Alimentari: 68% del budget"
  className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-muted)]"
>
  <div
    className="h-full rounded-full bg-[var(--under-budget)] transition-[width]"
    style={{ width: "68%", transitionDuration: "var(--duration-lazy)", transitionTimingFunction: "var(--ease-out)" }}
  />
</div>
```

### State-aware Category Card

```tsx
// state: "under" | "at" | "over" | "neutral"
const stateStyles = {
  under:   { bg: "var(--under-budget-bg)", border: "var(--under-budget-border)", fill: "var(--under-budget)" },
  at:      { bg: "var(--at-budget-bg)",    border: "var(--at-budget-border)",    fill: "var(--at-budget)" },
  over:    { bg: "var(--over-budget-bg)",  border: "var(--over-budget-border)",  fill: "var(--over-budget)" },
  neutral: { bg: "var(--surface)",         border: "var(--border)",              fill: "var(--color-clay-400)" },
};
```

### Font loading in layout.tsx

```tsx
import { DM_Sans, DM_Mono, DM_Serif_Display } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
```

---

*Design System version 1.0 — Budget MVP — April 2026*
*Fonts: DM Serif Display · DM Sans · DM Mono (Google Fonts)*
*Brand accent: Terracotta `#C1603A` (oklch 0.581 0.133 38)*
