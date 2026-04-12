import { useCallback, useState, useRef } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSizeMB?: number
  label?: string
  description?: string
  className?: string
}

export function FileDropzone({
  onFileSelect,
  accept = '.pdf',
  maxSizeMB = 10,
  label = 'גרור קובץ לכאן',
  description = 'או לחץ לבחירת קובץ',
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null)
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('יש להעלות קובץ PDF בלבד')
        return false
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`גודל הקובץ מקסימלי: ${maxSizeMB}MB`)
        return false
      }
      return true
    },
    [maxSizeMB],
  )

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [validateFile, onFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  return (
    <div
      className={twMerge(
        'relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
        isDragging
          ? 'border-cs-primary bg-cs-primary/5'
          : 'border-cs-border hover:border-cs-primary/50',
        error && 'border-cs-danger',
        className,
      )}
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      />

      {selectedFile ? (
        <div className="flex items-center justify-center gap-3">
          <FileText size={24} className="text-cs-success" />
          <div className="text-right">
            <p className="font-medium text-cs-text">{selectedFile.name}</p>
            <p className="text-xs text-cs-muted">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); clearFile() }}
            className="rounded-full p-1 hover:bg-cs-border"
            aria-label="הסר קובץ"
          >
            <X size={16} className="text-cs-muted" />
          </button>
        </div>
      ) : (
        <>
          <Upload size={32} className="mx-auto mb-3 text-cs-muted" />
          <p className="font-medium text-cs-text">{label}</p>
          <p className="mt-1 text-sm text-cs-muted">{description}</p>
          <p className="mt-2 text-xs text-cs-muted">PDF בלבד, עד {maxSizeMB}MB</p>
        </>
      )}

      {error && <p className="mt-2 text-sm text-cs-danger">{error}</p>}
    </div>
  )
}
