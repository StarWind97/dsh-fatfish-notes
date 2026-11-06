import { mkdir, readFile, rm, writeFile, lstat } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import ts from 'typescript'

export async function buildClient(entry: string, outfile: string): Promise<void> {
  await build({
    entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'browser',
    target: 'es2022', jsx: 'automatic',
    // The portable entity decoder keeps the lazy factory DOM independent.
    // Its browser shortcut creates a document element during module loading.
    alias: {'decode-named-character-reference':createRequire(import.meta.url).resolve('decode-named-character-reference')},
    external: ['react', 'react/*', 'react-dom', 'react-dom/*', '@deepseek-ai/*'],
    banner: { js: 'window.__ModuleLoader__.load({ id: "dsh-fatfish-notes", factory: (require) => {\nconst module = { exports: {} }; const exports = module.exports;' },
    footer: { js: '\nreturn module.exports;\n} });' },
  })
}

export function buildHost(root: string, noEmit = false): void {
  const configPath = join(root, 'tsconfig.host.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) throw new Error(ts.formatDiagnosticsWithColorAndContext([config.error], diagnosticHost))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  if (parsed.errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(parsed.errors, diagnosticHost))
  if (!parsed.fileNames.length) throw new Error('Host TypeScript source is required')
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticHost))
  const emitted = program.emit()
  if (emitted.emitSkipped || emitted.diagnostics.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(emitted.diagnostics, diagnosticHost))
  }
}

const diagnosticHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (file) => file,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => '\n',
}

export async function buildProject(root = process.cwd()): Promise<void> {
  root = resolve(root)
  // lib is exclusively generated output. Refuse links before deleting this exact directory.
  const output = join(root, 'lib')
  if (dirname(output) !== root) throw new Error('Invalid build output directory')
  const existing = await lstat(output).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  })
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) throw new Error('lib must be an owned output directory')
  buildHost(root, true)
  await rm(output, { recursive: true, force: true })
  await mkdir(output, { recursive: true })
  buildHost(root)
  const client = join(root, 'src/client/index.tsx')
  await buildClient(client, join(root, 'lib/client.js'))
  console.info('Built Fatfish Notes host and client')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--typecheck')) buildHost(process.cwd(), true)
  else await buildProject()
}
