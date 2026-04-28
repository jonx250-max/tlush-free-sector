// ============================================================
// PDF.js lazy loader.
//
// pdfjs-dist is ~2 MB raw / ~330 KB gzipped — far too heavy for the
// initial bundle. This module returns the library only after dynamic
// import, so it ends up in its own chunk that's pulled in either by:
//   - the parsers when the user actually uploads a file, or
//   - UploadPage's mount-time prefetch (fire-and-forget) so the chunk
//     is warm by the time the user clicks "upload".
//
// The first caller pays the cost, every subsequent caller reuses the
// cached promise. GlobalWorkerOptions.workerSrc is set inside the
// promise body so the worker URL is bound exactly once, atomically.
// ============================================================

import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

export function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(pdfjsLib => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc
      return pdfjsLib
    })
  }
  return pdfjsPromise
}

/** Fire-and-forget prefetch. Safe to call from useEffect on mount. */
export function prefetchPdfjs(): void {
  void loadPdfjs()
}
