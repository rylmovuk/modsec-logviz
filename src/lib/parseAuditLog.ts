import type { ParseResult } from './types'
import { parseNativeAuditLog } from './nativeParser'
import { tryParseJsonAuditLog } from './jsonParser'

export function parseAuditLog(text: string): ParseResult {
  const json = tryParseJsonAuditLog(text)
  if (json) {
    return { format: 'json', entries: json.entries, warnings: json.warnings }
  }
  const native = parseNativeAuditLog(text)
  return { format: 'native', entries: native.entries, warnings: native.warnings }
}

export * from './types'
