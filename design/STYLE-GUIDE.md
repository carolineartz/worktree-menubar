# PR Menubar — visual language

Reference for building sibling apps that share this design system. Written to be pasted/attached into a design session as context: follow these tokens and recipes rather than inventing new ones.

## Feel

macOS-native menubar utility: a vibrancy (blurred, tinted) panel, quiet grays, small type, dense but airy rows, color used *only* to convey status. Light + dark follow the system. Nothing decorative — every color, weight, and badge encodes state.

## Typography

Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` · mono: `ui-monospace, Menlo, monospace`.

Scale (px/weight): **13/500** row titles · **12** tabs, menu items, check names · **11.5** meta lines · **11/500** pills, buttons, footer · **10.5/600 mono** chips & badges (uppercase) · **10/600** counts & section micro-labels (letter-spacing .06–.08em) · **11/700** group headers (letter-spacing .08em, colored).

## Radii

14 panel · 8 rows & inset panels · 7 segmented-control container · 6 buttons · 5 chips/segments · 99 pills.

## Color tokens

Panel background = native vibrancy blur **plus** the `panel` tint painted over it. All other colors are translucent whites (dark) / translucent blacks + fixed grays (light) so they sit on any wallpaper.

| Token | Dark | Light |
|---|---|---|
| panel | rgba(30,30,36,.68) | rgba(249,249,251,.78) |
| panel border | rgba(255,255,255,.14) | rgba(0,0,0,.09) |
| txt / txt2 / txt3 / faint | #fff / 65% / 50% / 35% white | #1d1d1f / #6e6e73 / #86868b / #a1a1a6 |
| hairline | rgba(255,255,255,.1) | rgba(0,0,0,.07) |
| seg / segact | rgba(255,255,255,.09) / .24 | rgba(0,0,0,.06) / #fff |
| hover / active-row bg | rgba(255,255,255,.07) / .08 | rgba(0,0,0,.045) / .055 |
| inset bg / border | rgba(255,255,255,.05) / .12 | rgba(0,0,0,.03) / .08 |
| red dot / text / bg | #ff453a / #ff9d97 / rgba(255,69,58,.18) | #ff453a / #c2261f / rgba(255,59,48,.1) |
| green dot / text / bg | #30d158 / #63e884 / rgba(48,209,88,.18) | #34c759 / #248a3d / rgba(52,199,89,.14) |
| amber dot / text / bg | #ffd60a / #ffd60a / rgba(255,214,10,.15) | #ff9f0a / #b45309 / rgba(255,159,10,.15) |
| blue text / bg | #9ecbff / rgba(10,132,255,.25) | #0a58ce / rgba(10,132,255,.12) |
| purple text / bg | #d7b8f7 / rgba(191,90,242,.22) | #7c3aed / rgba(191,90,242,.12) |
| neutral text / bg | 60% white / 10% white | #6e6e73 / rgba(0,0,0,.06) |
| button border / text | rgba(255,255,255,.16) / .7 | rgba(0,0,0,.14) / #515154 |
| menu panel | rgba(50,50,56,.97) | rgba(255,255,255,.98) |

Accents: star #ffd60a · focus/selection #0a84ff · avatar palette: viewer #3c7dd6, others hashed onto #7c5cd6 · #c97a35 · #38995c · #cf5878 (white initials).

## Component recipes

- **Segmented tab bar** — container: `seg` bg, radius 7, padding 2; segments flex:1, 12px, 4px vertical padding, radius 5; active gets `segact` bg + 500 weight + `0 1px 2px` shadow; each segment carries a 10px mono count at 60% opacity.
- **List row** — flex, gap 10, padding 9px 10px, radius 8; hover = `hov`; leading 8px status dot (red gets a 3px `redbg` halo ring; queued = hollow 2px border); title 13/500 single-line ellipsis; meta line 11.5 `txt3` underneath; trailing: chip/badge → pill → 20px avatar → 12px chevron (rotates 180° when expanded). De-emphasized rows render at 75% opacity; snoozed at 55%.
- **Chips & badges** — 10.5/600 mono uppercase, padding 4px 7px, radius 5, colored `bg`+`text` token pair per status (red/green/amber/blue/purple/neutral).
- **Pills** — 11/500, padding 3px 7px, radius 99, same token pairs.
- **Inset panel** (expanded detail) — margin 4px 10px 8px 28px, `inset` bg, 1px `insetb` border, radius 8; internal rows 7px 10px with 12px status icons; footer strip separated by an `insetb` border holding 11px bordered buttons (radius 6) and 22px square icon-buttons.
- **Section headers** — 11/700 letter-spaced colored label + mono count chip + hairline rule filling the remaining width; ~14px top padding between groups.
- **Bottom bars** — hairline top border, padding 8px 12–14px; 10px/600 letter-spaced faint micro-label (e.g. "SHOWING", "FILTER") + pills/inputs.
- **Menus** — `menupanel` bg, 1px panel border, radius 8, shadow `0 8px 30px rgba(0,0,0,.3)`, padding 4; items 12px, padding 6px 9px, radius 5, hover `hov`.
- **Toast** — bottom-center, rgba(20,20,24,.92), white 12px, padding 6px 12px, radius 8, ~1.9s.
- **Footer** — 6px status dot + 11px `txt3` status text · right side: mono shortcut hints in `faint`, `·` separators, 11/500 actions in `txt2` (hover → `txt`).
- **Empty states** — centered 12.5px `txt3` sentence, generous padding.
- **Identity tinting** — entity names (e.g. repos) get a stable hue: `color-mix(in oklab, var(--txt3) 45%, hsl(HASH_HUE 75% 58%))` so tint never breaks text contrast.

## Interaction idioms

Hover brightens text toward `txt` or lays `hov` behind rows. Click = primary action; ⌘-click = open externally; controls inside rows stopPropagation. One expansion at a time. No focus rings (mouse-driven surface). Windows auto-size to content. Respect Reduce Transparency with an opaque `.98` panel.

## App icon family

Squircle (Big Sur grid: 824/1024, radius 185), gradient background, white glyph at stroke ~1.55/16 scale, one accent-colored node. PR Menubar uses indigo→violet `#5B5BE8→#7C3AED` with aqua `#2CE8C5`; siblings should pick a different gradient but keep the construction.
