# ModSecurity Log Viewer

A client-side web app that structurally renders [ModSecurity](https://modsecurity.org/) audit logs. Upload a log file and browse individual transactions in a filterable table, then expand any entry to inspect its request, response, audit trailer, and matched rules in dedicated tabs.

**Everything runs in the browser.** The log file is parsed locally with `FileReader`; nothing is ever sent to a server, which matters since these logs routinely contain full request/response bodies, cookies, and credentials.

## Features

- **Drag-and-drop / file picker upload** of a log file.
- **Two audit log formats supported**, auto-detected:
  - The classic boundary-delimited "native" format (`--<id>-A--` … `--<id>-Z--`), covering parts A–K and Z as described in the [ModSecurity Handbook](https://www.feistyduck.com/library/modsecurity-handbook-free/online/ch04-logging.html).
  - The JSON / NDJSON audit log format used by ModSecurity v3 and the nginx connector.
- **Filterable entry table**: free-text search (IP, URI, rule id, message text), plus dropdowns for HTTP method, response status, and rule id/tag, and an "intercepted only" toggle.
- **Click-to-expand detail view** per entry, with tabs for:
  - **Request** — headers and body side by side (falls back to the reduced multipart body when the full body wasn't logged).
  - **Response** — headers and body side by side (falls back to the intended response body).
  - **Matched rules** — each triggered rule's message, severity, tags, and matched data, cross-referenced with its full rule source from part K when available.
  - **Audit trailer** — the parsed part H fields (producer, engine mode, action, stopwatch, etc.) plus the raw text.
  - **Tags** — all tags recorded for the transaction.
  - **Raw** — the untouched raw text of every part, for when the parser gets something wrong.
- JSON request/response bodies are automatically pretty-printed (with a toggle back to raw).

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
    filters.ts           # entry list filtering
    parseAuditLog.ts       # format detection + dispatch
  components/            # React UI (upload, filter bar, table, tabbed detail view)
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
