import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

async function discover(directory: string, suffix: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'fixtures' || entry.name.startsWith('.')) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await discover(path, suffix))
    else if (entry.name.endsWith(suffix)) files.push(path)
  }
  return files.sort()
}

// Import in one process: node:test queues root tests sequentially by default.
// No worker/child-process pipes are needed on Windows.
const directory = join(process.cwd(), 'test')
const files = await discover(directory, '.test.ts')
for (const file of files) {
  await import(pathToFileURL(file).href)
}
