import { lazy, Suspense, useEffect, useState } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { LatestCompiler, SupersededCompilation } from './scheduler'
import type { CompileRequest, CompileResult, MathFont, PreviewLabels, PreviewStatus } from './types'
import './preview.css'

const PdfCanvas = lazy(() => import('./PdfCanvas'))
const compiler = new LatestCompiler<CompileRequest, CompileResult>(request => invoke('compile_math', { request }))

export interface PreviewProps {
  source: string
  macros: string
  font: MathFont
  theme: 'light' | 'dark'
  labels: PreviewLabels
}

export function Preview({ source, macros, font, theme, labels }: PreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>('empty')
  const [result, setResult] = useState<CompileResult | null>(null)
  const [error, setError] = useState('')
  const [hasCompiled, setHasCompiled] = useState(false)
  useEffect(() => {
    let current = true
    setError('')
    if (!source.trim()) { setStatus('empty'); setResult(null); return }
    if (!isTauri()) { setStatus('unavailable'); return }
    setStatus('compiling')
    const timer = window.setTimeout(() => {
      void compiler.submit({ source, macros, font }).then(value => {
        if (!current) return
        setResult(value)
        setHasCompiled(true)
        setStatus('ready')
      }).catch((reason: unknown) => {
        if (!current || reason instanceof SupersededCompilation) return
        setError(reason instanceof Error ? reason.message : String(reason))
        setStatus('error')
      })
    }, 300)
    return () => { current = false; window.clearTimeout(timer) }
  }, [source, macros, font])

  return <div className={`math-preview math-preview--${theme}`} data-status={status}>
    {status === 'unavailable' && <div className="math-preview__message">{labels.desktopOnly}</div>}
    {status === 'compiling' && <div className="math-preview__progress" role="status">
      <span>{labels.compiling}{!hasCompiled && <small>{labels.firstCompile}</small>}</span>
    </div>}
    {result && <Suspense fallback={null}><PdfCanvas label={labels.page} base64={result.pdfBase64} onError={message => { setError(message); setStatus('error') }} /></Suspense>}
    {error && <details className="math-preview__error" open>
      <summary>{labels.error}</summary>
      <pre role="alert">{error}</pre>
    </details>}
  </div>
}

