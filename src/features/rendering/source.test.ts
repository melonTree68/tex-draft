import { expect, it } from 'vitest'
import { hasMathContent } from './source'

it('keeps comment-only sections empty while retaining escaped percent symbols', () => {
  expect(hasMathContent('%---\n \t\n% notes\n%---')).toBe(false)
  expect(hasMathContent('% notes\n\\%')).toBe(true)
  expect(hasMathContent('\nx + 1\n\n%---\ny')).toBe(true)
})
