import { Fragment } from 'react'
import type { LogEntry } from '../lib/types'
import Badge, { methodTone, statusTone } from './Badge'
import EntryDetail from './EntryDetail'

interface Props {
  entries: LogEntry[]
  expandedId: string | null
  onToggle: (id: string) => void
}

function shortUri(uri: string | undefined, max = 60) {
  if (!uri) return ''
  return uri.length > max ? uri.slice(0, max - 1) + '…' : uri
}

export default function EntryTable({ entries, expandedId, onToggle }: Props) {
  if (entries.length === 0) {
    return <p className="p-8 text-center text-sm text-slate-500">No entries match the current filters.</p>
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-3 py-2 font-medium">Time</th>
          <th className="px-3 py-2 font-medium">Client IP</th>
          <th className="px-3 py-2 font-medium">Method</th>
          <th className="px-3 py-2 font-medium">URI</th>
          <th className="px-3 py-2 font-medium">Status</th>
          <th className="px-3 py-2 font-medium">Rules</th>
          <th className="px-3 py-2 font-medium">Tags</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => {
          const key = `${e.entryIndex}-${e.uniqueId}`
          const expanded = expandedId === key
          return (
            <Fragment key={key}>
              <tr
                key={key}
                onClick={() => onToggle(key)}
                className={[
                  'cursor-pointer border-b border-slate-800/70 transition-colors',
                  expanded ? 'bg-slate-900' : 'hover:bg-slate-900/60',
                  e.intercepted ? 'border-l-2 border-l-red-600' : 'border-l-2 border-l-transparent',
                ].join(' ')}
              >
                <td className="mono whitespace-nowrap px-3 py-2 text-slate-400">{e.timestamp ?? '—'}</td>
                <td className="mono whitespace-nowrap px-3 py-2 text-slate-300">{e.clientIp ?? '—'}</td>
                <td className="px-3 py-2">{e.method ? <Badge tone={methodTone(e.method)}>{e.method}</Badge> : '—'}</td>
                <td className="mono px-3 py-2 text-slate-200" title={e.uri}>
                  {shortUri(e.uri) || '—'}
                </td>
                <td className="px-3 py-2">{e.status ? <Badge tone={statusTone(e.status)}>{e.status}</Badge> : '—'}</td>
                <td className="px-3 py-2 text-slate-400">
                  {e.ruleIds.length > 0 ? (
                    <span className="mono">
                      {e.ruleIds.slice(0, 3).join(', ')}
                      {e.ruleIds.length > 3 ? ` +${e.ruleIds.length - 3}` : ''}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {e.tags.slice(0, 2).map((t) => (
                      <Badge key={t} tone="sky">
                        {t}
                      </Badge>
                    ))}
                    {e.tags.length > 2 && <span className="text-xs text-slate-500">+{e.tags.length - 2}</span>}
                  </div>
                </td>
              </tr>
              {expanded && (
                <tr key={key + '-detail'}>
                  <td colSpan={7} className="p-0">
                    <EntryDetail entry={e} />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
