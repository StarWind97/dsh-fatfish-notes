import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHttpHandler, fence } from './routes.js';
import { NotebookError } from '../domain/errors.js';
const exec = promisify(execFile);
const fail = () => new NotebookError('window_unavailable', '暂时无法打开独立笔记窗口，请稍后重试', 409);
export async function findNotesBrowser() {
    if (process.platform !== 'win32')
        return null;
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]) {
        if (!base)
            continue;
        for (const part of ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe']) {
            const path = join(base, part);
            try {
                await access(path);
                return path;
            }
            catch { }
        }
    }
    return null;
}
/** This listener belongs to the existing DSH application and dies with it. */
export async function enableStandalone(app, dir) {
    if (app.openWindow)
        return;
    app.requireWindowIdentity = true;
    const browser = await findNotesBrowser();
    app.workspace.available = !!browser;
    const config = join(dir, 'window-endpoint.json'), processFile = join(dir, 'window-browser.json'), profile = join(dir, 'window-browser');
    let port, server, opening;
    try {
        const v = JSON.parse(await readFile(config, 'utf8'));
        if (Number.isInteger(v.port) && v.port >= 1024 && v.port <= 65535)
            port = v.port;
        else
            throw fail();
    }
    catch (e) {
        if (e.code !== 'ENOENT')
            throw e;
    }
    const atomic = async (path, value) => { await writeFile(path + '.tmp', JSON.stringify(value)); await rename(path + '.tmp', path); };
    async function listen() {
        if (server?.listening)
            return;
        const srv = createServer(), origin = () => `http://127.0.0.1:${srv.address().port}`;
        const handler = createHttpHandler({ app, getOrigin: origin });
        srv.on('request', (req, res) => {
            void (async () => {
                try {
                    fence(req, origin());
                    const path = new URL(req.url ?? '/', origin()).pathname;
                    if (path.startsWith('/dsh-fatfish-notes/')) {
                        await handler(req, res);
                        return;
                    }
                    if (req.method !== 'GET' || !['/', '/standalone.js'].includes(path)) {
                        res.writeHead(404);
                        res.end();
                        return;
                    }
                    const content = path === '/' ? Buffer.from('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>肥鱼笔记 · Fatfish Notes</title><style>html,body,#app{height:100%;margin:0}body{background:var(--dsw-alias-bg-layer-1,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font-family:system-ui,sans-serif}*{box-sizing:border-box}</style><div id="app">正在连接笔记库…</div><script src="/standalone.js"></script></html>') : await readFile(new URL('../standalone.js', import.meta.url));
                    res.writeHead(200, { 'content-type': path === '/' ? 'text/html; charset=utf-8' : 'application/javascript; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" });
                    res.end(content);
                }
                catch {
                    if (!res.headersSent)
                        res.writeHead(403);
                    res.end();
                }
            })();
        });
        try {
            await new Promise((resolve, reject) => { srv.once('error', reject); srv.listen(port ?? 0, '127.0.0.1', () => { srv.removeListener('error', reject); resolve(); }); });
            if (!port) {
                port = srv.address().port;
                await atomic(config, { port });
            }
            server = srv;
        }
        catch (e) {
            srv.close();
            throw e;
        }
    }
    async function focus(record) {
        if (!Number.isSafeInteger(record.pid) || record.pid <= 0 || !/^\d+$/.test(record.startTicks))
            return { found: false, focused: false };
        try {
            const result = await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./focus-window.ps1', import.meta.url)), '-BrowserPid', String(record.pid), '-ExpectedStartTicks', record.startTicks, '-ExpectedProfile', profile], { windowsHide: true, timeout: 12000 });
            return JSON.parse(result.stdout.trim());
        }
        catch {
            return { found: false, focused: false };
        }
    }
    app.openWindow = (noteId) => {
        app.workspace.requestOpen(noteId);
        if (opening)
            return opening;
        opening = (async () => {
            if (!browser)
                throw fail();
            try {
                await listen();
                let record;
                try {
                    record = JSON.parse(await readFile(processFile, 'utf8'));
                }
                catch { }
                if (record) {
                    const result = await focus(record);
                    if (result.found)
                        return { ok: true, focused: result.focused, reused: true };
                }
                await mkdir(profile, { recursive: true });
                const child = spawn(browser, [`--app=http://127.0.0.1:${port}/`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1380,940'], { detached: true, stdio: 'ignore', windowsHide: false });
                await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
                child.unref();
                const result = await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./focus-window.ps1', import.meta.url)), '-BrowserPid', String(child.pid), '-ExpectedProfile', profile], { windowsHide: true, timeout: 45000 });
                const found = JSON.parse(result.stdout.trim());
                if (!found.found || !found.startTicks)
                    throw fail();
                await atomic(processFile, { pid: found.pid ?? child.pid, startTicks: found.startTicks });
                return { ok: true, focused: found.focused, reused: false };
            }
            catch {
                throw fail();
            }
        })().finally(() => { opening = undefined; });
        return opening;
    };
    app.closeWindowService = async () => { if (server) {
        server.closeAllConnections();
        await new Promise(resolve => server.close(() => resolve()));
        server = undefined;
    } };
    // A previously opened window keeps the same origin and its recovery storage.
    if (port)
        await listen().catch(() => { });
}
