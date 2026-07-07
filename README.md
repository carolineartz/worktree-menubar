# Worktree Menubar

macOS menubar app that answers: **which branch is running on which localhost, is it up, and let me open the right one.**

For each git worktree it shows branch ↔ port ↔ running-state, with actions to open the dev URL, open the worktree in your editor, start/stop the Docker stack, and tear it down.

| | |
|---|---|
| ![popover, dark](docs/screenshots/01-popover-dark.png) | ![expanded row](docs/screenshots/02-row-expanded-dark.png) |

## How it reads your machine

1. **Repos** — you list repo roots in `~/.config/worktree-menubar.json` (or via Settings).
2. **Worktrees** — each repo's `git worktree list` is scanned. The main checkout is skipped unless enabled.
3. **Ports** — each worktree's `.env` is read; the dev-port key (default `FE_PORT`) makes it a row, extra keys (`API_PORT, WS_PORT, DB_PORT`) become chips in the expanded panel. Worktrees without a dev port are skipped.
4. **Status** — `docker compose ls` maps compose projects (via `COMPOSE_PROJECT_NAME` in `.env`, falling back to the directory name) to running state. While a start/stop command is in flight the row shows an optimistic pulsing `starting…`/`stopping…`.

Everything refreshes every ~10 s (configurable), on popover open, and on ⌘R.

## Actions

- **Click a row** → expands it (worktree path, port chips, action strip). **⌘-click** a running row opens its dev URL directly.
- Each running row has an **open-in-browser** button (left of the chevron); stopped rows show **▶ Start** (`docker compose up -d`).
- **Expanded panel** → `↗ Open` · `Editor` · `■ Stop` / `▶ Start` · **Down**, plus a red **🗑 Destroy** aligned right.
- **Down** (`docker compose down -v` — containers **and volumes**, keeps the worktree) requires typing `DOWN`. **Destroy** (full cleanup: `down -v` → `git worktree remove` → prune, **keeps the branch**) requires typing `DESTROY`; it's non-force, so a worktree with uncommitted changes is kept rather than discarded.
- Tray shows `running/total` (e.g. `3/5`); in the footer `⌘R` refreshes and the gear opens Settings (right-click the tray for Refresh / Settings / Quit).

## Config

`~/.config/worktree-menubar.json` — hand-editable, hot-reloaded on every refresh:

```json
{
  "repos": ["~/dev/meadow", "~/dev/lantern"],
  "devPortKey": "FE_PORT",
  "extraPortKeys": ["API_PORT", "WS_PORT", "DB_PORT"],
  "urlTemplate": "http://localhost:{port}/#/login",
  "composeProjectKey": "COMPOSE_PROJECT_NAME",
  "editorCommand": "code",
  "includeMainCheckout": false,
  "theme": "system",
  "refreshSeconds": 10,
  "showCountInMenuBar": true,
  "launchAtLogin": false
}
```

All of it is also editable in the Settings window:

![settings](docs/screenshots/06-settings-dark.png)

## Install

Grab the latest zip from [Releases](https://github.com/carolineartz/worktree-menubar/releases):

```sh
# unzip, move Worktree Menubar.app to /Applications, then (unsigned app, one time):
xattr -cr "/Applications/Worktree Menubar.app"
```

Requires macOS (Apple Silicon) + Docker. On first launch, point `repos` at your repo roots (via Settings, or the config above).

## Development

Built on the [pr-menubar](https://github.com/carolineartz/pr-menubar) Electron scaffold — Tray + frameless vibrancy `BrowserWindow`, electron-vite, React, TypeScript — and its shared visual language (`design/STYLE-GUIDE.md`).

```bash
pnpm install
pnpm dev          # against your real worktrees/docker
pnpm dev:mock     # the design bundle's fictional demo dataset (meadow/lantern)
pnpm test         # vitest: env/compose parsing, porcelain parsing, presenters
pnpm typecheck && pnpm lint
pnpm build:mac    # .app in dist/ (unsigned, dir target)
```

`WTMB_SHOOT=1 WTMB_MOCK=1 pnpm start` regenerates `docs/screenshots/` from the mock dataset. `WTMB_SCENARIO=empty|no-config|docker-off` forces the corresponding state in mock mode.

The hi-fi design handoff this implements — interactive prototype, style guide, reference screenshots — lives in [`design/`](design/).
