# Handoff: Worktree Menubar — popover + settings UI

## Overview

macOS menubar app (Electron) popover that answers: **which branch is running on which localhost, is it up, and let me open the right one.** For each git worktree it shows branch ↔ port ↔ running-state, with actions to open the dev URL, open in editor, start/stop the Docker stack, and tear it down.

This design phase produced the hi-fi popover UI. The data layer and actions are already proven by an existing SwiftBar plugin (`worktree-menubar.10s.py`) — see the original product brief; this bundle covers only the UI.

## About the Design Files

`Worktree Menubar.dc.html` is a **design reference created in HTML** — a prototype showing intended look and behavior, not production code to copy directly. Recreate it in the target codebase: the **pr-menubar Electron scaffold** (Tray + frameless vibrancy `BrowserWindow`, electron-vite + React + TS), reusing that project's patterns and components wherever they exist. `STYLE-GUIDE.md` (included) is the shared visual language of pr-menubar; the popover must follow those tokens exactly — this design does.

The demo data (repos `meadow`/`lantern`, MDW-/LTN- tickets) is fictional placeholder data.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, and interactions are final. Recreate pixel-perfectly. All color values below reference the token table in `STYLE-GUIDE.md` (dark/light pairs); the prototype's `<style>` block defines them as CSS variables per `[data-th="dark"|"light"]` — lift them verbatim.

## Screens / Views

### 1. Popover (380px wide)

Vibrancy panel: native blur + `panel` tint, 1px `panelb` border, radius 14, padding `2px 6px 0`. (In the prototype vibrancy is simulated with `backdrop-filter: blur(28px) saturate(1.4)` over a desktop gradient; in Electron use real vibrancy + the tint.)

**Repo section header** — padding `14px 10px 6px`, flex gap 8:
- Repo name: 11px/700, uppercase, letter-spacing .08em, identity-tinted: `color-mix(in oklab, var(--txt3) 45%, hsl(HUE 75% 58%))` where HUE is a stable hash of the repo name (demo: meadow=210, lantern=28).
- Count chip `2/3` (running/total for that repo): mono 10px/600, `neubg`/`neutx`, padding 2px 6px, radius 5.
- Hairline rule (`hair`, 1px) filling remaining width.

**Worktree row** — flex, gap 10, padding `9px 10px`, radius 8, cursor pointer; hover/expanded background `hov`; stopped rows at opacity .75. Left → right:

1. **Status dot** 8px, radius 99:
   - running: solid `green`
   - starting/stopping: solid `amber`, pulsing (opacity 1→.35→1, 1.1s ease-in-out infinite)
   - stopped: transparent with 2px `faint` border (hollow)
2. **Port badge** (the key scanning affordance — aligned column): mono 12px/600, letter-spacing .02em, padding 4px 7px, radius 6, min-width 52px, centered, text = port number only (`9002`):
   - running: `bluebg` bg / `bluetx` text
   - starting/stopping: `amberbg` / `ambertx`
   - stopped: `neubg` / `neutx`
3. **Text block** (flex:1, min-width 0):
   - Branch (hero): 13px/500 `txt`, single-line ellipsis. e.g. `feature/MDW-214-checkout-totals`
   - Meta: 11.5px `txt3`, ticket label only, e.g. `MDW-214`
