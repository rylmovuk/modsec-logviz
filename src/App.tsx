import { useMemo, useRef, useState } from 'react'
import FileUpload from './components/FileUpload'
import QueryBar from './components/QueryBar'
import EntryTable from './components/EntryTable'
import StatsView from './components/stats/StatsView'
import { parseAuditLog } from './lib/parseAuditLog'
import type { ParseResult } from './lib/types'
import { QueryParseError, filterEntriesByQuery, parseQuery, type QueryNode } from './lib/query'

type View = 'entries' | 'insights'

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [filename, setFilename] = useState('')
  const [queryText, setQueryText] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [view, setView] = useState<View>('entries')

  const handleFile = (text: string, name: string) => {
    setFilename(name)
    setQueryText('')
    setExpandedId(null)
    setView('entries')
    setResult(parseAuditLog(text))
  }

  const entries = useMemo(() => result?.entries ?? [], [result])

  const parseResult = useMemo((): { ast: QueryNode | null; error: string | null } => {
    try {
      return { ast: parseQuery(queryText), error: null }
    } catch (err) {
      return { ast: null, error: err instanceof QueryParseError ? err.message : 'Invalid query' }
    }
  }, [queryText])

  // Keep filtering by the last query that parsed successfully, so a
  // momentarily-invalid query while typing doesn't blank out the view.
  const lastGoodAst = useRef<QueryNode | null>(null)
  if (parseResult.error === null) lastGoodAst.current = parseResult.ast

  const filtered = useMemo(
    () => filterEntriesByQuery(entries, lastGoodAst.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, queryText, parseResult.error],
  )

  const runQuery = (query: string) => {
    setQueryText(query)
    setView('entries')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-sky-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 6v6c0 4.5 3.2 7.9 7.5 9 4.3-1.1 7.5-4.5 7.5-9V6L12 3Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.8 1.8 3.2-3.6" />
        </svg>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">ModSecurity Log Viewer</h1>
        {filename && <span className="mono text-sm text-slate-500">— {filename}</span>}
        {result && (
          <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            {result.format === 'json' ? 'JSON audit log' : 'native audit log'}
          </span>
        )}
        {result && entries.length > 0 && (
          <div className="ml-4 flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-sm">
            {(['entries', 'insights'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  'rounded-md px-3 py-1 font-medium capitalize transition-colors',
                  view === v ? 'bg-slate-800 text-sky-300' : 'text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                {v === 'entries' ? 'Log entries' : 'Insights'}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto" />
        {result && (
          <div className="w-64">
            <FileUpload onFile={handleFile} compact />
          </div>
        )}
      </header>

      {!result && (
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4">
          <FileUpload onFile={handleFile} />
          <div className="text-center text-sm text-slate-500">
            <p>Supports the classic boundary-delimited audit log format (parts A–K, Z) and NDJSON/JSON audit logs.</p>
            <p className="mt-1">Nothing is uploaded anywhere — the file is parsed entirely in your browser.</p>
          </div>
        </main>
      )}

      {result && (
        <main className="flex min-h-0 flex-1 flex-col">
          {result.warnings.length > 0 && (
            <div className="border-b border-amber-900 bg-amber-950/50 px-4 py-2 text-xs text-amber-300">
              {result.warnings.length} warning(s) while parsing — e.g. {result.warnings[0]}
            </div>
          )}
          {entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-slate-500">
              No log entries were found in this file. Make sure it's a ModSecurity audit log.
            </div>
          ) : (
            <>
              <QueryBar
                value={queryText}
                onChange={setQueryText}
                error={parseResult.error}
                total={entries.length}
                shown={filtered.length}
              />
              {view === 'entries' ? (
                <div className="flex-1 overflow-auto">
                  <EntryTable
                    entries={filtered}
                    expandedId={expandedId}
                    onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                  />
                </div>
              ) : (
                <StatsView entries={filtered} onRunQuery={runQuery} />
              )}
            </>
          )}
        </main>
      )}
    </div>
  )
}
