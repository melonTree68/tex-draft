// Comments (including section markers) alone should leave the preview empty.
export function hasMathContent(source: string): boolean {
  return source.split('\n').some(line => {
    for (const character of line) {
      if (character === '%') return false
      if (character.trim()) return true
    }
    return false
  })
}
