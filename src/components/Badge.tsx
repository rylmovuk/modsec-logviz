type Tone = 'slate' | 'red' | 'amber' | 'green' | 'sky' | 'violet'

const TONE_CLASSES: Record<Tone, string> = {
  slate: 'bg-slate-800 text-slate-300 ring-slate-700',
  red: 'bg-red-950 text-red-300 ring-red-900',
  amber: 'bg-amber-950 text-amber-300 ring-amber-900',
  green: 'bg-emerald-950 text-emerald-300 ring-emerald-900',
  sky: 'bg-sky-950 text-sky-300 ring-sky-900',
  violet: 'bg-violet-950 text-violet-300 ring-violet-900',
}

export default function Badge({ children, tone = 'slate', title }: { children: React.ReactNode; tone?: Tone; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}

export function statusTone(status: string | undefined): Tone {
  if (!status) return 'slate'
  const n = Number(status)
  if (n >= 500) return 'red'
  if (n >= 400) return 'amber'
  if (n >= 300) return 'sky'
  if (n >= 200) return 'green'
  return 'slate'
}

export function methodTone(method: string | undefined): Tone {
  switch (method) {
    case 'GET':
      return 'sky'
    case 'POST':
      return 'green'
    case 'PUT':
    case 'PATCH':
      return 'amber'
    case 'DELETE':
      return 'red'
    default:
      return 'slate'
  }
}
