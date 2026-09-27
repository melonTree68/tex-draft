/** One active compile and one replaceable pending draft, never an unbounded queue. */
export class SupersededCompilation extends Error {
  constructor() { super('Compilation superseded by a newer draft') }
}

export class LatestCompiler<Request, Result> {
  private active = false
  private pending?: { request: Request; resolve: (value: Result) => void; reject: (reason: unknown) => void }

  constructor(private readonly compile: (request: Request) => Promise<Result>) {}

  submit(request: Request): Promise<Result> {
    return new Promise((resolve, reject) => {
      this.pending?.reject(new SupersededCompilation())
      this.pending = { request, resolve, reject }
      void this.drain()
    })
  }

  private async drain(): Promise<void> {
    if (this.active) return
    this.active = true
    try {
      while (this.pending) {
        const job = this.pending
        this.pending = undefined
        try { job.resolve(await this.compile(job.request)) }
        catch (error) { job.reject(error) }
      }
    } finally { this.active = false }
  }
}
