import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type MouseEvent
} from 'react'
import type { AppState } from '../../shared/ipc'
import type { WorktreeSnapshot } from '../../shared/types'
import { api } from './lib/api'
import { FooterBar } from './components/FooterBar'
import { WorktreeList } from './components/WorktreeList'
import type { RowActions } from './components/WorktreeRow'

export default function App(): JSX.Element {
  const [state, setState] = useState<AppState | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const showToast = useCallback((msg: string): void => {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 1900)
  }, [])

  useEffect(() => {
    api.getState().then(setState)
    const offData = api.onDataUpdated(setState)
    const offOp = api.onOpDone((result) => showToast(result.message))
    const offShown = api.onPopoverShown(() => {
      setConfirmingId(null)
      setConfirmText('')
    })
    return () => {
      offData()
      offOp()
      offShown()
    }
  }, [showToast])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey && !e.ctrlKey && !e.altKey && e.key === 'r') {
        e.preventDefault()
        void api.refresh()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Size the window to the content: fixed chrome + the list's natural height.
  // .list-inner is unstretched, so this shrinks the window as well as grows it.
  useEffect(() => {
    const measure = (): void => {
      const list = document.querySelector<HTMLElement>('.list')
      const inner = document.querySelector<HTMLElement>('.list-inner')
      if (!list || !inner) return
      const chrome = document.body.offsetHeight - list.clientHeight
      void api.resizePopover(chrome + Math.max(inner.offsetHeight + 8, 80) + 2)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    const mo = new MutationObserver(measure)
    mo.observe(document.body, { childList: true, subtree: true })
    measure()
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  const toggleExpand = useCallback((id: string): void => {
    setExpandedId((cur) => (cur === id ? null : id))
    // expanding (or collapsing) a row cancels any pending confirm
    setConfirmingId(null)
    setConfirmText('')
  }, [])

  const actions: RowActions = useMemo(
    () => ({
      rowClick: (wt: WorktreeSnapshot, e: MouseEvent) => {
        // Default: expand/collapse. ⌘-click opens the site (running rows only).
        if (e.metaKey && wt.status === 'running') {
          void api.openUrl(wt.id)
          showToast(`Opened localhost:${wt.port} ↗`)
          return
        }
        toggleExpand(wt.id)
      },
      toggleExpand,
      openUrl: (wt: WorktreeSnapshot) => {
        void api.openUrl(wt.id)
        showToast(`Opened localhost:${wt.port} ↗`)
      },
      openEditor: (wt: WorktreeSnapshot) => {
        void api.openEditor(wt.id)
        showToast(`Opening ${wt.label} in editor…`)
      },
      start: (wt: WorktreeSnapshot) => void api.startStack(wt.id),
      stop: (wt: WorktreeSnapshot) => void api.stopStack(wt.id),
      askTeardown: (id: string) => {
        setConfirmingId(id)
        setConfirmText('')
      },
      cancelTeardown: () => {
        setConfirmingId(null)
        setConfirmText('')
      },
      confirmTeardown: (wt: WorktreeSnapshot) => {
        void api.teardownStack(wt.id)
        setConfirmingId(null)
        setConfirmText('')
      },
      setConfirmText
    }),
    [toggleExpand, showToast]
  )

  if (!state) return <div className="popover" />

  const showList = state.configState === 'ok' && state.worktrees.length > 0

  return (
    <div className="popover">
      {showList ? (
        <WorktreeList
          worktrees={state.worktrees}
          expandedId={expandedId}
          confirmingId={confirmingId}
          confirmText={confirmText}
          actions={actions}
        />
      ) : state.configState === 'ok' ? (
        <div className="list">
          <div className="list-inner">
            <div className="empty">
              <div className="line1">No dev-server worktrees found.</div>
              <div className="line2">
                Worktrees without a dev port in <code>.env</code> are skipped.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="list">
          <div className="list-inner">
            <div className="noconfig">
              <div className="title">Set up Worktree Menubar</div>
              <div className="blurb">
                {state.configState === 'error'
                  ? `The config file could not be parsed: ${state.configError ?? 'invalid JSON'}`
                  : 'Point it at your repos to see which branch is running on which localhost.'}
              </div>
              <span className="path-chip">~/.config/worktree-menubar.json</span>
              {state.configState === 'missing' && (
                <button
                  className="create-btn"
                  onClick={() => {
                    void api.createConfig()
                    showToast('Created ~/.config/worktree-menubar.json')
                  }}
                >
                  Create config
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <FooterBar
        state={state}
        onRefresh={() => void api.refresh()}
        onOpenSettings={() => void api.openSettingsWindow()}
      />
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
