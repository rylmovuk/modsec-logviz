import type {
  AuditLogHeader,
  AuditLogPartLetter,
  LogEntry,
  UploadedFileInfo,
} from './types'
import { findHeader, parseHeaderBlock, parseRequestLine, parseStatusLine } from './httpParse'
import { parseTrailer } from './trailerParse'

const BOUNDARY_RE = /^--([0-9A-Za-z]{1,80})-([A-KZ])--\s*$/
const PART_LETTERS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'Z'])

function parseHeaderPart(raw: string): AuditLogHeader | null {
  const text = raw.trim()
  if (!text) return null
  // [27/Jul/2009:06:20:57 +0100] Ktqx7n8AAAEAABPYA1kAAAAK 216.34.181.45 51139 10.0.0.98 80
  const m = text.match(/^\[([^\]]+)\]\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/)
  if (!m) return { raw: text }
  return {
    raw: text,
    timestamp: m[1],
    uniqueId: m[2],
    clientIp: m[3],
    clientPort: m[4],
    serverIp: m[5],
    serverPort: m[6],
  }
}

function parseUploadedFiles(raw: string | undefined): UploadedFileInfo[] | null {
  if (!raw) return null
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return null
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  return lines.map((line) => {
    const filename = line.match(/Filename:\s*"((?:[^"\\]|\\.)*)"/)?.[1]
    const contentType = line.match(/Content-Type:\s*"((?:[^"\\]|\\.)*)"/)?.[1]
    const size = line.match(/Size:\s*"?(\d+)"?/)?.[1]
    return { raw: line, filename, contentType, size }
  })
}

function splitRules(raw: string | undefined): { raw: string; summary: string; id?: string }[] {
  if (!raw) return []
  const text = raw.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '')
  if (!text) return []
  const lines = text.split('\n')
  const blocks: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (/^Sec(Rule|Action)\b/.test(line) && current.length > 0) {
      blocks.push(current.join('\n'))
      current = []
    }
    current.push(line)
  }
  if (current.length > 0) blocks.push(current.join('\n'))

  return blocks.map((block) => {
    const id = block.match(/\bid:'?"?(\d+)"?'?/)?.[1]
    const firstLine = block.split('\n')[0]
    return { raw: block, summary: firstLine, id }
  })
}

interface RawEntry {
  boundary: string
  parts: Partial<Record<AuditLogPartLetter, string>>
  raw: string
  incomplete: boolean
}

/** State-machine split of a raw native-format audit log into per-transaction raw parts. */
function splitIntoRawEntries(text: string): { entries: RawEntry[]; warnings: string[] } {
  const lines = text.split(/\r\n|\n/)
  const entries: RawEntry[] = []
  const warnings: string[] = []

  let boundary: string | null = null
  let currentLetter: AuditLogPartLetter | null = null
  let buffer: string[] = []
  let parts: Partial<Record<AuditLogPartLetter, string>> = {}
  let entryLines: string[] = []

  const closePart = () => {
    if (currentLetter) {
      const text = buffer.join('\n')
      parts[currentLetter] = parts[currentLetter] ? parts[currentLetter] + '\n' + text : text
    }
    buffer = []
  }

  const finalizeEntry = (incomplete: boolean) => {
    if (boundary === null) return
    closePart()
    entries.push({ boundary, parts, raw: entryLines.join('\n'), incomplete })
    if (incomplete) {
      warnings.push(
        `Entry with boundary "${boundary}" was not properly terminated with a Z part before the next entry started.`,
      )
    }
    boundary = null
    currentLetter = null
    parts = {}
    entryLines = []
    buffer = []
  }

  for (const line of lines) {
    const m = line.match(BOUNDARY_RE)
    if (m && PART_LETTERS.has(m[2])) {
      const [, token, letter] = m
      if (boundary === null) {
        boundary = token
        currentLetter = letter as AuditLogPartLetter
        entryLines.push(line)
        continue
      }
      if (token === boundary) {
        closePart()
        entryLines.push(line)
        if (letter === 'Z') {
          finalizeEntry(false)
        } else {
          currentLetter = letter as AuditLogPartLetter
        }
        continue
      }
      if (letter === 'A') {
        // A new transaction started without the previous one being closed by Z.
        finalizeEntry(true)
        boundary = token
        currentLetter = 'A'
        entryLines.push(line)
        continue
      }
      // Different boundary token but not a new "A" part: most likely a
      // coincidental match inside body content (e.g. a multipart boundary).
      // Treat it as ordinary content.
      buffer.push(line)
      entryLines.push(line)
      continue
    }
    if (boundary !== null) {
      buffer.push(line)
      entryLines.push(line)
    }
    // Lines before the first boundary (blank lines between entries, stray
    // whitespace) are ignored.
  }
  if (boundary !== null) {
    finalizeEntry(true)
  }

  return { entries, warnings }
}

export function parseNativeAuditLog(text: string): { entries: LogEntry[]; warnings: string[] } {
  const { entries: rawEntries, warnings } = splitIntoRawEntries(text)

  const entries: LogEntry[] = rawEntries.map((re, entryIndex) => {
    const parseErrors: string[] = []
    if (re.incomplete) parseErrors.push('Entry is missing its closing Z boundary marker.')

    const header = parseHeaderPart(re.parts.A ?? '')
    const requestHeaders = parseHeaderBlock(re.parts.B ?? '')
    const responseHeaders = parseHeaderBlock(re.parts.F ?? '')
    const trailer = parseTrailer(re.parts.H ?? '')
    const matchedRules = splitRules(re.parts.K)
    const uploadedFiles = parseUploadedFiles(re.parts.J)

    const { method, uri, protocol } = requestHeaders ? parseRequestLine(requestHeaders.startLine) : {}
    const statusInfo = responseHeaders ? parseStatusLine(responseHeaders.startLine) : {}

    const ruleIds = Array.from(
      new Set(trailer?.messages.map((m) => m.id).filter((x): x is string => !!x) ?? []),
    )
    const tags = Array.from(new Set(trailer?.messages.flatMap((m) => m.tags) ?? []))
    const anomalyScore =
      findHeader(responseHeaders, 'X-Anomaly-Score') ??
      trailer?.messages.find((m) => /anomaly scoring/i.test(m.text))?.text
    const severities = trailer?.messages.map((m) => m.severity).filter((x): x is string => !!x) ?? []
    const highestSeverity = severities.length ? severities.sort()[0] : undefined

    const uniqueId = header?.uniqueId ?? re.boundary

    return {
      entryIndex,
      boundary: re.boundary,
      uniqueId,
      raw: re.raw,
      parseErrors,
      header,
      requestHeaders,
      requestBody: re.parts.C ?? null,
      reducedRequestBody: re.parts.I ?? null,
      uploadedFiles,
      intendedResponseBody: re.parts.E ?? null,
      responseHeaders,
      responseBody: re.parts.G ?? null,
      trailer,
      matchedRules,
      rawParts: re.parts,
      timestamp: header?.timestamp,
      clientIp: header?.clientIp,
      method,
      uri,
      protocol,
      status: statusInfo.status,
      ruleIds,
      tags,
      anomalyScore,
      intercepted: !!trailer?.action && /intercepted/i.test(trailer.action),
      highestSeverity,
    }
  })

  return { entries, warnings }
}
