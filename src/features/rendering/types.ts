export type MathFont = 'latin-modern' | 'pagella' | 'termes'
export interface CompileRequest { source: string; macros: string; font: MathFont }
export interface CompileResult { pdfBase64: string }
export type PreviewStatus = 'empty' | 'compiling' | 'ready' | 'error' | 'unavailable'
export interface PreviewLabels {
  compiling: string
  error: string
  desktopOnly: string
  firstCompile: string
  page: string
}
