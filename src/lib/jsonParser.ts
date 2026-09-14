import type { AuditMessage, HttpHeaderBlock, LogEntry, MatchedRule } from './types'

// Best-effort mapping of ModSecurity v3 / nginx-connector JSON audit log
// entries (one JSON object per line, or a JSON array of objects) onto the
// same LogEntry shape used for the classic "native" format.

function toHeaderBlock(
  headers: Record<string, string> | undefined,
  startLine: string,
): HttpHeaderBlock | null {
  if (!startLine && !headers) return null
  const list = Object.entries(headers ?? {}).map(([name, value]) => ({ name, value: String(value) }))
  const raw = [startLine, ...list.map((h) => `${h.name}: ${h.value}`)].join('\n')
  return { startLine, headers: list, raw }
}

function messageFromJson(m: any): AuditMessage {
  const d = m?.details ?? {}
  const tags: string[] = Array.isArray(d.tags) ? d.tags : []
  const text = m?.message ?? d.match ?? ''
  return {
    kind: 'message',
    raw: JSON.stringify(m),
    text,
    disposition: undefined,
    fields: {},
    id: d.ruleId !== undefined ? String(d.ruleId) : undefined,
    ruleFile: d.file,
    ruleLine: d.lineNumber !== undefined ? String(d.lineNumber) : undefined,
    msg: d.msg ?? text,
    data: d.data,
    severity: d.severity !== undefined ? String(d.severity) : undefined,
    tags,
  }
}

function tryParseEntry(obj: any, entryIndex: number): LogEntry | null {
  const tx = obj?.transaction ?? obj
  if (!tx) return null

  const request = tx.request ?? {}
  const response = tx.response ?? {}
  const messagesJson: any[] = tx.messages ?? []
  const messages = messagesJson.map(messageFromJson)

  const requestStartLine = request.method
    ? `${request.method} ${request.uri ?? request.uri_raw ?? ''} HTTP/${request.http_version ?? '1.1'}`
    : ''
  const responseStartLine = response.status
    ? `HTTP/${response.http_version ?? '1.1'} ${response.status} ${response.status_text ?? ''}`.trim()
    : ''

  const requestHeaders = toHeaderBlock(request.headers, requestStartLine)
  const responseHeaders = toHeaderBlock(response.headers, responseStartLine)

  const matchedRules: MatchedRule[] = messagesJson
    .filter((m) => m?.details?.ruleId)
    .map((m) => ({
      raw: JSON.stringify(m),
      summary: `id:${m.details.ruleId} ${m.message ?? ''}`.trim(),
      id: String(m.details.ruleId),
    }))

  const ruleIds = Array.from(new Set(matchedRules.map((r) => r.id).filter((x): x is string => !!x)))
  const tags = Array.from(new Set(messages.flatMap((m) => m.tags)))

  const raw = JSON.stringify(obj, null, 2)
  const uniqueId = tx.transaction_id ?? tx.unique_id ?? `entry-${entryIndex}`

  return {
    entryIndex,
    boundary: uniqueId,
    uniqueId,
    raw,
    parseErrors: [],
    header: {
      raw: '',
      timestamp: tx.time_stamp ?? tx.timestamp,
      uniqueId,
      clientIp: tx.client_ip,
      clientPort: tx.client_port !== undefined ? String(tx.client_port) : undefined,
      serverIp: tx.host_ip,
      serverPort: tx.host_port !== undefined ? String(tx.host_port) : undefined,
    },
    requestHeaders,
    requestBody: typeof request.body === 'string' ? request.body : request.body ? JSON.stringify(request.body, null, 2) : null,
    reducedRequestBody: null,
    uploadedFiles: null,
    intendedResponseBody: null,
    responseHeaders,
    responseBody:
      typeof response.body === 'string' ? response.body : response.body ? JSON.stringify(response.body, null, 2) : null,
    trailer: {
      raw: messages.map((m) => m.raw).join('\n'),
      messages,
      producer: tx.producer ? JSON.stringify(tx.producer) : undefined,
      server: undefined,
      engineMode: undefined,
      action: undefined,
      stopwatch: undefined,
      stopwatch2: undefined,
      responseBodyTransformed: undefined,
      extra: {},
    },
    matchedRules,
    rawParts: {},
    timestamp: tx.time_stamp ?? tx.timestamp,
    clientIp: tx.client_ip,
    method: request.method,
    uri: request.uri ?? request.uri_raw,
    protocol: request.http_version ? `HTTP/${request.http_version}` : undefined,
    status: response.status !== undefined ? String(response.status) : undefined,
    ruleIds,
    tags,
    anomalyScore: undefined,
    intercepted: messages.some((m) => /intercepted|denied/i.test(m.text)),
    highestSeverity: messages.map((m) => m.severity).filter(Boolean).sort()[0],
  }
}

/** Returns null if `text` does not look like JSON (NDJSON or a JSON array) at all. */
export function tryParseJsonAuditLog(text: string): { entries: LogEntry[]; warnings: string[] } | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null

  const warnings: string[] = []
  const objects: any[] = []

  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed)
      if (Array.isArray(arr)) objects.push(...arr)
      else return null
    } catch {
      return null
    }
  } else {
    // NDJSON: one JSON object per line.
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0)
    let parsedAny = false
    for (const line of lines) {
      try {
        objects.push(JSON.parse(line))
        parsedAny = true
      } catch {
        warnings.push(`Skipped a line that could not be parsed as JSON: ${line.slice(0, 80)}...`)
      }
    }
    if (!parsedAny) return null
  }

  const entries = objects
    .map((obj, i) => tryParseEntry(obj, i))
    .filter((e): e is LogEntry => e !== null)

  if (entries.length === 0) return null
  return { entries, warnings }
}
