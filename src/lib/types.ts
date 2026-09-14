export type AuditLogPartLetter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'Z'

export interface HttpHeader {
  name: string
  value: string
}

/** Part B (request headers) or F (response headers): the start line + header fields. */
export interface HttpHeaderBlock {
  /** Request line ("GET /foo HTTP/1.1") or status line ("HTTP/1.1 403 Forbidden"). */
  startLine: string
  headers: HttpHeader[]
  raw: string
}

/** One `Message:` or `Apache-Error:` line from the audit log trailer (part H). */
export interface AuditMessage {
  kind: 'message' | 'apache-error'
  raw: string
  /** Free-text portion before the first bracketed [key "value"] token. */
  text: string
  /** e.g. "Warning" / "Access denied" / "Notice", parsed from the start of `text`. */
  disposition?: string
  fields: Record<string, string[]>
  id?: string
  ruleFile?: string
  ruleLine?: string
  msg?: string
  data?: string
  severity?: string
  tags: string[]
}

export interface AuditLogHeader {
  raw: string
  timestamp?: string
  uniqueId?: string
  clientIp?: string
  clientPort?: string
  serverIp?: string
  serverPort?: string
}

export interface AuditLogTrailer {
  raw: string
  messages: AuditMessage[]
  producer?: string
  server?: string
  engineMode?: string
  action?: string
  stopwatch?: string
  stopwatch2?: string
  responseBodyTransformed?: string
  extra: Record<string, string>
}

export interface MatchedRule {
  raw: string
  /** First line, e.g. `SecRule ARGS "@rx <script" "id:941100,phase:2,...` */
  summary: string
  id?: string
}

export interface UploadedFileInfo {
  raw: string
  filename?: string
  contentType?: string
  size?: string
}

export interface LogEntry {
  entryIndex: number
  boundary: string
  uniqueId: string
  raw: string
  parseErrors: string[]

  header: AuditLogHeader | null
  requestHeaders: HttpHeaderBlock | null // part B
  requestBody: string | null // part C
  reducedRequestBody: string | null // part I (alternative to C for multipart)
  uploadedFiles: UploadedFileInfo[] | null // part J
  intendedResponseBody: string | null // part E
  responseHeaders: HttpHeaderBlock | null // part F
  responseBody: string | null // part G
  trailer: AuditLogTrailer | null // part H
  matchedRules: MatchedRule[] // part K

  rawParts: Partial<Record<AuditLogPartLetter, string>>

  // Derived / convenience fields used for filtering & the list view.
  timestamp?: string
  clientIp?: string
  method?: string
  uri?: string
  protocol?: string
  status?: string
  ruleIds: string[]
  tags: string[]
  anomalyScore?: string
  intercepted: boolean
  highestSeverity?: string
}

export interface ParseResult {
  format: 'native' | 'json'
  entries: LogEntry[]
  warnings: string[]
}
