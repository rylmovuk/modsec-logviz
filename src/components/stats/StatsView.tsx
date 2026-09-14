import { useMemo } from 'react'
import type { LogEntry } from '../../lib/types'
import {
  computeClientIpStats,
  computeMethodStats,
  computeOverview,
  computeRuleStats,
  computeStatusCodeStats,
  computeTagStats,
  computeTimeline,
  type CountItem,
} from '../../lib/stats'
import { statusClassColor, statusClassLabel } from '../../lib/palette'
import StatTile from './StatTile'
import BarList from './BarList'
import Timeline from './Timeline'

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  )
}

interface Props {
  entries: LogEntry[]
  onFilterByRule?: (ruleId: string) => void
  onFilterByIp?: (ip: string) => void
}

export default function StatsView({ entries, onFilterByRule, onFilterByIp }: Props) {
  const overview = useMemo(() => computeOverview(entries), [entries])
  const statusStats = useMemo(() => computeStatusCodeStats(entries), [entries])
  const ruleStats = useMemo(() => computeRuleStats(entries), [entries])
  const ipStats = useMemo(() => computeClientIpStats(entries), [entries])
  const tagStats = useMemo(() => computeTagStats(entries), [entries])
  const methodStats = useMemo(() => computeMethodStats(entries), [entries])
  const timeline = useMemo(() => computeTimeline(entries), [entries])

  if (entries.length === 0) {
    return <p className="p-8 text-center text-sm text-slate-500">No entries to summarize.</p>
  }

  const statusColor = (item: CountItem) => statusClassColor(item.key === 'none' ? undefined : item.key)
  const methodColorMap: Record<string, string> = {
    GET: '#3987e5',
    POST: '#0ca30c',
    PUT: '#fab219',
    PATCH: '#fab219',
    DELETE: '#d03b3b',
  }

  return (
    <div className="flex-1 space-y-4 overflow-auto p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Total requests" value={overview.total.toLocaleString()} />
        <StatTile
          label="Intercepted"
          value={overview.intercepted.toLocaleString()}
          sublabel={`${(overview.interceptedPct * 100).toFixed(1)}% of requests`}
          tone={overview.intercepted > 0 ? 'critical' : 'good'}
        />
        <StatTile label="Unique client IPs" value={overview.uniqueClientIps.toLocaleString()} />
        <StatTile label="Distinct rules triggered" value={overview.uniqueRules.toLocaleString()} />
        <StatTile
          label="Error responses"
          value={`${(overview.errorStatusPct * 100).toFixed(1)}%`}
          sublabel="4xx + 5xx of responses with a status"
        />
      </div>

      <Card title="Request volume over time" subtitle="Allowed vs. intercepted, bucketed automatically from timestamps">
        <Timeline data={timeline} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Most frequently matched rules" subtitle="By rule id, across all triggered messages">
          <BarList items={ruleStats} colorFor={() => '#3987e5'} onSelect={onFilterByRule ? (i) => onFilterByRule(i.key) : undefined} emptyLabel="No rules matched in this set." />
        </Card>

        <Card title="Response status codes" subtitle="Colored by status class">
          <BarList items={statusStats} colorFor={statusColor} formatLabel={(i) => (i.key === 'none' ? 'no status' : i.key)} />
          <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-800 pt-2 text-[11px] text-slate-400">
            {(['2xx', '3xx', '4xx', '5xx'] as const).map((cls) => (
              <span key={cls} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusClassColor(cls === '2xx' ? '200' : cls === '3xx' ? '300' : cls === '4xx' ? '400' : '500') }}
                />
                {statusClassLabel(cls === '2xx' ? '200' : cls === '3xx' ? '300' : cls === '4xx' ? '400' : '500')}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Requests by client IP" subtitle="Ranked by volume — outliers flagged at mean + 2σ">
          <BarList items={ipStats} colorFor={(i) => (i.outlier ? '#d03b3b' : '#3987e5')} onSelect={onFilterByIp ? (i) => onFilterByIp(i.key) : undefined} emptyLabel="No client IPs recorded." />
        </Card>

        <Card title="Most common tags">
          <BarList items={tagStats} colorFor={() => '#3987e5'} emptyLabel="No tags recorded." />
        </Card>
      </div>

      <Card title="Requests by HTTP method">
        <div className="flex flex-wrap gap-4">
          {methodStats.map((m) => (
            <div key={m.key} className="flex min-w-[90px] items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: methodColorMap[m.key] ?? '#5c5b57' }}
              />
              <span className="text-sm text-slate-200">{m.key}</span>
              <span className="ml-auto text-sm tabular-nums text-slate-400">{m.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
