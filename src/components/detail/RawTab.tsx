import type { AuditLogPartLetter, LogEntry } from '../../lib/types'

const PART_LABELS: Record<AuditLogPartLetter, string> = {
  A: 'A — Audit log header',
  B: 'B — Request headers',
  C: 'C — Request body',
  D: 'D — Reserved',
  E: 'E — Intended response body',
  F: 'F — Response headers',
  G: 'G — Response body',
  H: 'H — Audit log trailer',
  I: 'I — Reduced multipart request body',
  J: 'J — Uploaded files info',
  K: 'K — Matched rules',
  Z: 'Z — Final boundary',
}

export default function RawTab({ entry }: { entry: LogEntry }) {
  const partEntries = Object.entries(entry.rawParts) as [AuditLogPartLetter, string][]

  if (partEntries.length === 0) {
    return (
      <pre className="mono h-full overflow-auto whitespace-pre-wrap break-all p-3 text-sm text-slate-200">{entry.raw}</pre>
    )
  }

  return (
    <div className="h-full space-y-3 overflow-auto p-3">
      {partEntries.map(([letter, content]) => (
        <details key={letter} open className="rounded-lg border border-slate-800">
          <summary className="cursor-pointer select-none bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300">
            {PART_LABELS[letter] ?? letter}
          </summary>
          <pre className="mono whitespace-pre-wrap break-all border-t border-slate-800 p-3 text-xs text-slate-300">
            {content || '(empty)'}
          </pre>
        </details>
      ))}
    </div>
  )
}
