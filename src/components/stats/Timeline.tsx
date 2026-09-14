import type { Timeline as TimelineData } from '../../lib/stats'
import { status } from '../../lib/palette'

export default function Timeline({ data }: { data: TimelineData }) {
  if (data.buckets.length === 0) {
    return <p className="px-1 py-4 text-sm text-slate-500 italic">No parseable timestamps to plot.</p>
  }

  const max = Math.max(...data.buckets.map((b) => b.total), 1)
  // Show at most ~10 x-axis labels so they don't collide.
  const labelEvery = Math.max(1, Math.ceil(data.buckets.length / 10))

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: status.good }} />
          Allowed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: status.critical }} />
          Intercepted
        </span>
        {data.unparsedCount > 0 && (
          <span className="ml-auto text-slate-500">{data.unparsedCount} entries without a parseable timestamp</span>
        )}
      </div>

      <div className="flex h-40 items-end gap-px">
        {data.buckets.map((b, i) => {
          const totalH = (b.total / max) * 100
          const interceptedH = b.total ? (b.intercepted / b.total) * totalH : 0
          const allowedH = totalH - interceptedH
          const nearStart = i < 2
          const nearEnd = i > data.buckets.length - 3
          const horizontalClass = nearStart
            ? 'left-0'
            : nearEnd
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2'
          return (
            <div
              key={b.start}
              className="group relative flex h-full flex-1 flex-col justify-end"
              title={`${b.label}: ${b.total} requests (${b.intercepted} intercepted)`}
              tabIndex={0}
            >
              <div
                className={`pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow-lg group-hover:block group-focus:block ${horizontalClass}`}
                style={{ bottom: `calc(${totalH}% + 6px)` }}
              >
                <strong className="tabular-nums">{b.total}</strong> at {b.label}
                {b.intercepted > 0 && <span className="text-red-300"> · {b.intercepted} intercepted</span>}
              </div>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm" style={{ height: `${totalH}%` }}>
                {b.intercepted > 0 && (
                  <div style={{ height: `${(interceptedH / (totalH || 1)) * 100}%`, backgroundColor: status.critical }} />
                )}
                {b.allowed > 0 && (
                  <div style={{ height: `${(allowedH / (totalH || 1)) * 100}%`, backgroundColor: status.good }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex text-[10px] text-slate-500">
        {data.buckets.map((b, i) => (
          <div key={b.start} className="flex-1 truncate text-center">
            {i % labelEvery === 0 ? b.label : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
