import { app, Menu, nativeTheme, Notification } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { CHANNELS } from '../shared/ipc'
import { jiraBrowseUrl } from '../shared/present'
import type { OpResult, StackStatus, WorktreeSnapshot } from '../shared/types'
import { ConfigStore } from './config'
import { Coordinator } from './coordinator'
import { DockerService } from './docker'
import { fixGuiPath } from './env'
import { PrLinks } from './github'
import { HealthTracker, probeHealth } from './health'
import { PromoteService } from './promote'
import type { StackOps } from './ipcHandlers'
import { registerIpcHandlers } from './ipcHandlers'
import { MockBackend, MockConfigStore, type MockScenario } from './mock'
import { Poller } from './poller'
import { createPopover } from './popover'
import { captureScreenshots } from './screenshot'
import { openSettingsWindow } from './settingsWindow'
import { createTray } from './tray'
import { scanWorktrees, type ScannedWorktree } from './worktrees'

// Must run before anything shells out: GUI launches get launchd's minimal
// PATH, which is missing docker (see env.ts).
fixGuiPath()

const MOCK = !!process.env.WTMB_MOCK
const SHOOT = !!process.env.WTMB_SHOOT
const SCENARIO = (process.env.WTMB_SCENARIO ?? 'normal') as MockScenario

