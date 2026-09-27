import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFDocumentLoadingTask } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { previewScale } from './scale'

GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfCanvas({ base64, label, fontSize, onError }: { base64: string; label: string; fontSize: number; onError: (message: string) => void }) {
  const callback = useRef(onError)
  callback.current = onError
  const [loaded, setLoaded] = useState<{ document: PDFDocumentProxy; task: PDFDocumentLoadingTask } | null>(null)
  const document = loaded?.document ?? null

  useEffect(() => {
    let current = true
    let accepted = false
    const data = Uint8Array.from(atob(base64), value => value.charCodeAt(0))
    // Embedded TeX fonts; workers and their source are bundled by Vite.
    const task = getDocument({ data, useWasm: false })
    void task.promise.then(pdf => { if (current) { accepted = true; setLoaded({ document: pdf, task }) } }).catch((error: unknown) => {
      if (current) callback.current(String(error))
    })
    return () => { current = false; if (!accepted) void task.destroy() }
  }, [base64])

  useEffect(() => () => { if (loaded) void loaded.task.destroy() }, [loaded])

  return <div className="math-preview__pages">
    {document && Array.from({ length: document.numPages }, (_, index) =>
      <PdfPage key={index} label={label} document={document} pageNumber={index + 1} fontSize={fontSize} onError={callback.current} />)}
  </div>
}

function PdfPage({ document, pageNumber, fontSize, label, onError }: {
  label: string; document: PDFDocumentProxy; pageNumber: number; fontSize: number; onError: (message: string) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const callback = useRef(onError)
  callback.current = onError
  useEffect(() => {
    if (!canvas.current) return
    let cancelled = false
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined
    const target = canvas.current
    void document.getPage(pageNumber).then(async page => {
      if (cancelled) return
      const viewport = page.getViewport({ scale: previewScale(fontSize) })
      const ratio = window.devicePixelRatio || 1
      // Render offscreen, then swap: the last good formula remains visible during updates.
      const nextCanvas = window.document.createElement('canvas')
      nextCanvas.width = Math.ceil(viewport.width * ratio)
      nextCanvas.height = Math.ceil(viewport.height * ratio)
      const context = nextCanvas.getContext('2d')!
      renderTask = page.render({ canvas: nextCanvas, canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0] })
      await renderTask.promise
      if (cancelled) return
      target.width = nextCanvas.width
      target.height = nextCanvas.height
      target.style.width = `${viewport.width}px`
      target.style.height = `${viewport.height}px`
      target.getContext('2d')!.drawImage(nextCanvas, 0, 0)
    }).catch((error: unknown) => {
      if (!cancelled) callback.current(String(error))
    })
    return () => { cancelled = true; renderTask?.cancel() }
  }, [document, pageNumber, fontSize])
  return <canvas ref={canvas} className="math-preview__canvas" aria-label={`${label} ${pageNumber}`} />
}
