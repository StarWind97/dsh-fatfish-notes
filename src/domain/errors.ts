/** Messages are authored for public display; external exceptions belong in private diagnostics. */
export class NotebookError extends Error {
  affectedCount?:number
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message)
    this.name = 'NotebookError'
  }
}
