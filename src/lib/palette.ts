// Dark-mode slice of the reference data-viz palette (this app is dark-only).
// See the dataviz skill's references/palette.md for the full validated set.

export const seqBlue = '#3987e5' // sequential hue, magnitude comparisons
export const seqBlueSoft = '#1c5cab'

export const status = {
  good: '#0ca30c', // 2xx
  info: '#3987e5', // 3xx (categorical slot 1, used as a neutral "redirect" color)
  warning: '#fab219', // 4xx
  critical: '#d03b3b', // 5xx / intercepted
  muted: '#5c5b57', // unknown / no status
} as const

export const ink = {
  primary: '#ffffff',
  secondary: '#c3c2b7',
  muted: '#898781',
  gridline: '#2c2c2a',
  baseline: '#383835',
  surface: '#1a1a19',
}

export function statusClassColor(status_: string | undefined): string {
  if (!status_) return status.muted
  const n = Number(status_)
  if (n >= 500) return status.critical
  if (n >= 400) return status.warning
  if (n >= 300) return status.info
  if (n >= 200) return status.good
  return status.muted
}

export function statusClassLabel(status_: string | undefined): string {
  if (!status_) return 'Unknown'
  const n = Number(status_)
  if (n >= 500) return 'Server error (5xx)'
  if (n >= 400) return 'Client error (4xx)'
  if (n >= 300) return 'Redirect (3xx)'
  if (n >= 200) return 'Success (2xx)'
  return 'Informational'
}
