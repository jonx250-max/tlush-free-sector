// ============================================================
// PDF.js Worker Setup — must be called before any PDF parsing
// ============================================================

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let initialized = false

export function initPdfWorker() {
  if (initialized) return
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc
  initialized = true
}
