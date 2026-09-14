import { memo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogEntry } from '../lib/types'
import Badge, { methodTone, statusTone } from './Badge'
import EntryDetail from './EntryDetail'

interface Props {
  entries: LogEntry[]
  expandedId: string | null
  onToggle: (id: string) => void
}

// Shared between the header and every row so columns line up. A plain CSS
// grid (rather than a <table>) is what lets rows be absolutely positioned
// for virtualization while keeping column alignment.
const GRID_COLS = '245px 145px 100px minmax(0,1fr) 90px 150px minmax(150px,220px)'
const ROW_HEIGHT = 37

function entryKeyOf(e: LogEntry): string {
  return `${e.entryIndex}-${e.uniqueId}`
}

function shortUri(uri: string | undefined, max = 60) {
  if (!uri) return ''
  return uri.length > max ? uri.slice(0, max - 1) + '…' : uri
}

const EntryRow = memo(function EntryRow({
  entry,
  entryKey,
  expanded,
  onToggle,
}: {
  entry: LogEntry
  entryKey: string
  expanded: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div
      onClick={() => onToggle(entryKey)}
      style={{ display: 'grid', gridTemplateColumns: GRID_COLS, height: ROW_HEIGHT }}
      className={[
        'cursor-pointer items-center overflow-hidden border-b border-slate-800/70 text-sm transition-colors',
        expanded ? 'bg-slate-900' : 'hover:bg-slate-900/60',
        entry.intercepted ? 'border-l-2 border-l-red-600' : 'border-l-2 border-l-transparent',
      ].join(' ')}
    >
      <div className="mono truncate px-3 text-slate-400">{entry.timestamp ?? '—'}</div>
      <div className="mono truncate px-3 text-slate-300">{entry.clientIp ?? '—'}</div>
      <div className="truncate px-3">
        {entry.method ? <Badge tone={methodTone(entry.method)}>{entry.method}</Badge> : '—'}
      </div>
      <div className="mono truncate px-3 text-slate-200" title={entry.uri}>
        {shortUri(entry.uri) || '—'}
      </div>
      <div className="truncate px-3">
        {entry.status ? <Badge tone={statusTone(entry.status)}>{entry.status}</Badge> : '—'}
      </div>
      <div className="truncate px-3 text-slate-400">
        {entry.ruleIds.length > 0 ? (
          <span className="mono">
            {entry.ruleIds.slice(0, 3).join(', ')}
            {entry.ruleIds.length > 3 ? ` +${entry.ruleIds.length - 3}` : ''}
          </span>
        ) : (
          '—'
        )}
      </div>
      <div className="flex flex-nowrap items-center gap-1 overflow-hidden px-3">
        {entry.tags.slice(0, 2).map((t) => (
          <Badge key={t} tone="sky">
            {t}
          </Badge>
        ))}
        {entry.tags.length > 2 && <span className="text-xs text-slate-500">+{entry.tags.length - 2}</span>}
      </div>
    </div>
  )
})

const HEADERS = ['Time', 'Client IP', 'Method', 'URI', 'Status', 'Rules', 'Tags']

export default function EntryTable({ entries, expandedId, onToggle }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    getItemKey: (index) => entryKeyOf(entries[index]),
  })

  if (entries.length === 0) {
    return <p className="flex-1 p-8 text-center text-sm text-slate-500">No entries match the current filters.</p>
  }

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
      <div
        className="sticky top-0 z-10 grid bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-500"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        {HEADERS.map((h) => (
          <div key={h} className="truncate px-3 py-2 font-medium">
            {h}
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const entry = entries[vi.index]
          const key = entryKeyOf(entry)
          const expanded = expandedId === key
          return (
            <div
              key={vi.key}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
            >
              <EntryRow entry={entry} entryKey={key} expanded={expanded} onToggle={onToggle} />
              {expanded && <EntryDetail entry={entry} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
