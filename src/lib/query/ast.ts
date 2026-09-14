export type QueryNode =
  | { type: 'and'; left: QueryNode; right: QueryNode }
  | { type: 'or'; left: QueryNode; right: QueryNode }
  | { type: 'not'; operand: QueryNode }
  | { type: 'predicate'; key: string; value: string }
  | { type: 'text'; value: string }

export class QueryParseError extends Error {
  /** Character offset into the source string where the error was detected. */
  pos: number
  constructor(message: string, pos: number) {
    super(message)
    this.name = 'QueryParseError'
    this.pos = pos
  }
}
