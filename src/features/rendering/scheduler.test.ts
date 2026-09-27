import { describe, expect, it } from 'vitest'
import { LatestCompiler, SupersededCompilation } from './scheduler'

describe('latest-only compilation queue', () => {
  it('serializes running jobs and coalesces pending drafts', async () => {
    const executed: number[] = []
    const releases: Array<(value: number) => void> = []
    const queue = new LatestCompiler<number, number>(value => {
      executed.push(value)
      return new Promise(resolve => releases.push(resolve))
    })
    const first = queue.submit(1)
    const second = queue.submit(2).catch(error => error)
    const latest = queue.submit(3)
    expect(executed).toEqual([1])
    expect(await second).toBeInstanceOf(SupersededCompilation)
    releases[0](10)
    expect(await first).toBe(10)
    expect(executed).toEqual([1, 3])
    releases[1](30)
    expect(await latest).toBe(30)
  })

  it('continues after a failed draft', async () => {
    const queue = new LatestCompiler<number, number>(async value => {
      if (value === 1) throw new Error('TeX error')
      return value
    })
    const failed = queue.submit(1)
    const next = queue.submit(2)
    await expect(failed).rejects.toThrow('TeX error')
    await expect(next).resolves.toBe(2)
  })
})
