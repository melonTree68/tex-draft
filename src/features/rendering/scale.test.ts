import { describe, expect, it } from 'vitest'
import { previewScale } from './scale'

describe('preview font scale', () => {
  it('maps the native 10pt font to the selected CSS pixel size', () => {
    expect(previewScale(10)).toBe(1)
    expect(previewScale(18)).toBe(1.8)
    expect(previewScale(36)).toBe(2 * previewScale(18))
  })
})
