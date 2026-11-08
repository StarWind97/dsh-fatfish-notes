import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import ts from 'typescript'

test('published host peer requirements correspond to contracts consumed by the plugin', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
    peerDependencies: Record<string, string>
    dsh: { client: { inject: string[] } }
  }
  const consumed = new Set(manifest.dsh.client.inject)
  function visit(node: ts.Node): void {
    const name = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier
      : ts.isModuleDeclaration(node) ? node.name : undefined
    if (name && ts.isStringLiteral(name) && name.text.startsWith('@deepseek-ai/')) {
      consumed.add(name.text.split('/').slice(0, 2).join('/'))
    }
    ts.forEachChild(node, visit)
  }
  async function inspect(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await inspect(path)
      else if (/\.tsx?$/.test(entry.name)) visit(ts.createSourceFile(path, await readFile(path, 'utf8'), ts.ScriptTarget.Latest, true))
    }
  }
  await inspect(join(root, 'src'))
  const unused = Object.keys(manifest.peerDependencies).filter(name => name.startsWith('@deepseek-ai/') && !consumed.has(name))
  assert.deepEqual(unused, [], 'An unused host peer can reject an otherwise compatible installation')
})
