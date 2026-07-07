import { Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'

export interface TrayController {
  tray: Tray
  /** Show "running/total" beside the icon; running < 0 hides the count. */
  setCount(running: number, total: number): void
}

export function createTray(handlers: {
  onClick: (bounds: Electron.Rectangle) => void
  onRefresh: () => void
  onSettings: () => void
  onQuit: () => void
}): TrayController {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/trayTemplate.png'))
  icon.setTemplateImage(true)
  const tray = new Tray(icon)
  tray.setIgnoreDoubleClickEvents(true)

  tray.on('click', () => handlers.onClick(tray.getBounds()))
  tray.on('right-click', () => {
    tray.popUpContextMenu(
      Menu.buildFromTemplate([
        { label: 'Refresh', click: handlers.onRefresh },
        { label: 'Settings…', click: handlers.onSettings },
        { type: 'separator' },
        { label: 'Quit Worktree Menubar', click: handlers.onQuit }
      ])
    )
  })

  return {
    tray,
    setCount: (running, total) => {
      // monospacedDigit keeps the icon from shifting as counts change
      tray.setTitle(running >= 0 ? `${running}/${total}` : '', { fontType: 'monospacedDigit' })
    }
  }
}
