import { randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { NotebookError } from '../domain/errors.js';
import { missing, readBytes, replaceFile, safePath } from '../notes/files.js';
const invalid = () => new NotebookError('notebook_folder_invalid', '请选择一个空的本机资料夹，或使用默认位置', 409);
const marker = '.dsh-notebook-folder';
const identityFile = '.dsh-local-repository';
export class PreviousFolderUnavailable extends NotebookError {
    folder;
    constructor(folder) {
        super('notebook_previous_folder_unavailable', '无法核对原资料夹，请选择已有位置或新建本机资料夹', 409);
        this.folder = folder;
    }
}
export async function readFolderIdentity(folder) {
    const path = join(folder, 'notes', identityFile);
    return readBytes(path, 128).then(b => b.toString('utf8')).catch(e => { if (missing(e))
        return null; throw new PreviousFolderUnavailable(folder); });
}
export async function markFolder(location) {
    const { folder, ownerId, repositoryId } = location, expected = ownerId + '/' + repositoryId;
    const existing = await readFolderIdentity(folder);
    if (existing === expected)
        return;
    if (existing !== null)
        throw new PreviousFolderUnavailable(folder);
    const path = join(folder, 'notes', identityFile), temp = path + '.' + randomUUID() + '.tmp';
    await mkdir(dirname(path), { recursive: true });
    try {
        await writeFile(temp, expected, { flag: 'wx', mode: 0o600 });
        await replaceFile(temp, path);
    }
    finally {
        await rm(temp, { force: true });
    }
}
export async function verifyRememberedFolder(home, location) {
    try {
        await checkFolder(home, location.folder, true);
        const manifest = join(location.folder, 'notes', 'manifest.json');
        await safePath(manifest);
        if (await readFolderIdentity(location.folder) !== location.ownerId + '/' + location.repositoryId || !(await lstat(manifest)).isFile())
            throw new PreviousFolderUnavailable(location.folder);
    }
    catch {
        throw new PreviousFolderUnavailable(location.folder);
    }
}
export function outside(parent, child) {
    const rel = relative(parent, child);
    return isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep);
}
export function folderPath(home, input) {
    if (typeof input !== 'string' || !isAbsolute(input) || input.includes('\0') ||
        (process.platform === 'win32' && !/^[a-z]:[\\/]/i.test(input)))
        throw invalid();
    const path = resolve(input);
    const library = relative(join(home, 'libraries'), path);
    const named = library && !library.startsWith('..') && !isAbsolute(library) && !library.includes(sep);
    if (relative(home, path) && !named && (!outside(home, path) || !outside(path, home)))
        throw invalid();
    return path;
}
export function suggestedFolder(home, repo) {
    if (!/^[a-z0-9_.-]{1,100}$/i.test(repo) || /[.]$/.test(repo) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(repo))
        throw invalid();
    return folderPath(home, join(home, 'libraries', repo));
}
export function distinctFolder(home, source, target) {
    if (!relative(home, target) || !outside(target, source) || (relative(home, source) && !outside(source, target)))
        throw invalid();
}
export async function emptyFolder(path) {
    await safePath(path);
    if ((await readdir(path).catch(e => { if (missing(e))
        return []; throw invalid(); })).length)
        throw invalid();
}
export async function checkInitialFolder(home, path, repo, resuming = false) {
    // Fresh setup cannot adopt the control folder or a differently named local copy.
    if (!relative(home, path) || basename(path) !== repo)
        throw invalid();
    await safePath(path);
    const files = await readdir(path).catch(e => { if (missing(e))
        return []; throw invalid(); });
    if (!files.length)
        return;
    if (resuming && files.length === 1 && files[0] === marker && await owned(home, path))
        return;
    throw new NotebookError('notebook_folder_occupied', '此文件夹已有内容，请修改新建云端库名称或更换父目录', 409);
}
export async function prepareInitialFolder(home, path, repo) {
    await checkInitialFolder(home, path, repo, true);
    await mkdir(path, { recursive: true });
    if (!await owned(home, path))
        await writeFile(join(path, marker), resolve(home), { flag: 'wx', mode: 0o600 });
}
export async function claimFolder(home, path) {
    await emptyFolder(path);
    await mkdir(path, { recursive: true });
    await writeFile(join(path, marker), resolve(home), { flag: 'wx', mode: 0o600 });
}
export const folderMarker = marker;
async function owned(home, path) {
    const file = join(path, marker);
    await safePath(file);
    const owner = await readFile(file, 'utf8').catch(e => { if (missing(e))
        return null; throw e; });
    if (owner === null)
        return false;
    if (owner !== resolve(home))
        throw invalid();
    return true;
}
export async function checkFolder(home, path, bound = false) {
    if (!relative(home, path))
        return;
    if (await owned(home, path))
        return;
    if (bound || (await readdir(path).catch(e => { if (missing(e))
        return []; throw invalid(); })).length)
        throw invalid();
}
export async function prepareFolder(home, path, notes) {
    if (!relative(home, path))
        return;
    try {
        await checkFolder(home, path);
        await mkdir(path, { recursive: true });
        if (!await owned(home, path))
            await writeFile(join(path, marker), resolve(home), { flag: 'wx', mode: 0o600 });
        // Older unbound installations may already have notes. Keep the originals,
        // and expose the copy only after the entire directory is available.
        const target = join(path, 'notes');
        if (!(await readdir(path)).includes('notes') && (await notes.files.scan()).paths.length) {
            const stage = join(path, '.notes-' + randomUUID());
            await cp(notes.files.root, stage, { recursive: true, errorOnExist: true, force: false });
            await rename(stage, target);
        }
    }
    catch (error) {
        if (error instanceof NotebookError)
            throw error;
        throw invalid();
    }
}
