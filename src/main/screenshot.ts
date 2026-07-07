import { app, nativeTheme, type BrowserWindow } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { MockBackend, MockConfigStore, MockScenario } from './mock'
import { getSettingsWindow, openSettingsWindow } from './settingsWindow'

interface Shot {
  name: string
  theme: 'dark' | 'light'
  scenario: MockScenario
  /** run in the page before capturing (clicks, typing) */
  setup?: string
}

const EXPAND_FIRST = `document.querySelector('.chev')?.click()`
const DESTROY_CONFIRM = `
  document.querySelector('.chev')?.click();
  setTimeout(() => document.querySelector('.destroy-btn')?.click(), 120);
`

const SHOTS: Shot[] = [
  { name: '01-popover-dark', theme: 'dark', scenario: 'normal' },
  { name: '02-row-expanded-dark', theme: 'dark', scenario: 'normal', setup: EXPAND_FIRST },
  { name: '03-destroy-confirm-dark', theme: 'dark', scenario: 'normal', setup: DESTROY_CONFIRM },
  { name: '04-popover-light', theme: 'light', scenario: 'normal' },
  { name: '07-empty-dark', theme: 'dark', scenario: 'empty' },
  { name: '08-no-config-dark', theme: 'dark', scenario: 'no-config' },
  { name: '09-docker-off-dark', theme: 'dark', scenario: 'docker-off' }
]

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * WTMB_SHOOT=1 WTMB_MOCK=1: photograph the popover on the mock dataset for
 * the README, then quit. capturePage can't see the native vibrancy, so a
 * solid panel background is injected for clean captures.
 */
export async function captureScreenshots(
  win: BrowserWindow,
  mock: MockBackend,
  mockConfig: MockConfigStore,
  refresh: () => void,
  outDir: string
): Promise<void> {
  mkdirSync(outDir, { recursive: true })
  win.removeAllListeners('blur') // keep it visible while unfocused
  win.center()
  win.show()
  await sleep(1500)

  for (const shot of SHOTS) {
    nativeTheme.themeSource = shot.theme
    mock.scenario = shot.scenario
    mockConfig.state = shot.scenario === 'no-config' ? 'missing' : 'ok'
    refresh()
    await sleep(400)
    await win.webContents.insertCSS(
      `body { background: ${shot.theme === 'dark' ? '#1f1f26' : '#f7f7f9'} !important }`
    )
    // collapse any leftover expansion from the previous shot
    await win.webContents.executeJavaScript(
      `document.querySelector('.chev-open')?.click(); undefined`
    )
    await sleep(150)
    if (shot.setup) {
      await win.webContents.executeJavaScript(`{ ${shot.setup} }; undefined`)
      await sleep(400)
    }
    await sleep(250) // let the auto-resize settle
    const image = await win.webContents.capturePage()
    writeFileSync(join(outDir, `${shot.name}.png`), image.toPNG())
    console.log(`[shoot] captured ${shot.name}`)
  }

  // settings window, both themes (05/06 in the design bundle)
  openSettingsWindow()
  await sleep(1500)
  for (const [name, theme] of [
    ['05-settings-light', 'light'],
    ['06-settings-dark', 'dark']
  ] as const) {
    nativeTheme.themeSource = theme
    await sleep(400)
    const sw = getSettingsWindow()
    if (!sw) continue
    const image = await sw.webContents.capturePage()
    writeFileSync(join(outDir, `${name}.png`), image.toPNG())
    console.log(`[shoot] captured ${name}`)
  }
  app.quit()
}
