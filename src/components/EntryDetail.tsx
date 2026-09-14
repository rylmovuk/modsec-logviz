import { useState } from 'react'
import type { LogEntry } from '../lib/types'
import Badge, { statusTone } from './Badge'
import HeaderBlockView from './detail/HeaderBlockView'
import BodyView from './detail/BodyView'
import RulesTab from './detail/RulesTab'
import TrailerTab from './detail/TrailerTab'
import RawTab from './detail/RawTab'

type TabKey = 'request' | 'response' | 'rules' | 'trailer' | 'tags' | 'raw'

export default function EntryDetail({ entry }: { entry: LogEntry }) {
  const [tab, setTab] = useState<TabKey>('rules')

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'request', label: 'Request' },
    { key: 'response', label: 'Response' },
    { key: 'rules', label: 'Matched rules', count: entry.trailer?.messages.length || undefined },
    { key: 'trailer', label: 'Audit trailer' },
    { key: 'tags', label: 'Tags', count: entry.tags.length || undefined },
    { key: 'raw', label: 'Raw' },
  ]

  return (
    <div className="flex h-[32rem] flex-col border-t border-slate-800 bg-slate-950">
      {entry.parseErrors.length > 0 && (
        <div className="border-b border-amber-900 bg-amber-950/60 px-3 py-1.5 text-xs text-amber-300">
          {entry.parseErrors.join(' ')}
        </div>
      )}

      <div className="flex shrink-0 gap-1 border-b border-slate-800 bg-slate-900/40 px-3 pt-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'rounded-t-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-slate-950 text-sky-300 border border-b-0 border-slate-800'
                : 'text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            {t.label}
            {t.count ? <span className="ml-1 text-xs text-slate-500">({t.count})</span> : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'request' && (
          <div className="grid h-full grid-cols-1 divide-y divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
            <HeaderBlockView block={entry.requestHeaders} emptyLabel="No request headers recorded (part B)." />
            <BodyView
              body={entry.requestBody ?? entry.reducedRequestBody}
              emptyLabel="No request body recorded (parts C / I)."
            />
          </div>
        )}

        {tab === 'response' && (
          <div className="grid h-full grid-cols-1 divide-y divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
            <HeaderBlockView block={entry.responseHeaders} emptyLabel="No response headers recorded (part F)." />
            <BodyView
              body={entry.responseBody ?? entry.intendedResponseBody}
              emptyLabel="No response body recorded (parts G / E)."
            />
          </div>
        )}

        {tab === 'rules' && <RulesTab entry={entry} />}
        {tab === 'trailer' && <TrailerTab entry={entry} />}

        {tab === 'tags' && (
          <div className="flex h-full flex-wrap content-start gap-2 overflow-auto p-3">
            {entry.tags.length === 0 && <p className="text-sm text-slate-500 italic">No tags recorded.</p>}
            {entry.tags.map((t) => (
              <Badge key={t} tone="sky">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {tab === 'raw' && <RawTab entry={entry} />}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-500">
        <span>
          unique_id: <span className="mono text-slate-300">{entry.uniqueId}</span>
        </span>
        {entry.status && (
          <span>
            status: <Badge tone={statusTone(entry.status)}>{entry.status}</Badge>
          </span>
        )}
        {entry.anomalyScore && <span>anomaly: {entry.anomalyScore}</span>}
        {entry.uploadedFiles && entry.uploadedFiles.length > 0 && (
          <span>{entry.uploadedFiles.length} uploaded file(s)</span>
        )}
      </div>
    </div>
  )
}
