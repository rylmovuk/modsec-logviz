import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import FileUpload from './components/FileUpload'
import QueryBar from './components/QueryBar'
import EntryTable from './components/EntryTable'
import StatsView from './components/stats/StatsView'
import { parseAuditLogAsync } from './lib/parseAuditLogAsync'
import type { ParseResult } from './lib/types'
import { QueryParseError, filterEntriesByQuery, parseQuery, type QueryNode } from './lib/query'

type View = 'entries' | 'insights'

function parseQuerySafe(text: string): { ast: QueryNode | null; error: string | null } {
  try {
    return { ast: parseQuery(text), error: null }
  } catch (err) {
    return { ast: null, error: err instanceof QueryParseError ? err.message : 'Invalid query' }
  }
}

export default function App() {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [filename, setFilename] = useState('')
  const [parsing, setParsing] = useState(false)
  const [queryText, setQueryText] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [view, setView] = useState<View>('entries')

  const handleFile = async (text: string, name: string) => {
    setFilename(name)
    setQueryText('')
    setCommittedText('')
    setExpandedId(null)
    setView('entries')
    setParsing(true)
    try {
      const parsed = await parseAuditLogAsync(text)
      setResult(parsed)
    } finally {
      setParsing(false)
    }
  }

  const entries = useMemo(() => result?.entries ?? [], [result])

  // The query box's own value and its syntax-error feedback always stay on
  // the immediate state (parsing a query string is cheap, independent of
  // log size).
  const parseResult = useMemo(() => parseQuerySafe(queryText), [queryText])

  // The value that actually drives filtering — and therefore a re-render of
  // the (large) entry list — depends on the live-filtering toggle:
  //  - live: it's deferred, so React can keep the input responsive instead
  //    of racing a big filter+render on every keystroke.
  //  - not live: it only updates when the query is explicitly submitted
  //    (Enter, or the toggle flips back on), so the list stays put while
  //    the user is still composing a query.
  const [liveFiltering, setLiveFiltering] = useState(true)
  const [committedText, setCommittedText] = useState('')
  const deferredQueryText = useDeferredValue(queryText)
  const effectiveQueryText = liveFiltering ? deferredQueryText : committedText
  const isStale = effectiveQueryText !== queryText

  const effectiveParseResult = useMemo(() => parseQuerySafe(effectiveQueryText), [effectiveQueryText])

  // Keep filtering by the last query that parsed successfully, so a
  // momentarily-invalid query never blanks out the view.
  // Adjusting state during render (guarded so it only fires once per actual
  // change) rather than in an effect avoids an extra render/commit cycle.
  const [lastGood, setLastGood] = useState<{ text: string; ast: QueryNode | null }>({ text: '', ast: null })
  if (effectiveParseResult.error === null && lastGood.text !== effectiveQueryText) {
    setLastGood({ text: effectiveQueryText, ast: effectiveParseResult.ast })
  }

  const filtered = useMemo(() => filterEntriesByQuery(entries, lastGood.ast), [entries, lastGood.ast])

  const commitQuery = () => {
    setCommittedText(queryText)
  }

  const clearQuery = () => {
    setQueryText('')
    setCommittedText('')
  }

  const handleLiveFilteringChange = (live: boolean) => {
    setLiveFiltering(live)
    if (!live) setCommittedText(queryText) // freeze at the current text rather than snapping back
  }

  const runQuery = (query: string) => {
    setQueryText(query)
    setCommittedText(query)
    setView('entries')
  }

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id))
  }, [])

  return (
    <div className="flex h-screen flex-col">
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
        {result && !parsing && <FileUpload onFile={handleFile} compact />}
      </header>

      {!result && !parsing && (
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4">
          <FileUpload onFile={handleFile} />
          <div className="text-center text-sm text-slate-500">
            <p>Supports the classic boundary-delimited audit log format (parts A–K, Z) and NDJSON/JSON audit logs.</p>
            <p className="mt-1">Nothing is uploaded anywhere — the file is parsed entirely in your browser.</p>
          </div>
        </main>
      )}

      {parsing && (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-slate-400">
          <svg className="h-6 w-6 animate-spin text-sky-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
          </svg>
          <p className="text-sm">Parsing {filename}…</p>
          <p className="text-xs text-slate-600">Running in a background worker so the page stays responsive.</p>
        </main>
      )}

      {result && !parsing && (
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
                onSubmit={commitQuery}
                onClear={clearQuery}
                error={parseResult.error}
                total={entries.length}
                shown={filtered.length}
                stale={isStale}
                liveFiltering={liveFiltering}
                onLiveFilteringChange={handleLiveFilteringChange}
              />
              {view === 'entries' ? (
                <EntryTable entries={filtered} expandedId={expandedId} onToggle={toggleExpanded} />
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
