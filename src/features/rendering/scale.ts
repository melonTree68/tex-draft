// The native standalone document uses 10pt; PDF.js scale maps its points to CSS pixels.
export function previewScale(fontSize: number): number {
  return fontSize / 10
}
