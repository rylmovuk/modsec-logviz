# ModSecurity Log Viewer

A client-side web app that structurally renders [ModSecurity](https://modsecurity.org/) audit logs. Upload a log file and browse individual transactions in a filterable table, then expand any entry to inspect its request, response, audit trailer, and matched rules in dedicated tabs.

**Everything runs in the browser.** The log file is parsed locally with `FileReader`; nothing is ever sent to a server, which matters since these logs routinely contain full request/response bodies, cookies, and credentials.

## Features

- **Drag-and-drop / file picker upload** of a log file.
- **Two audit log formats supported**, auto-detected:
  - The classic boundary-delimited "native" format (`--<id>-A--` … `--<id>-Z--`), covering parts A–K and Z as described in the [ModSecurity Handbook](https://www.feistyduck.com/library/modsecurity-handbook-free/online/ch04-logging.html).
  - The JSON / NDJSON audit log format used by ModSecurity v3 and the nginx connector.
- **A small filter query language** (see below) drives the entry table — free text, field predicates, boolean logic, and date ranges.
- **Insights view**: aggregate stats over the current (filtered) set of entries — total/intercepted counts, request volume over time (allowed vs. intercepted), the most frequently matched rules, a response status code breakdown, top client IPs with simple outlier detection (mean + 2σ), the most common tags, and a method breakdown. Clicking a bar (a rule, an IP, a status code, a method, or a point on the timeline) runs the corresponding query and jumps to the filtered entry list.
- **Click-to-expand detail view** per entry, with tabs for:
  - **Request** — headers and body side by side (falls back to the reduced multipart body when the full body wasn't logged).
  - **Response** — headers and body side by side (falls back to the intended response body).
  - **Matched rules** — each triggered rule's message, severity, tags, and matched data, cross-referenced with its full rule source from part K when available.
  - **Audit trailer** — the parsed part H fields (producer, engine mode, action, stopwatch, etc.) plus the raw text.
  - **Tags** — all tags recorded for the transaction.
  - **Raw** — the untouched raw text of every part, for when the parser gets something wrong.
- JSON request/response bodies are automatically pretty-printed (with a toggle back to raw).

## Filter query language

The entry list and Insights view are both driven by one query text box. An empty query matches everything.

- **Predicates**: `key:value`, e.g. `rule:932110`, `tag:attack-xss`, `status:403`, `method:POST`, `severity:WARNING`.
  Recognized keys: `rule`/`ruleid`, `tag`, `severity` (a name `EMERGENCY`…`DEBUG` or a number `0`–`7`), `status`/`code`
  (exact code or a class like `4xx`), `method`, `ip`/`clientip`, `uri`/`path`, `host`, `msg`/`message`, `id`/`uniqueid`,
  `intercepted` (`true`/`false`), and `after`/`before` (an ISO-ish date or datetime).
- **Quoting**: a value with spaces, parentheses, or a literal `and`/`or`/`not` needs quotes — `tag:"some value"`; use
  `\"` for a literal quote inside one.
- **Boolean logic**: `and`, `or`, `not`, and parentheses for grouping — `(status:403 or status:500) and not method:GET`.
  Predicates written next to each other with no connector are implicitly AND'ed.
- **Free text**: a bare word with no `key:` searches across IP, URI, rule ids, tags, and rule messages.
- **Date ranges**: `after:` is inclusive, `before:` is exclusive, so `after:2026-09-04T17:00 and before:2026-09-04T18:00`
  selects a clean one-hour window. Values are parsed in the browser's local time zone.

If a query doesn't parse, the entry list keeps showing the last query that did, with the parse error shown inline, so a
half-typed expression never blanks the view.

## Getting started

```sh
npm install
npm run dev
```

Then open the printed local URL and drop in an audit log file (`SecAuditLogType Serial`, or a concurrent-format per-transaction file concatenated together).

## Build

```sh
npm run build
```

Outputs a static site to `dist/` — this app has no backend, so it can be hosted from any static file server.

## Project structure

```
src/
  lib/
    types.ts          # LogEntry / parsed-part data model
    nativeParser.ts    # boundary-marker state machine + part A/B/F/H/J/K parsing
    jsonParser.ts       # JSON / NDJSON audit log mapping onto the same model
    httpParse.ts        # request/status line + header block parsing
    trailerParse.ts     # part H "Message:" / "Apache-Error:" bracket-field parsing
    query/                # filter query language: lexer, parser, evaluator, query-string builders
    stats.ts              # aggregate metrics for the Insights view
    timestamp.ts            # audit-log timestamp parsing + timeline bucketing
    palette.ts                # chart color tokens
    parseAuditLog.ts       # format detection + dispatch
  components/            # React UI (upload, query bar, table, tabbed detail view)
  components/stats/      # Insights view (KPI tiles, bar lists, timeline chart)
```

## Notes on the log format

A ModSecurity audit log entry is a sequence of parts, each preceded by a boundary marker line `--<random-id>-<LETTER>--` and terminated by a final `--<random-id>-Z--` marker:

| Part | Contents |
| --- | --- |
| A | Header: timestamp, unique id, client/server IP and port |
| B | Request headers |
| C | Request body |
| D | Reserved |
| E | Intended response body |
| F | Response headers |
| G | Response body |
| H | Audit log trailer: matched-rule messages, engine mode, timing |
| I | Reduced multipart request body |
| J | Uploaded file info |
| K | Full text of every rule that matched |
| Z | Final boundary |

The parser is defensive about content inside a part that coincidentally looks like a boundary marker (e.g. a multipart form body containing `------WebKitFormBoundary...`) — only an exact `--<token>-<A–K, Z>--` line matching the entry's own boundary token is treated as a real marker.
