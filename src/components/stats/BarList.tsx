import type { CountItem } from '../../lib/stats'
import { seqBlue } from '../../lib/palette'

interface Props {
  items: CountItem[]
  maxItems?: number
  colorFor?: (item: CountItem) => string
  emptyLabel?: string
  onSelect?: (item: CountItem) => void
  formatLabel?: (item: CountItem) => string
}

export default function BarList({ items, maxItems = 8, colorFor, emptyLabel = 'No data.', onSelect, formatLabel }: Props) {
  if (items.length === 0) {
    return <p className="px-1 py-4 text-sm text-slate-500 italic">{emptyLabel}</p>
  }

  const shown = items.slice(0, maxItems)
  const overflowCount = items.length - shown.length
  const overflowSum = items.slice(maxItems).reduce((a, b) => a + b.count, 0)
  const max = Math.max(...shown.map((i) => i.count), 1)

  return (
    <div className="flex flex-col gap-1.5">
      {shown.map((item) => {
        const color = colorFor ? colorFor(item) : seqBlue
        const widthPct = Math.max((item.count / max) * 100, 3)
        const Tag = onSelect ? 'button' : 'div'
        return (
          <Tag
            key={item.key}
            {...(onSelect ? { onClick: () => onSelect(item), type: 'button' as const } : {})}
            className={[
              'group relative flex w-full flex-col gap-0.5 rounded-md px-1 py-1 text-left',
              onSelect ? 'cursor-pointer hover:bg-slate-800/60 focus:bg-slate-800/60 focus:outline-none' : '',
            ].join(' ')}
            title={`${item.count.toLocaleString()} (${(item.pct * 100).toFixed(1)}%)`}
          >
            <span className="flex items-center gap-2">
              <span className="mono w-28 shrink-0 truncate text-xs text-slate-300" title={item.label}>
                {formatLabel ? formatLabel(item) : item.label}
              </span>
              <span className="relative h-4 flex-1 overflow-hidden rounded bg-slate-800/70">
                <span
                  className="absolute inset-y-0 left-0 rounded-r"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-xs tabular-nums text-slate-400">
                {item.count.toLocaleString()}
              </span>
              {item.outlier && (
                <span className="shrink-0 rounded-md bg-red-950 px-1.5 py-0.5 text-[10px] font-medium text-red-300 ring-1 ring-inset ring-red-900">
                  outlier
                </span>
              )}
            </span>
            {item.sublabel && (
              <span className="truncate pl-[7.5rem] text-[11px] text-slate-500">{item.sublabel}</span>
            )}
          </Tag>
        )
      })}
      {overflowCount > 0 && (
        <p className="px-1 pt-1 text-xs text-slate-500">
          +{overflowCount} more ({overflowSum.toLocaleString()} requests)
        </p>
      )}
    </div>
  )
}
