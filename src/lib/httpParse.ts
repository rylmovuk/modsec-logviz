import type { HttpHeaderBlock, HttpHeader } from './types'

/**
 * Parses a raw HTTP request-header or response-header block (ModSecurity
 * audit log parts B / F): a start line followed by "Name: Value" header
 * lines, with folded (indented) continuation lines supported.
 */
export function parseHeaderBlock(raw: string): HttpHeaderBlock | null {
  const text = raw.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '')
  if (!text) return null
  const lines = text.split('\n')
  const startLine = lines[0] ?? ''
  const headers: HttpHeader[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line === '') continue
    if (/^[ \t]/.test(line) && headers.length > 0) {
      // Folded header continuation.
      headers[headers.length - 1].value += ' ' + line.trim()
      continue
    }
    const idx = line.indexOf(':')
    if (idx === -1) {
      headers.push({ name: line.trim(), value: '' })
      continue
    }
    headers.push({
      name: line.slice(0, idx).trim(),
      value: line.slice(idx + 1).trim(),
    })
  }

  return { startLine, headers, raw: text }
}

export function findHeader(block: HttpHeaderBlock | null, name: string): string | undefined {
  if (!block) return undefined
  const lower = name.toLowerCase()
  return block.headers.find((h) => h.name.toLowerCase() === lower)?.value
}

/** Parses "GET /path?x=1 HTTP/1.1" into its components. */
export function parseRequestLine(line: string): { method?: string; uri?: string; protocol?: string } {
  const m = line.match(/^(\S+)\s+(\S+)\s+(HTTP\/\S+)\s*$/)
  if (!m) return {}
  return { method: m[1], uri: m[2], protocol: m[3] }
}

/** Parses "HTTP/1.1 403 Forbidden" into its components. */
export function parseStatusLine(line: string): { protocol?: string; status?: string; reason?: string } {
  const m = line.match(/^(HTTP\/\S+)\s+(\d{3})\s*(.*)$/)
  if (!m) return {}
  return { protocol: m[1], status: m[2], reason: m[3] }
}
