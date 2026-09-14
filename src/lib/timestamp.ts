const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

/**
 * Parses the timestamps found in ModSecurity audit logs: the Apache
 * common-log style used in the native format's part A
 * ("14/Sep/2026:10:15:32 +0000"), falling back to whatever the JS Date
 * constructor understands (covers JSON audit logs' ctime-style strings and
 * ISO 8601).
 */
export function parseAuditTimestamp(ts: string | undefined): Date | null {
  if (!ts) return null

  const m = ts.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/)
  if (m) {
    const [, day, mon, year, hh, mm, ss, tz] = m
    const month = MONTHS[mon]
    if (month === undefined) return null
    let offsetMin = 0
    if (tz) {
      const sign = tz[0] === '-' ? -1 : 1
      offsetMin = sign * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(3, 5)))
    }
    const wallUtcMs = Date.UTC(Number(year), month, Number(day), Number(hh), Number(mm), Number(ss))
    return new Date(wallUtcMs - offsetMin * 60_000)
  }

  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? null : d
}

const BUCKET_LADDER_MS = [
  60_000, // 1 minute
  5 * 60_000,
  15 * 60_000,
  60 * 60_000, // 1 hour
  6 * 60 * 60_000,
  24 * 60 * 60_000, // 1 day
  7 * 24 * 60 * 60_000,
  30 * 24 * 60 * 60_000,
]

/** Picks a bucket size that yields roughly 10-30 buckets across the given span. */
export function pickBucketSizeMs(spanMs: number): number {
  if (spanMs <= 0) return BUCKET_LADDER_MS[0]
  for (const size of BUCKET_LADDER_MS) {
    if (spanMs / size <= 30) return size
  }
  return BUCKET_LADDER_MS[BUCKET_LADDER_MS.length - 1]
}

export function formatBucketLabel(ms: number, bucketSizeMs: number): string {
  const d = new Date(ms)
  if (bucketSizeMs >= 24 * 60 * 60_000) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  if (bucketSizeMs >= 60 * 60_000) {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })
  }
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
