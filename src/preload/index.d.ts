import type { RendererApi } from '../shared/ipc'

declare global {
  interface Window {
    /** Absent when running outside Electron (browser preview) — api.ts falls back to a mock. */
    api?: RendererApi
  }
}

export {}
