import { QueryParseError } from './ast'

export type TokenType = 'LPAREN' | 'RPAREN' | 'AND' | 'OR' | 'NOT' | 'PREDICATE' | 'WORD' | 'EOF'

export interface Token {
  type: TokenType
  /** Predicate key (PREDICATE tokens only), already lowercased. */
  key?: string
  /** Dequoted value (PREDICATE and WORD tokens). */
  value?: string
  pos: number
}

const KEY_RE = /[A-Za-z_][A-Za-z0-9_-]*/y
const OPERATOR_WORDS = new Set(['and', 'or', 'not'])

function isBoundary(ch: string | undefined): boolean {
  return ch === undefined || /\s/.test(ch) || ch === '(' || ch === ')'
}

/** Reads a bare (unquoted) or quoted value starting at `i`. Returns the dequoted text and whether it was quoted. */
function readValue(input: string, i: number): { text: string; quoted: boolean; next: number } {
  if (input[i] === '"') {
    let j = i + 1
    let buf = ''
    while (j < input.length && input[j] !== '"') {
      if (input[j] === '\\' && j + 1 < input.length && (input[j + 1] === '"' || input[j + 1] === '\\')) {
        buf += input[j + 1]
        j += 2
      } else {
        buf += input[j]
        j++
      }
    }
    if (input[j] !== '"') {
      throw new QueryParseError('Unterminated quoted string', i)
    }
    return { text: buf, quoted: true, next: j + 1 }
  }
  let j = i
  while (!isBoundary(input[j])) j++
  return { text: input.slice(i, j), quoted: false, next: j }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', pos: i })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', pos: i })
      i++
      continue
    }

    const start = i
    KEY_RE.lastIndex = i
    const keyMatch = KEY_RE.exec(input)
    if (keyMatch && keyMatch.index === i && input[i + keyMatch[0].length] === ':') {
      const key = keyMatch[0].toLowerCase()
      i += keyMatch[0].length + 1 // skip key and ':'
      const { text, next } = readValue(input, i)
      tokens.push({ type: 'PREDICATE', key, value: text, pos: start })
      i = next
      continue
    }

    const { text, quoted, next } = readValue(input, i)
    if (text.length === 0) {
      // Shouldn't happen (a lone boundary char), but avoid an infinite loop.
      throw new QueryParseError(`Unexpected character "${ch}"`, i)
    }
    if (!quoted && OPERATOR_WORDS.has(text.toLowerCase())) {
      tokens.push({ type: text.toLowerCase() === 'and' ? 'AND' : text.toLowerCase() === 'or' ? 'OR' : 'NOT', pos: start })
    } else {
      tokens.push({ type: 'WORD', value: text, pos: start })
    }
    i = next
  }

  tokens.push({ type: 'EOF', pos: input.length })
  return tokens
}
