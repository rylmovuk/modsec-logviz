import { useState } from 'react'
import type { LogEntry } from '../../lib/types'
import Badge from '../Badge'

export default function RulesTab({ entry }: { entry: LogEntry }) {
  const [openRaw, setOpenRaw] = useState<string | null>(null)
  const messages = entry.trailer?.messages ?? []

  if (messages.length === 0 && entry.matchedRules.length === 0) {
    return <p className="p-4 text-sm text-slate-500 italic">No rules matched for this transaction.</p>
  }

  const ruleById = new Map(entry.matchedRules.filter((r) => r.id).map((r) => [r.id, r]))

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      {messages.map((m, i) => {
        const rule = m.id ? ruleById.get(m.id) : undefined
        const key = `${m.id ?? 'msg'}-${i}`
        return (
          <div key={key} className="rounded-lg border border-slate-800 bg-slate-900/50">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-3 py-2">
              {m.id && <Badge tone="violet">id:{m.id}</Badge>}
              {m.disposition && <Badge tone={/denied|blocked/i.test(m.disposition) ? 'red' : 'amber'}>{m.disposition}</Badge>}
              {m.severity && <Badge tone="amber">severity {m.severity}</Badge>}
              {m.tags.map((t) => (
                <Badge key={t} tone="sky">
                  {t}
                </Badge>
              ))}
            </div>
            <div className="px-3 py-2 text-sm">
              <p className="text-slate-200">{m.msg ?? m.text}</p>
              {m.data && (
                <p className="mono mt-1 break-all text-xs text-slate-400">
                  <span className="text-slate-500">data: </span>
                  {m.data}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {m.ruleFile && (
                  <>
                    {m.ruleFile}
                    {m.ruleLine ? `:${m.ruleLine}` : ''}
                  </>
                )}
              </p>
            </div>
            {rule && (
              <div className="border-t border-slate-800">
                <button
                  onClick={() => setOpenRaw(openRaw === key ? null : key)}
                  className="w-full px-3 py-1.5 text-left text-xs text-sky-400 hover:bg-slate-800/60"
                >
                  {openRaw === key ? 'Hide matched rule source ▾' : 'Show matched rule source ▸'}
                </button>
                {openRaw === key && (
                  <pre className="mono overflow-auto whitespace-pre-wrap break-all border-t border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                    {rule.raw}
                  </pre>
                )}
              </div>
            )}
          </div>
        )
      })}

      {entry.matchedRules.filter((r) => !r.id || !messages.some((m) => m.id === r.id)).length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Other rule text recorded (part K)
          </h4>
          <div className="space-y-2">
            {entry.matchedRules
              .filter((r) => !r.id || !messages.some((m) => m.id === r.id))
              .map((r, i) => (
                <pre
                  key={i}
                  className="mono overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300"
                >
                  {r.raw}
                </pre>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
