import { app, Menu, nativeTheme } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { CHANNELS } from '../shared/ipc'
import type { WorktreeSnapshot } from '../shared/types'
import { ConfigStore } from './config'
import { Coordinator } from './coordinator'
import { DockerService } from './docker'
import type { StackOps } from './ipcHandlers'
import { registerIpcHandlers } from './ipcHandlers'
import { MockBackend, MockConfigStore, type MockScenario } from './mock'
import { Poller } from './poller'
import { createPopover } from './popover'
import { captureScreenshots } from './screenshot'
import { openSettingsWindow } from './settingsWindow'
import { createTray } from './tray'
import { scanWorktrees, type ScannedWorktree } from './worktrees'

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
    setCount: (running, total) => trayCtl.setCount(running, total)
  })

  const docker = new DockerService((result) => {
    coordinator.pushOpDone(result)
    poller.refresh()
  })

  const mock = MOCK
    ? new MockBackend(
        SCENARIO,
        (result) => coordinator.pushOpDone(result),
        () => poller.refresh()
      )
    : null

  /** Real scan results by id — start/stop need the worktree dir + project. */
  let lastScan = new Map<string, ScannedWorktree>()

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
    const worktrees: WorktreeSnapshot[] = scanned.map((s) => ({
      id: s.id,
      repo: s.repo,
      label: s.label,
      branch: s.branch,
      port: s.port,
      extras: s.extras,
      path: s.path,
      status: docker.statusFor(s.id, s.composeProject, snap)
    }))
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
    teardown: (id) => {
      const s = lastScan.get(id)
      if (s) docker.teardown(id, s.absPath, s.label)
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
