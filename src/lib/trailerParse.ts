import type { AuditLogTrailer, AuditMessage } from './types'

const BRACKET_FIELD = /\[(\w+) "((?:[^"\\]|\\.)*)"\]/g

function parseBracketedMessage(raw: string, kind: AuditMessage['kind']): AuditMessage {
  const firstBracket = raw.indexOf('[')
  const text = (firstBracket === -1 ? raw : raw.slice(0, firstBracket)).trim()
  const dispositionMatch = text.match(/^([A-Za-z][A-Za-z ]*?)\.\s*/)

  const fields: Record<string, string[]> = {}
  const tags: string[] = []
  BRACKET_FIELD.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = BRACKET_FIELD.exec(raw))) {
    const key = m[1]
    const value = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    if (key === 'tag') {
      tags.push(value)
    } else {
      ;(fields[key] ??= []).push(value)
    }
  }

  return {
    kind,
    raw,
    text,
    disposition: dispositionMatch?.[1],
    fields,
    id: fields.id?.[0],
    ruleFile: fields.file?.[0],
    ruleLine: fields.line?.[0],
    msg: fields.msg?.[0],
    data: fields.data?.[0],
    severity: fields.severity?.[0],
    tags,
  }
}

/**
 * Parses the audit log trailer (part H): free-form `Key: value` lines,
 * where `Message:` and `Apache-Error:` lines additionally carry
 * `[key "value"]` bracketed fields describing the matched rule.
 */
export function parseTrailer(raw: string): AuditLogTrailer | null {
  const text = raw.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '')
  if (!text) return null

  const messages: AuditMessage[] = []
  const extra: Record<string, string> = {}
  let producer: string | undefined
  let server: string | undefined
  let engineMode: string | undefined
  let action: string | undefined
  let stopwatch: string | undefined
  let stopwatch2: string | undefined
  let responseBodyTransformed: string | undefined

  // Split into logical lines: a new "Key:" line starts a new record, but a
  // Message/Apache-Error entry can rarely wrap; we treat each physical line
  // as one record since ModSecurity writes exactly one per line.
  const lines = text.split('\n').filter((l) => l.length > 0)

  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx === -1) {
      extra[`(unrecognized ${Object.keys(extra).length})`] = line
      continue
    }
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()

    switch (key) {
      case 'Message':
        messages.push(parseBracketedMessage(value, 'message'))
        break
      case 'Apache-Error':
        messages.push(parseBracketedMessage(value, 'apache-error'))
        break
      case 'Producer':
        producer = value
        break
      case 'Server':
        server = value
        break
      case 'Engine-Mode':
        engineMode = value.replace(/^"|"$/g, '')
        break
      case 'Action':
        action = value
        break
      case 'Stopwatch':
        stopwatch = value
        break
      case 'Stopwatch2':
        stopwatch2 = value
        break
      case 'Response-Body-Transformed':
        responseBodyTransformed = value
        break
      default:
        extra[key] = value
    }
  }

  return {
    raw: text,
    messages,
    producer,
    server,
    engineMode,
    action,
    stopwatch,
    stopwatch2,
    responseBodyTransformed,
    extra,
  }
}
