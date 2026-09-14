import { parseAuditLog } from '../lib/parseAuditLog'

// Cast rather than relying on the ambient "webworker" lib (which can't be
// mixed into a tsconfig that also has "DOM" for the rest of the app).
interface WorkerScope {
  onmessage: ((ev: MessageEvent<{ text: string }>) => void) | null
  postMessage: (message: unknown) => void
}
const ctx = self as unknown as WorkerScope

ctx.onmessage = (event) => {
  const result = parseAuditLog(event.data.text)
  ctx.postMessage(result)
}
