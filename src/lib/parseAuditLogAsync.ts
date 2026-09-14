import type { ParseResult } from './types'

/**
 * Parses an audit log off the main thread so a large file (tens of
 * thousands of entries) doesn't freeze the page while it's being parsed.
 * Spins up a fresh worker per call and lets it terminate itself once it has
 * replied — simpler than pooling for a one-shot, one-file-at-a-time parse.
 */
export function parseAuditLogAsync(text: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/parseAuditLog.worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (event: MessageEvent<ParseResult>) => {
      resolve(event.data)
      worker.terminate()
    }
    worker.onerror = (event) => {
      reject(event.error instanceof Error ? event.error : new Error(event.message || 'Worker failed to parse the log'))
      worker.terminate()
    }
    worker.postMessage({ text })
  })
}
