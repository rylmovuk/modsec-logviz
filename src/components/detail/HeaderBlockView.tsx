import type { HttpHeaderBlock } from '../../lib/types'

export default function HeaderBlockView({ block, emptyLabel }: { block: HttpHeaderBlock | null; emptyLabel: string }) {
  if (!block) {
    return <p className="p-3 text-sm text-slate-500 italic">{emptyLabel}</p>
  }
  return (
    <div className="overflow-auto">
      <div className="mono border-b border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-sky-300">{block.startLine}</div>
      <table className="w-full text-sm">
        <tbody>
          {block.headers.map((h, i) => (
            <tr key={i} className="border-b border-slate-800/60 last:border-0">
              <td className="mono w-1/3 min-w-[140px] whitespace-nowrap px-3 py-1 align-top text-slate-400">{h.name}</td>
              <td className="mono px-3 py-1 align-top break-all text-slate-200">{h.value}</td>
            </tr>
          ))}
          {block.headers.length === 0 && (
            <tr>
              <td className="px-3 py-2 text-slate-500 italic">No headers recorded.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
