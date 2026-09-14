import { useMemo, useState } from 'react'

// Above this size, skip the JSON.parse/stringify round-trip — it's wasted
// work for a body nobody will read as JSON anyway, and can itself be slow
// on a multi-megabyte blob.
const MAX_PRETTY_PRINT_LEN = 200_000
// Above this size, don't hand the whole string to a <pre> — reflowing a
// multi-megabyte text node (especially with wrapping) is a real jank source.
const MAX_DISPLAY_LEN = 300_000

function tryPrettyPrintJson(text: string): string | null {
  if (text.length > MAX_PRETTY_PRINT_LEN) return null
  const trimmed = text.trim()
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return null
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return null
  }
}

export default function BodyView({ body, emptyLabel }: { body: string | null; emptyLabel: string }) {
  const [copied, setCopied] = useState(false)
  const pretty = useMemo(() => (body ? tryPrettyPrintJson(body) : null), [body])
  const [showPretty, setShowPretty] = useState(true)

  if (!body || body.trim().length === 0) {
    return <p className="p-3 text-sm text-slate-500 italic">{emptyLabel}</p>
  }

  const full = pretty && showPretty ? pretty : body
  const truncated = full.length > MAX_DISPLAY_LEN
  const display = truncated ? full.slice(0, MAX_DISPLAY_LEN) : full

  const copy = () => {
    navigator.clipboard?.writeText(body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-1.5">
        {pretty && (
          <button
            onClick={() => setShowPretty((s) => !s)}
            className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            {showPretty ? 'Raw' : 'Pretty'}
          </button>
        )}
        <button onClick={copy} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700">
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <span className="ml-auto text-xs text-slate-500">{body.length.toLocaleString()} bytes</span>
      </div>
      {truncated && (
        <div className="border-b border-amber-900 bg-amber-950/40 px-3 py-1 text-xs text-amber-300">
          Showing the first {MAX_DISPLAY_LEN.toLocaleString()} characters — "Copy" still copies the full body.
        </div>
      )}
      <pre className="mono flex-1 overflow-auto whitespace-pre-wrap break-all p-3 text-sm text-slate-200">{display}</pre>
    </div>
  )
}
