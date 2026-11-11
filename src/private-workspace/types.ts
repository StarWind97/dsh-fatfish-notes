/** Lazy immutable bytes are consumed one file at a time by Git. */
export type PrivateFile = string | Uint8Array | (()=>Promise<Uint8Array>) | null
export type PrivateFiles = Map<string, PrivateFile>
