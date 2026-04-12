import { he } from '../i18n/he'
import { Upload } from 'lucide-react'

export function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-heading text-2xl font-bold text-cs-text">{he.upload.title}</h1>
      <p className="mb-8 text-cs-muted">העלה את חוזה ההעסקה ואת תלוש השכר לניתוח</p>

      {/* Placeholder — will be replaced with DualUploadWizard */}
      <div className="rounded-2xl border-2 border-dashed border-cs-border bg-cs-surface p-16 text-center">
        <Upload size={48} className="mx-auto mb-4 text-cs-muted" />
        <p className="text-lg font-medium text-cs-text">{he.upload.dragDropContract}</p>
        <p className="mt-2 text-sm text-cs-muted">{he.upload.pdfOnly}</p>
      </div>
    </div>
  )
}
