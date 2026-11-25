const assert = require('node:assert/strict')
const { execFileSync, spawn } = require('node:child_process')
const { once } = require('node:events')
const { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync } = require('node:fs')
const { basename, dirname, join, relative, resolve, sep } = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')
const { checkFindNotebookFlow } = require('./sidebar-interactions.cjs')

const root = realpathSync(join(__dirname, '../..'))
const button = (root, name) => root.getByRole('button', { name, exact: true })

function resolveIsolatedRoot(repoRoot = root, env = process.env) {
  if (env.FATFISH_QA_ROOT) {
    const explicit = realpathSync(env.FATFISH_QA_ROOT)
    assert.ok(
      basename(explicit) === 'pure-001' && basename(dirname(explicit)) === '.dsh-home',
      'FATFISH_QA_ROOT 必须指向项目隔离目录 .dsh-home/pure-001',
    )
    return explicit
  }
  const localPath = join(repoRoot, '.dsh-home/pure-001')
  if (existsSync(localPath)) {
    const isolated = realpathSync(localPath)
    assert.ok(isolated.startsWith(repoRoot + sep), '需要项目内的隔离 Web 资料')
    return isolated
  }
  let commonDir = ''
  try {
    commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    commonDir = ''
  }
  if (commonDir) {
    const resolvedCommon = resolve(repoRoot, commonDir)
    if (basename(resolvedCommon) === '.git') {
      const mainRoot = realpathSync(dirname(resolvedCommon))
      const sharedPath = join(mainRoot, '.dsh-home/pure-001')
      if (existsSync(sharedPath)) {
        const isolated = realpathSync(sharedPath)
        assert.ok(isolated.startsWith(mainRoot + sep), '需要项目主目录内的隔离 Web 资料')
        return isolated
      }
    }
  }
  throw new Error('找不到项目内的隔离资料 .dsh-home/pure-001。若在独立 worktree 中运行，请确认主目录存在该资料或通过 FATFISH_QA_ROOT 指定。')
}

function isolatedProfile(repoRoot = root, env = process.env) {
  const isolated = resolveIsolatedRoot(repoRoot, env)
  const home = realpathSync(join(isolated, 'release12-web'))
  assert.ok(home.startsWith(isolated + sep), '需要项目内的隔离 Web 资料')
  const { binding, folder } = JSON.parse(readFileSync(join(home, 'fatfish-notes/backup/sync.json'), 'utf8').replace(/^\uFEFF/, ''))
  assert.equal(binding.repositoryId, 1440762952, '需要指定的私有测试库')
  const notes = realpathSync(join(isolated, 'release12-notes'))
  assert.ok(notes.startsWith(isolated + sep) && realpathSync(folder) === notes, '需要指定的隔离笔记目录')
  const installed = join(home, 'profiles/web/node_modules/dsh-fatfish-notes')
  for (const file of ['lib/client.js', 'locale/zh.json']) {
    const current = readFileSync(join(repoRoot, file), 'utf8').replace(/\r\n/g, '\n')
    const source = readFileSync(join(installed, file), 'utf8').replace(/\r\n/g, '\n')
    assert.ok(current === source, `隔离安装的 ${file} 与当前构建不同。请先把待测包安装到隔离 Web。`)
  }
  return home
}

function waitForLocalEntry(host) {
  return new Promise((resolve, reject) => {
    let output = ''
    const timedOut = setTimeout(() => done(new Error('隔离 DSH 启动超时')), 40000)
    const failed = () => done(new Error('无法启动隔离 DSH'))
    const exited = code => done(new Error(`隔离 DSH 在页面就绪前退出（${code}）`))
    const read = chunk => {
      output = (output + chunk).slice(-8192)
      const entry = output.match(/http:\/\/127\.0\.0\.1:\d+[^\s\u001b]*[?&]token=[^\s\u001b]+(?=[\s\u001b])/)
      if (entry) done(null, entry[0])
    }
    function done(error, entry) {
      clearTimeout(timedOut)
      host.stdout.off('data', read)
      host.stdout.resume()
      host.off('error', failed)
      host.off('exit', exited)
      if (error) reject(error)
      else resolve(entry)
    }
    host.stdout.on('data', read)
    host.once('error', failed)
    host.once('exit', exited)
  })
}

async function run() {
  const home = isolatedProfile()
  const dsh = process.env.FATFISH_DSH_EXE || 'D:/ProgramFiles/DeepSeek Harness/DeepSeek Harness.exe'
  const chrome = process.env.FATFISH_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  assert.ok(existsSync(dsh) && existsSync(chrome), '需要已安装的 DSH 和 Chrome')
  const { chromium } = require(process.env.FATFISH_PLAYWRIGHT || 'playwright')

  const logRoot = join(root, 'output/playwright/search-sidebar')
  mkdirSync(logRoot, { recursive: true })
  const evidence = mkdtempSync(join(logRoot, 'run-'))
  console.log(`实拍目录 ${relative(root, evidence)}`)

  const cli = join(dirname(dsh), 'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js')
  const host = spawn(dsh, ['--expose-internals', cli, '--profile', 'web', '--host', '127.0.0.1', '--port', '0', '--no-open'], {
    cwd: home, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, DSH_HOME: home, ELECTRON_RUN_AS_NODE: '1', NO_PROXY: 'localhost,127.0.0.1,api.github.com' },
  })
  let browser
  let page
  try {
    const entry = await waitForLocalEntry(host)
    browser = await chromium.launch({ executablePath: chrome, headless: true })
    page = await browser.newPage({ locale: 'zh-CN', viewport: { width: 1360, height: 920 } })
    page.setDefaultTimeout(10000)
    await page.goto(entry, { waitUntil: 'domcontentloaded' }).catch(() => { throw new Error('无法打开隔离 Web 页面') })
    const welcome = page.getByRole('dialog', { name: '开始使用', exact: true })
    await page.addLocatorHandler(welcome, () => button(welcome, '关闭').click())
    await button(page, '肥鱼笔记').click()
    await page.locator('.paper-app:not(.conversation-notes) .paper-top').waitFor()
    const session = page.getByText('肥鱼笔记 · 会话转存体验', { exact: true }).first()
    if (!await session.isVisible()) await page.getByText('肥鱼笔记验收', { exact: true }).click()
    await session.click()
    if (!await page.locator('.conversation-notes:visible').isVisible()) await button(page, '会话笔记').click()

    const result = await checkFindNotebookFlow(page, async (side, name) => {
      await page.mouse.move(1, 1)
      await side.screenshot({ path: join(evidence, `${name}.png`) })
    })
    console.log(JSON.stringify({ passed: true, ...result }))
  } catch (error) {
    const sidebar = page?.locator('.conversation-notes:visible')
    const target = await sidebar?.isVisible().catch(() => false) ? sidebar : page
    await target?.screenshot({ path: join(evidence, 'failure.png'), timeout: 3000 }).catch(() => {})
    throw error
  } finally {
    try {
      await browser?.close()
    } finally {
      if (host.pid && host.exitCode === null && host.signalCode === null) {
        const closed = once(host, 'exit')
        host.kill()
        await Promise.race([closed, delay(4000, undefined, { ref: false })])
      }
    }
  }
}

if (require.main === module) {
  run().catch(error => {
    console.error(error.message.replace(/([?&]token=)[^\s"&]+/g, '$1[redacted]'))
    process.exitCode = 1
  })
}

module.exports = { resolveIsolatedRoot, isolatedProfile }
