import { QueryParseError, type QueryNode } from './ast'
import { tokenize, type Token } from './lexer'

class TokenStream {
  private tokens: Token[]
  private i = 0
  constructor(tokens: Token[]) {
    this.tokens = tokens
  }
  peek(): Token {
    return this.tokens[this.i]
  }
  next(): Token {
    return this.tokens[this.i++]
  }
  atEnd(): boolean {
    return this.peek().type === 'EOF'
  }
}

function parseOr(ts: TokenStream): QueryNode {
  let left = parseAnd(ts)
  while (ts.peek().type === 'OR') {
    ts.next()
    const right = parseAnd(ts)
    left = { type: 'or', left, right }
  }
  return left
}

function parseAnd(ts: TokenStream): QueryNode {
  let left = parseNot(ts)
  while (true) {
    const t = ts.peek().type
    if (t === 'EOF' || t === 'RPAREN' || t === 'OR') break
    if (t === 'AND') ts.next() // explicit AND, otherwise implicit (juxtaposition)
    const right = parseNot(ts)
    left = { type: 'and', left, right }
  }
  return left
}

function parseNot(ts: TokenStream): QueryNode {
  if (ts.peek().type === 'NOT') {
    ts.next()
    return { type: 'not', operand: parseNot(ts) }
  }
  return parseAtom(ts)
}

function parseAtom(ts: TokenStream): QueryNode {
  const t = ts.peek()
  if (t.type === 'LPAREN') {
    ts.next()
    const node = parseOr(ts)
    if (ts.peek().type !== 'RPAREN') {
      throw new QueryParseError('Expected a closing ")"', ts.peek().pos)
    }
    ts.next()
    return node
  }
  if (t.type === 'PREDICATE') {
    ts.next()
    return { type: 'predicate', key: t.key!, value: t.value! }
  }
  if (t.type === 'WORD') {
    ts.next()
    return { type: 'text', value: t.value! }
  }
  if (t.type === 'RPAREN') {
    throw new QueryParseError('Unexpected ")"', t.pos)
  }
  throw new QueryParseError(`Expected a term after "${t.type.toLowerCase()}"`, t.pos)
}

/** Parses a query string into an AST. Throws QueryParseError on invalid syntax. Empty/whitespace input returns null (match everything). */
export function parseQuery(input: string): QueryNode | null {
  if (input.trim().length === 0) return null
  const ts = new TokenStream(tokenize(input))
  const node = parseOr(ts)
  if (!ts.atEnd()) {
    throw new QueryParseError(`Unexpected "${ts.peek().value ?? ts.peek().type.toLowerCase()}"`, ts.peek().pos)
  }
  return node
}
