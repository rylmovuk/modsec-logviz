import type { LogEntry } from './types'

export interface Filters {
  text: string
  method: string
  status: string
  tag: string
  interceptedOnly: boolean
}

export const EMPTY_FILTERS: Filters = {
  text: '',
  method: '',
  status: '',
  tag: '',
  interceptedOnly: false,
}

export function applyFilters(entries: LogEntry[], filters: Filters): LogEntry[] {
  const text = filters.text.trim().toLowerCase()

  return entries.filter((e) => {
    if (filters.method && e.method !== filters.method) return false
    if (filters.status && e.status !== filters.status) return false
    if (filters.tag && !(e.tags.includes(filters.tag) || e.ruleIds.includes(filters.tag))) return false
    if (filters.interceptedOnly && !e.intercepted) return false

    if (text) {
      const haystack = [
        e.uniqueId,
        e.clientIp,
        e.method,
        e.uri,
        e.status,
        ...e.ruleIds,
        ...e.tags,
        e.trailer?.messages.map((m) => m.msg ?? m.text).join(' ') ?? '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(text)) return false
    }

    return true
  })
}

export function uniqueSorted(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort()
}
