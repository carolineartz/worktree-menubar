import { useEffect, useRef, useState, type JSX } from 'react'
import type { Config } from '../../../shared/types'
import { api } from '../lib/api'

export default function SettingsApp(): JSX.Element {
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => {
    api.getConfig().then(setConfig)
  }, [])

  if (!config) return <div className="settings" />

  const patch = (p: Partial<Config>): void => {
    setConfig({ ...config, ...p })
    void api.setConfig(p)
  }

  return (
    <div className="settings">
      <Section
        title="Repos"
        hint="Each repo's worktrees are scanned for a dev port; those without one are listed under “more”."
      >
        <RepoEditor repos={config.repos} onChange={(repos) => patch({ repos })} />
      </Section>

      <Section title="Ports & URL">
        <TextField
          label="Dev port env key"
          value={config.devPortKey}
          onCommit={(v) => patch({ devPortKey: v.trim() || 'FE_PORT' })}
        />
        <TextField
          label="Extra port keys"
          value={config.extraPortKeys.join(', ')}
          onCommit={(v) =>
            patch({
              extraPortKeys: v
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean)
            })
          }
        />
        <TextField
          label="URL template"
          value={config.urlTemplate}
          onCommit={(v) => patch({ urlTemplate: v.trim() || 'http://localhost:{port}/' })}
        />
        <TextField
          label="Compose project key"
          value={config.composeProjectKey}
          onCommit={(v) => patch({ composeProjectKey: v.trim() || 'COMPOSE_PROJECT_NAME' })}
        />
      </Section>

      <Section
        title="Integrations"
        hint="Branches with a ticket key (ABC-123) get a Jira button; a GitHub PR button appears when `gh` finds the branch's PR. Promote runs on worktrees without a dev port."
      >
        <TextField
          label="Jira base URL"
          value={config.jiraBaseUrl}
          placeholder="https://yourteam.atlassian.net"
          onCommit={(v) => patch({ jiraBaseUrl: v.trim().replace(/\/+$/, '') })}
        />
        <TextField
          label="Promote command"
          value={config.promoteCommand}
          placeholder="cutover-work {branch} --local --no-open"
          onCommit={(v) => patch({ promoteCommand: v.trim() })}
        />
      </Section>

      <Section title="Editor">
        <TextField
          label="Open in editor with"
          value={config.editorCommand}
          onCommit={(v) => patch({ editorCommand: v.trim() || 'code' })}
        />
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={config.includeMainCheckout}
            onChange={(e) => patch({ includeMainCheckout: e.target.checked })}
          />
          Include the main checkout
        </label>
      </Section>

      <Section title="General" gap={10}>
        <div className="field-row">
          <span className="label grow">Appearance</span>
          <div className="theme-seg">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                className={config.theme === t ? 'seg-btn active' : 'seg-btn'}
                onClick={() => patch({ theme: t })}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <span className="label grow">Refresh every</span>
          <RefreshInput
            value={config.refreshSeconds}
            onCommit={(n) => patch({ refreshSeconds: n })}
          />
          <span className="suffix">seconds</span>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={config.showCountInMenuBar}
            onChange={(e) => patch({ showCountInMenuBar: e.target.checked })}
          />
          Show running count in the menu bar
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={config.launchAtLogin}
            onChange={(e) => patch({ launchAtLogin: e.target.checked })}
          />
          Launch at login
        </label>
      </Section>
    </div>
  )
}

function Section({
  title,
  hint,
  gap,
  children
}: {
  title: string
  hint?: string
  gap?: number
  children: React.ReactNode
}): JSX.Element {
  return (
    <section className="section" style={gap ? { gap } : undefined}>
      <h2>{title}</h2>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </section>
  )
}

/** Label + mono input that commits on blur/Enter (matches pr-menubar idiom). */
function TextField({
  label,
  value,
  placeholder,
  onCommit
}: {
  label: string
  value: string
  placeholder?: string
  onCommit: (v: string) => void
}): JSX.Element {
  return (
    <div className="field-row">
      <span className="label">{label}</span>
      <input
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        spellCheck={false}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
    </div>
  )
}

function RefreshInput({
  value,
  onCommit
}: {
  value: number
  onCommit: (n: number) => void
}): JSX.Element {
  const commit = (raw: string): void => {
    const n = Number(raw.trim())
    // floor of 3s — the scan shells out to git and docker on every cycle
    onCommit(Number.isFinite(n) && n >= 3 ? Math.round(n) : 10)
  }
  return (
    <input
      type="text"
      className="num"
      defaultValue={String(value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

function RepoEditor({
  repos,
  onChange
}: {
  repos: string[]
  onChange: (repos: string[]) => void
}): JSX.Element {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const valid = (v: string): boolean => v.startsWith('/') || v.startsWith('~')

  const add = (): void => {
    const v = draft.trim().replace(/\/+$/, '')
    if (!v || !valid(v) || repos.includes(v)) return
    onChange([...repos, v])
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <>
      {repos.map((repo) => (
        <div key={repo} className="repo-item">
          <span className="path">{repo}</span>
          <button
            className="remove"
            title="Remove"
            onClick={() => onChange(repos.filter((r) => r !== repo))}
          >
            ×
          </button>
        </div>
      ))}
      <div className="add-row">
        <input
          ref={inputRef}
          value={draft}
          placeholder="/path/to/repo"
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="add" onClick={add} disabled={!valid(draft.trim())}>
          Add
        </button>
      </div>
    </>
  )
}
