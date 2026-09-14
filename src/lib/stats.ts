import type { LogEntry } from './types'
import { formatBucketLabel, parseAuditTimestamp, pickBucketSizeMs } from './timestamp'

export interface CountItem {
  key: string
  label: string
  count: number
  pct: number
  sublabel?: string
  outlier?: boolean
}

function rank(counts: Map<string, number>, sublabels?: Map<string, string>): CountItem[] {
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: key, count, pct: count / total, sublabel: sublabels?.get(key) }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function bump(map: Map<string, number>, key: string | undefined) {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + 1)
}

export interface Overview {
  total: number
  intercepted: number
  interceptedPct: number
  uniqueClientIps: number
  uniqueRules: number
  errorStatusPct: number // 4xx + 5xx share
}

export function computeOverview(entries: LogEntry[]): Overview {
  const total = entries.length
  const intercepted = entries.filter((e) => e.intercepted).length
  const clientIps = new Set(entries.map((e) => e.clientIp).filter(Boolean))
  const ruleIds = new Set(entries.flatMap((e) => e.ruleIds))
  const withStatus = entries.filter((e) => e.status)
  const errorStatus = withStatus.filter((e) => Number(e.status) >= 400).length

  return {
    total,
    intercepted,
    interceptedPct: total ? intercepted / total : 0,
    uniqueClientIps: clientIps.size,
    uniqueRules: ruleIds.size,
    errorStatusPct: withStatus.length ? errorStatus / withStatus.length : 0,
  }
}

export function computeStatusCodeStats(entries: LogEntry[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const e of entries) bump(counts, e.status ?? 'none')
  return rank(counts)
}

export function computeRuleStats(entries: LogEntry[]): CountItem[] {
  const counts = new Map<string, number>()
  const msgs = new Map<string, string>()
  for (const e of entries) {
    for (const m of e.trailer?.messages ?? []) {
      if (!m.id) continue
      bump(counts, m.id)
      if (!msgs.has(m.id)) msgs.set(m.id, m.msg ?? m.text)
    }
  }
  return rank(counts, msgs)
}

export function computeTagStats(entries: LogEntry[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const e of entries) for (const t of e.tags) bump(counts, t)
  return rank(counts)
}

export function computeMethodStats(entries: LogEntry[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const e of entries) bump(counts, e.method ?? 'unknown')
  return rank(counts)
}

/** Client IPs ranked by request count, with simple outliers flagged (mean + 2*stddev). */
export function computeClientIpStats(entries: LogEntry[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const e of entries) bump(counts, e.clientIp)
  const items = rank(counts)

  if (items.length >= 4) {
    const values = items.map((i) => i.count)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
    const threshold = mean + 2 * Math.sqrt(variance)
    for (const item of items) {
      if (item.count > threshold && item.count > mean) item.outlier = true
    }
  }
  return items
}

export interface TimelineBucket {
  start: number
  label: string
  total: number
  intercepted: number
  allowed: number
}

export interface Timeline {
  buckets: TimelineBucket[]
  bucketSizeMs: number
  unparsedCount: number
}

export function computeTimeline(entries: LogEntry[]): Timeline {
  const withTime = entries
    .map((e) => ({ e, d: parseAuditTimestamp(e.timestamp) }))
    .filter((x): x is { e: LogEntry; d: Date } => x.d !== null)
  const unparsedCount = entries.length - withTime.length

  if (withTime.length === 0) {
    return { buckets: [], bucketSizeMs: 0, unparsedCount }
  }

  const times = withTime.map((x) => x.d.getTime())
  const min = Math.min(...times)
  const max = Math.max(...times)
  const bucketSizeMs = pickBucketSizeMs(max - min)
  const bucketStart = (t: number) => Math.floor(t / bucketSizeMs) * bucketSizeMs

  const bucketMap = new Map<number, TimelineBucket>()
  for (const { e, d } of withTime) {
    const start = bucketStart(d.getTime())
    let bucket = bucketMap.get(start)
    if (!bucket) {
      bucket = { start, label: formatBucketLabel(start, bucketSizeMs), total: 0, intercepted: 0, allowed: 0 }
      bucketMap.set(start, bucket)
    }
    bucket.total++
    if (e.intercepted) bucket.intercepted++
    else bucket.allowed++
  }

  const firstBucket = bucketStart(min)
  const lastBucket = bucketStart(max)
  const buckets: TimelineBucket[] = []
  for (let start = firstBucket; start <= lastBucket; start += bucketSizeMs) {
    buckets.push(
      bucketMap.get(start) ?? { start, label: formatBucketLabel(start, bucketSizeMs), total: 0, intercepted: 0, allowed: 0 },
    )
  }

  return { buckets, bucketSizeMs, unparsedCount }
}
