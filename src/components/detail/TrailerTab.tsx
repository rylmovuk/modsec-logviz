import type { LogEntry } from '../../lib/types'

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2 border-b border-slate-800/60 px-3 py-1.5 text-sm">
      <span className="w-40 shrink-0 text-slate-500">{label}</span>
      <span className="mono break-all text-slate-200">{value}</span>
    </div>
  )
}

export default function TrailerTab({ entry }: { entry: LogEntry }) {
  const t = entry.trailer
  if (!t || (!t.raw && Object.keys(t.extra).length === 0)) {
    return <p className="p-4 text-sm text-slate-500 italic">No audit log trailer (part H) recorded.</p>
  }

  return (
    <div className="h-full overflow-auto">
      <Field label="Producer" value={t.producer} />
      <Field label="Server" value={t.server} />
      <Field label="Engine-Mode" value={t.engineMode} />
      <Field label="Action" value={t.action} />
      <Field label="Response-Body-Transformed" value={t.responseBodyTransformed} />
      <Field label="Stopwatch" value={t.stopwatch} />
      <Field label="Stopwatch2" value={t.stopwatch2} />
      {Object.entries(t.extra).map(([k, v]) => (
        <Field key={k} label={k} value={v} />
      ))}
      <details className="p-3">
        <summary className="cursor-pointer text-xs text-sky-400">Raw trailer text (part H)</summary>
        <pre className="mono mt-2 whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
          {t.raw}
        </pre>
      </details>
    </div>
  )
}
