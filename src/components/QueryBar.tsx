import { useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  error: string | null
  total: number
  shown: number
  /** True while the shown/total counts (and the filtered list) still reflect a previous, now-stale query. */
  stale?: boolean
  liveFiltering: boolean
  onLiveFilteringChange: (live: boolean) => void
}

const FIELDS: { key: string; desc: string }[] = [
  { key: 'rule / id', desc: 'matched rule id, e.g. rule:932110' },
  { key: 'tag', desc: 'a tag on a matched rule' },
  { key: 'severity', desc: 'EMERGENCY…DEBUG or 0–7, e.g. severity:WARNING' },
  { key: 'status', desc: 'response code, e.g. status:403 or status:4xx' },
  { key: 'method', desc: 'HTTP method, e.g. method:POST' },
  { key: 'ip', desc: 'client IP (substring match)' },
  { key: 'uri / path', desc: 'request URI (substring match)' },
  { key: 'host', desc: 'request Host header' },
  { key: 'msg', desc: 'text within a matched rule message' },
  { key: 'uniqueid', desc: 'transaction unique_id' },
  { key: 'intercepted', desc: 'true / false' },
  { key: 'after / before', desc: 'ISO-ish date or datetime, e.g. after:2026-09-04T17:00' },
]

export default function QueryBar({
  value,
  onChange,
  onSubmit,
  onClear,
  error,
  total,
  shown,
  stale,
  liveFiltering,
  onLiveFilteringChange,
}: Props) {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit()
            }}
            spellCheck={false}
            placeholder='rule:932110 and not status:200  ·  tag:attack-xss or severity:WARNING'
            className={[
              'mono w-full rounded-md border bg-slate-950 py-1.5 pl-3 pr-8 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none',
              error ? 'border-red-700 focus:border-red-600' : 'border-slate-700 focus:border-sky-500',
            ].join(' ')}
          />
          {value && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear query"
              title="Clear query"
              className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-slate-500 hover:text-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400" title="When off, the query only applies when you press Enter">
          <input
            type="checkbox"
            checked={liveFiltering}
            onChange={(e) => onLiveFilteringChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 accent-sky-500"
          />
          Live filtering
        </label>

        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          aria-expanded={showHelp}
          className={[
            'shrink-0 rounded-md border px-2 py-1.5 text-xs font-medium',
            showHelp ? 'border-sky-700 text-sky-300' : 'border-slate-700 text-slate-400 hover:text-slate-200',
          ].join(' ')}
        >
          Syntax {showHelp ? '▾' : '▸'}
        </button>
        <div className={['shrink-0 text-sm transition-opacity', stale ? 'text-slate-600' : 'text-slate-500'].join(' ')}>
          {shown === total ? `${total} entries` : `${shown} / ${total} entries`}
          {stale && (
            <span className="ml-1.5 inline-block">{liveFiltering ? <span className="animate-pulse">…</span> : '(press Enter)'}</span>
          )}
        </div>
      </div>

      {error && <p className="mono mt-1.5 text-xs text-red-400">{error}</p>}

      {showHelp && (
        <div className="mt-2 rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
          <p className="mb-2 text-slate-300">
            Combine predicates with <code className="mono text-slate-200">and</code> / <code className="mono text-slate-200">or</code> /{' '}
            <code className="mono text-slate-200">not</code>, group with <code className="mono text-slate-200">(…)</code>, quote values
            containing spaces with <code className="mono text-slate-200">"…"</code> (<code className="mono text-slate-200">\"</code> to
            escape). Predicates written next to each other are implicitly AND'ed. A bare word searches everything. Press{' '}
            <code className="mono text-slate-200">Enter</code> to apply immediately, or turn off "Live filtering" to only apply on Enter.
          </p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex gap-2">
                <code className="mono shrink-0 text-sky-400">{f.key}:</code>
                <span>{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
