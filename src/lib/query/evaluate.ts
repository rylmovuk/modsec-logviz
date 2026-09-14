import type { LogEntry } from '../types'
import { findHeader } from '../httpParse'
import { parseAuditTimestamp } from '../timestamp'
import type { QueryNode } from './ast'

const SEVERITY_NAMES: Record<string, string> = {
  emergency: '0',
  alert: '1',
  critical: '2',
  error: '3',
  warning: '4',
  notice: '5',
  info: '6',
  debug: '7',
}

/** Normalizes a severity predicate value (a name like "WARNING" or a raw number) to ModSecurity's numeric severity string. */
function normalizeSeverity(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  if (trimmed in SEVERITY_NAMES) return SEVERITY_NAMES[trimmed]
  if (/^\d+$/.test(trimmed)) return trimmed
  return null
}

function includesCI(haystack: string | undefined, needle: string): boolean {
  return !!haystack && haystack.toLowerCase().includes(needle.toLowerCase())
}

function equalsCI(a: string | undefined, b: string): boolean {
  return !!a && a.toLowerCase() === b.toLowerCase()
}

function matchesStatus(entry: LogEntry, value: string): boolean {
  const v = value.trim().toLowerCase()
  if (v === 'none' || v === '-') return !entry.status
  const classMatch = v.match(/^([1-5])xx$/)
  if (classMatch) return !!entry.status && entry.status[0] === classMatch[1]
  return entry.status === value.trim()
}

function matchesDateBound(entry: LogEntry, value: string, bound: 'after' | 'before'): boolean {
  const target = parseAuditTimestamp(value.trim())
  if (!target) return false
  const entryDate = parseAuditTimestamp(entry.timestamp)
  if (!entryDate) return false
  return bound === 'after' ? entryDate.getTime() >= target.getTime() : entryDate.getTime() < target.getTime()
}

function matchesBoolean(value: string, actual: boolean): boolean {
  const v = value.trim().toLowerCase()
  if (['true', 'yes', '1'].includes(v)) return actual
  if (['false', 'no', '0'].includes(v)) return !actual
  return false
}

function matchPredicate(entry: LogEntry, key: string, value: string): boolean {
  switch (key) {
    case 'rule':
    case 'ruleid':
    case 'id':
      if (key === 'id') return equalsCI(entry.uniqueId, value) || entry.ruleIds.some((r) => equalsCI(r, value))
      return entry.ruleIds.some((r) => equalsCI(r, value))
    case 'tag':
      return entry.tags.some((t) => equalsCI(t, value))
    case 'severity': {
      const normalized = normalizeSeverity(value)
      if (normalized === null) return false
      return (entry.trailer?.messages ?? []).some((m) => m.severity === normalized)
    }
    case 'status':
    case 'code':
      return matchesStatus(entry, value)
    case 'method':
      return equalsCI(entry.method, value)
    case 'ip':
    case 'clientip':
      return includesCI(entry.clientIp, value)
    case 'uri':
    case 'path':
    case 'url':
      return includesCI(entry.uri, value)
    case 'host':
      return includesCI(findHeader(entry.requestHeaders, 'Host'), value)
    case 'msg':
    case 'message':
      return (entry.trailer?.messages ?? []).some((m) => includesCI(m.msg ?? m.text, value))
    case 'uniqueid':
      return equalsCI(entry.uniqueId, value)
    case 'intercepted':
    case 'blocked':
      return matchesBoolean(value, entry.intercepted)
    case 'after':
      return matchesDateBound(entry, value, 'after')
    case 'before':
      return matchesDateBound(entry, value, 'before')
    default:
      // Unknown field: fall back to a free-text search so typos degrade gracefully.
      return matchesFreeText(entry, `${key}:${value}`)
  }
}

function matchesFreeText(entry: LogEntry, term: string): boolean {
  const needle = term.toLowerCase()
  if (
    [entry.uniqueId, entry.clientIp, entry.method, entry.uri, entry.status, ...entry.ruleIds, ...entry.tags].some(
      (v) => v && v.toLowerCase().includes(needle),
    )
  ) {
    return true
  }
  return (entry.trailer?.messages ?? []).some((m) => includesCI(m.msg ?? m.text, term))
}

export function evaluateQuery(node: QueryNode, entry: LogEntry): boolean {
  switch (node.type) {
    case 'and':
      return evaluateQuery(node.left, entry) && evaluateQuery(node.right, entry)
    case 'or':
      return evaluateQuery(node.left, entry) || evaluateQuery(node.right, entry)
    case 'not':
      return !evaluateQuery(node.operand, entry)
    case 'predicate':
      return matchPredicate(entry, node.key, node.value)
    case 'text':
      return matchesFreeText(entry, node.value)
  }
}

export function filterEntriesByQuery(entries: LogEntry[], node: QueryNode | null): LogEntry[] {
  if (!node) return entries
  return entries.filter((e) => evaluateQuery(node, e))
}