4. **Trailing** (state-dependent):
   - starting/stopping: amber pill `starting…`/`stopping…` (11px/500, `amberbg`/`ambertx`, padding 3px 7px, radius 99)
   - stopped (and not expanded): **▶ Start** button — 11px/500 `greentx` text, 1px `btnb` border, radius 6, padding 3px 9px; hover: `greentx` border + `greenbg` bg
   - always: chevron button 20×20 (12px chevron-down stroke icon), `faint` (→ `txt2` on row hover/expand), rotates 180° when expanded, .15s
   - **No other buttons on the row.** Editor/Stop/Tear down are deliberately NOT hover-revealed (too easy to mis-click next to the row's click target); they live only in the expanded panel.

**Row interactions**
- Click running row → open dev URL in browser (primary action). Prototype shows a toast `Opened localhost:9002 ↗`.
- Click stopped row → toggle expand (nothing to open).
- Chevron click → toggle expand (one expansion at a time; stopPropagation).
- ⌘-click convention per style guide if applicable.

**Expanded inset panel** — margin `4px 10px 8px 28px`, `inset` bg, 1px `insetb` border, radius 8:
- Port chips row (padding `9px 10px 4px`, wrap, gap 6): FE chip (`bluebg`/`bluetx`) + one chip per extra port (`neubg`/`neutx`) — mono 10.5px/600 uppercase, padding 4px 7px, radius 5, white-space nowrap. Text: `FE 9002`, `API 3004`, `WS 8084`, `DB 5436`.
- Worktree path: mono 10.5px `faint`, single-line ellipsis, padding `4px 11px 9px`. e.g. `~/dev/meadow-worktrees/MDW-214`
- Footer strip (1px `insetb` top border, padding `7px 10px`, flex gap 6):
  - `↗ Open` · `Editor` · (`■ Stop` if running | `▶ Start` if stopped) — bordered buttons: 11px/500, 1px `btnb` border, `btntx` text, radius 6, padding 3px 9px. Hover: text→`txt`, border→`txt3`. Stop hovers red (`redtx`); Start is `greentx` and hovers `greenbg`.
  - Right-aligned: **Tear down** — borderless red text button (`redtx`, 11px/500, radius 6, hover bg `redbg`).

**Tear-down confirm (typed)** — clicking Tear down swaps the footer strip contents inline:
- An input (flex:1) with placeholder `type TEARDOWN`: mono 11px, letter-spacing .04em, `redtx` text on `redbg` bg, 1px `redtx` border, radius 6, padding 3px 8px, autofocused.
- `Tear down` button: **disabled** (faint text, `btnb` border, opacity .6, not-allowed cursor) until the input equals exactly `TEARDOWN`; then red (`redbg` bg, `redtx` border+text). Enter submits when valid; Esc cancels.
- `Cancel` bordered button.
- On confirm: runs `docker compose down -v` (removes containers + volumes, NOT the worktree/branch), stack shows stopped, toast confirms.

**Footer bar** — 1px `hair` top border, padding `8px 8px 10px`, flex gap 8:
- 6px status dot: `green` if ≥1 running · hollow (2px `faint` border) if 0 running · `amber` if Docker down.
- Status text 11px `txt3`, flex:1: `3 / 5 running · refreshed 8s ago` (live-ticking seconds; auto-refresh ~10s).
- Right: mono `⌘R` in `faint` · `·` separator · `Refresh` · `Settings` — 11px/500 `txt2`, hover `txt`.

**Empty state** (no dev-server worktrees): centered, padding 40px 28px — 12.5px `txt3` "No dev-server worktrees found." + 11.5px `faint` "Worktrees without a dev port in `.env` are skipped." (`.env` in mono).

**Config-missing state**: centered, padding 38px 28px — 13px/500 `txt2` "Set up Worktree Menubar" · 11.5px `txt3` explainer · mono chip `~/.config/worktree-menubar.json` (`neubg`/`neutx`, 10.5px, padding 4px 8px, radius 5) · bordered "Create config" button. Footer dot hollow, text "No config".

**Docker-not-running state**: list renders normally but every row reads stopped; footer dot `amber`, text "Docker not running — stacks shown as stopped".

**Toast** — bottom-center, `rgba(20,20,24,.92)` bg, white 12px, padding 6px 12px, radius 8, ~1.9s.

### 2. Settings window (480px wide)

Solid (non-vibrancy) window: `win` bg (`rgba(42,42,48,.98)` dark / `rgba(248,248,250,.98)` light), 1px `winb` border, radius 12. Matches pr-menubar's settings window style.

- **Title bar**: padding `12px 14px 10px` — traffic lights (12px circles: red `#ff5f57` closes; other two neutral in prototype) + title "Worktree Menubar Settings" 13px/600.
- **Body**: padding `8px 20px 20px`, sections stacked gap 20. Section headers 13px/600 `txt`; descriptions 11.5px `txt3`.
- **Repos**: list of repo roots as field-styled rows (`field` bg, 1px `fieldb` border, radius 8, padding 7px 11px; mono 12px path + trailing `×` remove) + add row (mono input placeholder `/path/to/repo` + bordered `Add` button).
- **Ports & URL**: label/input rows (label 12px `txt2` width 150; input mono 12px, `field` bg, `fieldb` border, radius 7, padding 6px 10px): Dev port env key `FE_PORT` · Extra port keys `API_PORT, WS_PORT, DB_PORT` · URL template `http://localhost:{port}/#/login` · Compose project key `COMPOSE_PROJECT_NAME`.
- **Editor**: Open in editor with `code` (input) + checkbox "Include the main checkout".
- **General**: Appearance segmented control System/Light/Dark (per style-guide recipe: `seg` container radius 7 padding 2; active segment `segact` + 500 weight + shadow) · "Refresh every [10] seconds" (52px right-aligned mono number input) · checkboxes "Show running count in the menu bar" (default on), "Launch at login" (default off). Checkbox accent `#0a84ff`.

## Interactions & Behavior

- Auto-refresh every ~10s + manual Refresh (⌘R); footer "refreshed Ns ago" ticks every second.
- Start: status → `starting` (amber pulse + pill) → `running` (~real duration of `docker compose up -d`); toast "MDW-214 is up".
- Stop: status → `stopping` → `stopped`; toast.
- Tear down: typed-confirm flow above; never removes the worktree/branch.
- One row expanded at a time; expanding a row cancels any pending confirm.
- All in-row controls `stopPropagation` from the row click.
- Dark/light follows system unless overridden in Settings (System/Light/Dark). Respect Reduce Transparency (opaque .98 panel).
- No focus rings (mouse-driven surface); windows auto-size to content.
- Tray icon shows running/total (e.g. `3/5`) when "Show running count" is enabled.

## State Management

- Per worktree: `status: 'running' | 'starting' | 'stopping' | 'stopped'` (derived live from `docker compose ls`; transitions optimistic while a command runs).
- UI state: `expandedId` (single), `confirmingTeardownId` + `confirmText`, `toast`, `view: popover | settings`, `secondsSinceRefresh`, `themeMode: system | light | dark`.
- Data per worktree: `id, label (ticket), branch, port (FE), extras [{key, port}], path, repo`.
- Scenarios to handle: normal · empty · config missing/parse error · Docker not running.

## Design Tokens

All in `STYLE-GUIDE.md` (dark/light table) — the prototype uses them as CSS variables. Key additions/uses here:
- Port badge: blue pair (running), amber pair (transition), neutral pair (stopped).
- Radii: 14 panel · 12 settings window · 8 rows/inset/field-rows · 7 inputs/segmented container · 6 buttons/port badge · 5 chips/segments · 99 dots/pills.
- Type: 13/500 branch · 12 settings labels/inputs · 11.5 meta · 11/500 buttons/footer · 11/700 section headers (.08em, uppercase) · 10.5/600 mono chips (uppercase) · 10/600 mono count chips · 12/600 mono port badge.
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`; mono `ui-monospace, Menlo, monospace`.

## Assets

- `assets/tray-icon-tree.svg` — the **tray icon glyph** (user-chosen): cloud-canopy tree with git-branch stubs inside. Ship as a macOS **template image** (monochrome, rendered at ~16pt with the running count, e.g. `3/5`, beside it) so the system inverts it for dark/light menubars. Source viewBox is 512×512; the path is solid fill.
- In the popover, the only vector is the 12px chevron-down (24×24 viewBox polyline `6 9 12 15 18 9`, stroke-width 2.5, round caps). Glyphs `▶ ■ ↗ ×` are text. App icon: follow the style guide's icon-family construction with a new gradient (not pr-menubar's indigo→violet).

## Files

- `Worktree Menubar.dc.html` — the interactive hi-fi prototype (popover + settings, dark/light, all scenario states). Open in a browser; the `<style>` block holds the exact token values. States can be forced via URL hash: `#theme=light`, `#scenario=empty|no-config|docker-off`.
- `STYLE-GUIDE.md` — the shared pr-menubar visual language this design follows.
- `screenshots/` — reference captures: popover (dark/light), expanded row, typed tear-down confirm, settings (dark/light), empty, config-missing, and Docker-off states.
