import { useMemo, useState } from 'react'

function tryPrettyPrintJson(text: string): string | null {
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

  const display = pretty && showPretty ? pretty : body

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
      <pre className="mono flex-1 overflow-auto whitespace-pre-wrap break-all p-3 text-sm text-slate-200">{display}</pre>
    </div>
  )
}
