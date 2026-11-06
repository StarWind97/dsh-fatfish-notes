import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

test('client artifact defers module body, materializes apply, and uses host React', async () => {
  // Removing the lazy factory or bundling React breaks these observable contracts.
  const builder = new URL('../scripts/build.ts', import.meta.url)
  assert.ok(existsSync(builder), 'TypeScript client build pipeline must exist')
  const { buildClient } = await import('../scripts/build.ts')
  const fixtureDirectory = fileURLToPath(new URL('./.tmp/', import.meta.url))
  await mkdir(fixtureDirectory, { recursive: true })
  const temp = await mkdtemp(join(fixtureDirectory, 'notebook-client-build-'))
  try {
    const output = join(temp, 'client.js')
    await buildClient(fileURLToPath(new URL('./fixtures/build-client.tsx', import.meta.url)), output)
    const bodyMessages: string[] = []
    const registrations: { id: string; factory: (require: (id: string) => unknown) => unknown }[] = []
    runInNewContext(await readFile(output, 'utf8'), {
      window: { __ModuleLoader__: { load: (entry: typeof registrations[number]) => registrations.push(entry) } },
      console: { info: (message: string) => bodyMessages.push(message) },
    })
    assert.equal(registrations.length, 1)
    assert.equal(registrations[0]?.id, 'dsh-fatfish-notes')
    assert.deepEqual(bodyMessages, [], 'registration must not execute the client module')
    const require = createRequire(import.meta.url)
    const required: string[] = []
    const loaded = registrations[0]?.factory((id) => {
      required.push(id)
      assert.ok(['react', 'react/jsx-runtime'].includes(id), `unexpected bundled dependency: ${id}`)
      return require(id) as unknown
    })
    assert.deepEqual(bodyMessages, ['factory-body'])
    assert.ok(typeof loaded === 'object' && loaded !== null && 'apply' in loaded)
    assert.ok(typeof loaded.apply === 'function')
    const result: unknown = loaded.apply()
    assert.ok(typeof result === 'object' && result !== null && 'element' in result && 'react' in result)
    const React: typeof import('react') = require('react')
    assert.ok(React.isValidElement<{ children?: unknown }>(result.element))
    assert.equal(result.element.type, 'span')
    assert.equal(result.element.props.children, 'factory works')
    assert.equal(result.react, React)
    assert.ok(required.includes('react'))
    assert.ok(required.includes('react/jsx-runtime'))
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('Host build emits executable ESM and inferred declarations from TypeScript', async () => {
  const { buildHost } = await import('../scripts/build.ts')
  const fixtureDirectory = fileURLToPath(new URL('./.tmp/', import.meta.url))
  await mkdir(fixtureDirectory, { recursive: true })
  const temp = await mkdtemp(join(fixtureDirectory, 'notebook-host-build-'))
  try {
    await mkdir(join(temp, 'src'))
    await writeFile(join(temp, 'package.json'), '{"type":"module"}')
    await writeFile(join(temp, 'tsconfig.host.json'), JSON.stringify({
      extends: fileURLToPath(new URL('../tsconfig.host.json', import.meta.url)),
      compilerOptions: { rootDir: './src', outDir: './lib', types: [] },
      include: ['src/**/*.ts'], exclude: [],
    }))
    await writeFile(join(temp, 'src/index.ts'), 'export function apply(value: { name: string }): string { return value.name.toUpperCase() }\n')
    buildHost(temp)
    const module: unknown = await import(pathToFileURL(join(temp, 'lib/index.js')).href)
    assert.ok(typeof module === 'object' && module !== null && 'apply' in module && typeof module.apply === 'function')
    assert.equal(module.apply({ name: 'host' }), 'HOST')
    assert.match(await readFile(join(temp, 'lib/index.d.ts'), 'utf8'), /apply\(value: \{\s*name: string;\s*\}\): string/)
    const emittedJavaScript = await readFile(join(temp, 'lib/index.js'), 'utf8')
    await writeFile(join(temp, 'src/index.ts'), 'export const broken: string = 42\n')
    assert.throws(() => buildHost(temp), /not assignable to type 'string'/)
    assert.equal(await readFile(join(temp, 'lib/index.js'), 'utf8'), emittedJavaScript)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('declared package entries resolve to existing Host, Client, and type artifacts', async () => {
  const packageUrl = new URL('../package.json', import.meta.url)
  const manifest: unknown = JSON.parse(await readFile(packageUrl, 'utf8'))
  assert.ok(typeof manifest === 'object' && manifest !== null && 'exports' in manifest)
  assert.ok(typeof manifest.exports === 'object' && manifest.exports !== null)
  assert.ok('.' in manifest.exports && './client' in manifest.exports)
  const host = manifest.exports['.']
  const client = manifest.exports['./client']
  assert.ok(typeof host === 'object' && host !== null && 'default' in host && 'types' in host)
  assert.ok(typeof host.default === 'string' && typeof host.types === 'string' && typeof client === 'string')
  for (const path of [host.default, host.types, client]) assert.ok(existsSync(new URL(path, packageUrl)), `missing package entry: ${path}`)
  const loaded: unknown = await import(new URL(host.default, packageUrl).href)
  assert.ok(typeof loaded === 'object' && loaded !== null && 'apply' in loaded && typeof loaded.apply === 'function')

})

test('the shipped HTTP and tool entry points belong to notes and private backup only',async()=>{
  const {routePaths}=await import('../src/host/routes.js')
  assert.ok(routePaths.every(p=>p==='/notes'||p.startsWith('/notes/')||p==='/personal'||p==='/personal/folder/pick'||p.startsWith('/personal/sync')))
  const source=await readFile(new URL('../src/index.ts',import.meta.url),'utf8')
  assert.match(source,/registerNoteTools\(ctx.tools,app.notes\)/)
  const tools=await readFile(new URL('../src/host/note-tools.ts',import.meta.url),'utf8')
  assert.deepEqual([...tools.matchAll(/name: '([^']+)'/g)].map(m=>m[1]),['notes_submit_candidate'])
})

test('complete builds remove stale output, keep Host and Client separate, and reproduce identical artifacts', async () => {
  const { buildProject } = await import('../scripts/build.ts')
  const fixtureDirectory = fileURLToPath(new URL('./.tmp/', import.meta.url))
  await mkdir(fixtureDirectory, { recursive: true })
  const temp = await mkdtemp(join(fixtureDirectory, 'notebook-full-build-'))
  async function hashes(directory: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        for (const [name, hash] of Object.entries(await hashes(path))) result[`${entry.name}/${name}`] = hash
      } else result[entry.name] = createHash('sha256').update(await readFile(path)).digest('hex')
    }
    return result
  }
  try {
    const root = fileURLToPath(new URL('../', import.meta.url))
    for (const path of ['src', 'locale', 'package.json', 'tsconfig.base.json', 'tsconfig.host.json']) await cp(join(root, path), join(temp, path), { recursive: true })
    await mkdir(join(temp, 'lib/stale'), { recursive: true })
    await writeFile(join(temp, 'lib/stale/legacy.js'), 'throw new Error("stale output")')
    await writeFile(join(temp, 'lib/legacy.d.ts'), 'declare const fake: unknown')
    await buildProject(temp)
    const first = await hashes(join(temp, 'lib'))
    assert.ok(!('legacy.d.ts' in first) && !('stale/legacy.js' in first))
    assert.ok('index.js' in first && 'index.d.ts' in first && 'client.js' in first)
    assert.ok(!Object.keys(first).some(path => path.startsWith('client/') || path.startsWith('template/')))
    assert.doesNotMatch(await readFile(join(temp, 'lib/client.js'), 'utf8'), /(?:require\(["']node:|from ["']node:)/)
    assert.doesNotMatch(await readFile(join(temp, 'lib/index.js'), 'utf8'), /react|client\//)
    await buildProject(temp)
    assert.deepEqual(await hashes(join(temp, 'lib')), first)

  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
