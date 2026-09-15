import { useCallback, useRef, useState } from 'react'

interface Props {
  onFile: (text: string, filename: string) => void
  compact?: boolean
}

export default function FileUpload({ onFile, compact }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const readFile = useCallback(
    (file: File) => {
      setLoading(true)
      const reader = new FileReader()
      reader.onload = () => {
        setLoading(false)
        onFile(String(reader.result ?? ''), file.name)
      }
      reader.onerror = () => {
        setLoading(false)
      }
      reader.readAsText(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) readFile(file)
    },
    [readFile],
  )

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) readFile(file)
      e.target.value = ''
    },
    [readFile],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={[
        'cursor-pointer rounded-xl border-2 border-dashed transition-colors',
        compact
          ? 'flex shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 py-2 text-center'
          : 'flex flex-col items-center justify-center gap-2 p-12 text-center',
        dragging ? 'border-sky-400 bg-sky-950/40' : 'border-slate-700 hover:border-slate-500 bg-slate-900/40',
      ].join(' ')}
    >
      <input ref={inputRef} type="file" accept=".log,.txt,.json,text/plain" className="hidden" onChange={onChange} />
      {loading ? (
        <p className="text-slate-300">Reading file…</p>
      ) : compact ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 shrink-0 text-slate-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <p className="whitespace-nowrap text-sm font-medium text-slate-200">Open another local log file</p>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-slate-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <p className="text-slate-200 font-medium">Drop a ModSecurity audit log file here</p>
          <p className="text-sm text-slate-500">or click to browse — parsing happens locally, nothing is uploaded</p>
        </>
      )}
    </div>
  )
}
