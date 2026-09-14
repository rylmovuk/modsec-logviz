export default function StatTile({
  label,
  value,
  sublabel,
  tone = 'default',
}: {
  label: string
  value: string
  sublabel?: string
  tone?: 'default' | 'critical' | 'good'
}) {
  const valueColor = tone === 'critical' ? 'text-red-400' : tone === 'good' ? 'text-emerald-400' : 'text-slate-100'
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueColor}`}>{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p>}
    </div>
  )
}
