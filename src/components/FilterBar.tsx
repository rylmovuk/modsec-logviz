import type { Filters } from '../lib/filters'

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
  methods: string[]
  statuses: string[]
  tags: string[]
  total: number
  shown: number
}

export default function FilterBar({ filters, onChange, methods, statuses, tags, total, shown }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
      <input
        type="text"
        value={filters.text}
        onChange={(e) => set('text', e.target.value)}
        placeholder="Search IP, URI, rule id, message…"
        className="min-w-[220px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
      />

      <select
        value={filters.method}
        onChange={(e) => set('method', e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
      >
        <option value="">Any method</option>
        {methods.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => set('status', e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
      >
        <option value="">Any status</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.tag}
        onChange={(e) => set('tag', e.target.value)}
        className="max-w-[220px] rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
      >
        <option value="">Any rule / tag</option>
        {tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={filters.interceptedOnly}
          onChange={(e) => set('interceptedOnly', e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 accent-sky-500"
        />
        Intercepted only
      </label>

      <div className="ml-auto text-sm text-slate-500">
        {shown === total ? `${total} entries` : `${shown} / ${total} entries`}
      </div>
    </div>
  )
}