// Mock instances get their own userData so they can run beside the real app
// (the single-instance lock lives in userData).
if (MOCK) {
  app.setPath('userData', `${app.getPath('userData')}-mock`)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.carolineartz.worktree-menubar')
  app.dock?.hide()

  // No visible menu bar (LSUIElement), but roles keep ⌘C/⌘V/⌘Q working
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
  )

  const mockConfig = MOCK ? new MockConfigStore(SCENARIO) : null
  const config = mockConfig ?? new ConfigStore()

  // 'system' | 'light' | 'dark' — themeSource drives both the CSS
  // prefers-color-scheme tokens and the native vibrancy appearance
  nativeTheme.themeSource = config.get().theme

  const popover = createPopover()

  const trayCtl = createTray({
    onClick: (bounds) => {
      if (popover.win.isVisible() || popover.justHid()) popover.hide()
      else popover.show(bounds)
    },
    onRefresh: () => poller.refresh(),
    onSettings: () => openSettingsWindow(),
    onQuit: () => app.quit()
  })

  const coordinator = new Coordinator(config, {
    getWindow: () => popover.win,
    setCount: (running, total, alerts) => trayCtl.setCount(running, total, alerts)
  })

  /** An op finished while the popover was closed: the toast would go unseen,
   *  so say it through Notification Center instead (failures always; destroy
   *  successes too, since they're the ones you wait on). Clicking opens the popover. */
  const notifyIfHidden = (result: OpResult): void => {
    if (popover.win.isVisible()) return
    if (result.ok && result.kind !== 'destroy') return
    if (!Notification.isSupported()) return
    const n = new Notification({
      title: result.ok ? 'Worktree Menubar' : 'Worktree Menubar — failed',
      body: result.ok ? result.message : `${result.message}. Open the popover for details.`,
      silent: result.ok
    })
    n.on('click', () => popover.show(trayCtl.tray.getBounds()))
    n.show()
  }

  const onOpDone = (result: OpResult): void => {
    if (result.kind === 'destroy' && result.ok) coordinator.removeWorktree(result.id)
    coordinator.pushOpDone(result)
    notifyIfHidden(result)
    poller.refresh()
  }

  const docker = new DockerService(onOpDone)
  const promoter = new PromoteService(onOpDone)

  // PR lookups resolve in the background; republish when one lands
  const prLinks = new PrLinks(() => poller.refresh())

  const mock = MOCK
    ? new MockBackend(
        SCENARIO,
        (result) => coordinator.pushOpDone(result),
        () => poller.refresh()
      )
    : null

  /** Real scan results by id — start/stop need the worktree dir + project. */
  let lastScan = new Map<string, ScannedWorktree>()
  const health = new HealthTracker()

  const poll = async (): Promise<void> => {
    if (mock) {
      const { worktrees, dockerRunning } = mock.scan()
      coordinator.setData(worktrees, dockerRunning)
      return
    }
    config.reload()
    nativeTheme.themeSource = config.get().theme
    if (config.state !== 'ok') {
      coordinator.setData([], true)
      return
    }
    const scanned = await scanWorktrees(config.get())
    lastScan = new Map(scanned.map((s) => [s.id, s]))
    const snap = await docker.snapshot()
    const healthPath = config.get().healthPath.trim()
    const statuses = await Promise.all(
      scanned.map(async (s): Promise<{ status: StackStatus; detail: string | null }> => {
        // unserved rows have no stack — only a promote or destroy in progress
        if (!s.served || s.port == null) {
          const pending = docker.pendingFor(s.id)
          return {
            status: pending ?? (promoter.isPromoting(s.id) ? 'promoting' : 'stopped'),
            detail: null
          }
        }
        const base = docker.statusFor(s.id, s.composeProject, snap)
        const probe =
          healthPath && base === 'running' ? await probeHealth(s.port, healthPath) : null
        const h = health.apply(s.id, base, probe)
        return { status: h.status, detail: h.detail ? `${h.detail} at ${healthPath}` : null }
      })
    )
    const jiraBase = config.get().jiraBaseUrl
    const worktrees: WorktreeSnapshot[] = scanned.map((s, i) => {
      const pr = prLinks.get(s.repoRoot, s.branch)
      return {
        id: s.id,
        repo: s.repo,
        label: s.label,
        branch: s.branch,
        port: s.port,
        host: s.host ?? undefined,
        extras: s.extras,
        path: s.path,
        status: statuses[i].status,
        statusDetail: statuses[i].detail,
        served: s.served,
        jiraUrl: jiraBrowseUrl(jiraBase, s.branch),
        prUrl: pr?.url ?? null,
        prLabel: pr?.label ?? null,
        prMerged: pr?.merged ?? false,
        lastError: null // filled in by the coordinator
      }
    })
    coordinator.setData(worktrees, snap.dockerRunning)
  }

  const ops: StackOps = mock ?? {
    start: (id) => {
      const s = lastScan.get(id)
      if (s) docker.start(id, s.absPath, s.label)
    },
    stop: (id) => {
      const s = lastScan.get(id)
      if (s) docker.stop(id, s.absPath, s.label)
    },
    destroy: (id, opts) => {
      const s = lastScan.get(id)
      if (!s) return
      docker.destroy(id, {
        dir: s.absPath,
        repoRoot: s.repoRoot,
        label: s.label,
        hasStack: s.served,
        branch: s.gitBranch,
        composeProject: s.composeProject,
        deleteBranch: opts.deleteBranch
      })
    },
    promote: (id) => {
      const s = lastScan.get(id)
      if (s && !s.served) {
        promoter.promote(id, s.absPath, s.branch, s.label, config.get().promoteCommand)
      }
    },
    editorPath: (id) => lastScan.get(id)?.absPath ?? null
  }

  const poller = new Poller(
    poll,
    () => config.get().refreshSeconds * 1000,
    (err) => console.error('[poll] failed:', err instanceof Error ? err.message : err)
  )

  popover.onShow(() => {
    popover.win.webContents.send(CHANNELS.popoverShown)
    poller.refresh() // local + cheap: rescan on every open
  })

  registerIpcHandlers({
    coordinator,
    config,
    ops,
    refresh: () => poller.refresh(),
    openEditor: (path) => {
      const cmd = config.get().editorCommand.trim() || 'code'
      // login shell so GUI-launched instances still resolve PATH entries
      execFile('/bin/zsh', ['-lc', `${cmd} ${JSON.stringify(path)}`], () => {})
    },
    openSettingsWindow,
    onConfigChanged: () => {
      const c = config.get()
      app.setLoginItemSettings({ openAtLogin: c.launchAtLogin })
      nativeTheme.themeSource = c.theme
      poller.refresh()
    },
    resizePopover: (h) => popover.resize(h)
  })

  poller.start()

  if (SHOOT && mock && mockConfig) {
    popover.win.webContents.once('did-finish-load', () => {
      void captureScreenshots(
        popover.win,
        mock,
        mockConfig,
        () => poller.refresh(),
        join(process.cwd(), 'docs', 'screenshots')
      )
    })
  }
})

// Menubar app: stay alive with zero windows; quit only via the tray menu.
app.on('window-all-closed', () => {})
