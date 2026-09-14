/** Quotes a predicate value if it contains characters that would otherwise break tokenization. */
const RESERVED_WORDS = new Set(['and', 'or', 'not'])

export function quoteValue(value: string): string {
  const needsQuoting = value.length === 0 || /[\s()"]/.test(value) || RESERVED_WORDS.has(value.toLowerCase())
  if (needsQuoting) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return value
}

export function predicate(key: string, value: string): string {
  return `${key}:${quoteValue(value)}`
}

export function and(...clauses: string[]): string {
  const nonEmpty = clauses.filter(Boolean)
  return nonEmpty.join(' and ')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Formats a Date as a local-time "YYYY-MM-DDTHH:mm:ss" string suitable for an
 * after:/before: predicate value — matches how the query evaluator parses
 * such a string back (via `new Date(...)`, interpreted in the browser's local
 * time zone), so the round trip lands on the same instant.
 */
export function formatLocalDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Builds an `after:<start> and before:<end>` predicate for a half-open time range [start, end). */
export function dateRangeQuery(start: Date, end: Date): string {
  return and(predicate('after', formatLocalDateTime(start)), predicate('before', formatLocalDateTime(end)))
}
