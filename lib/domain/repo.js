import { basename, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NotebookError } from './errors.js';
export function validBranch(branch) {
    return branch.length > 0 && branch !== '@' && !branch.startsWith('-') &&
        !/[\x00-\x20\x7f~^:?*\[\\]/.test(branch) && !branch.includes('..') && !branch.includes('@{') &&
        !branch.endsWith('.') && branch.split('/').every(part => part.length > 0 && !part.startsWith('.') && !part.endsWith('.lock'));
}
export function parseRepoRef(input) {
    if (typeof input !== 'string')
        return null;
    const text = input.trim();
    // Match the original text in full before URL normalization can hide dot segments.
    const match = /^(?:https:\/\/(?:www\.)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)?([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:(?:@|\/tree\/)([^?#]+))?$/i.exec(text);
    if (!match)
        return null;
    const owner = match[1], repo = match[2], branch = match[3] ?? 'main';
    if (!owner || !repo || repo === '.' || repo === '..' || !validBranch(branch))
        return null;
    // A tree path is only meaningful on a web URL, not a short or SSH ref.
    if (text.includes('/tree/') && !/^https:\/\//i.test(text))
        return null;
    return { owner, repo, branch };
}
export function normalizeRemoteUrl(input, { allowLocal = false } = {}) {
    const ref = parseRepoRef(input);
    if (ref) {
        const text = typeof input === 'string' ? input.trim() : '';
        const prefix = /^git@github\.com:/i.test(text) ? 'git@github.com:' : /^ssh:\/\//i.test(text) ? 'ssh://git@github.com/' : 'https://github.com/';
        return { ref, url: `${prefix}${ref.owner}/${ref.repo}.git`, local: false };
    }
    if (allowLocal && typeof input === 'string') {
        try {
            let path;
            if (input.startsWith('file:')) {
                const url = new URL(input);
                if (url.username || url.password || url.search || url.hash)
                    throw new Error('invalid local URL');
                path = fileURLToPath(url);
            }
            else if (isAbsolute(input))
                path = input;
            else
                throw new Error('not absolute');
            const absolute = resolve(path);
            const name = basename(absolute).replace(/\.git$/i, '').replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '') || 'repository';
            return { ref: { owner: 'local', repo: name, branch: 'main' }, url: pathToFileURL(absolute).href, local: true };
        }
        catch { /* Fall through to one safe public error. */ }
    }
    throw new NotebookError('invalid_repo', '请输入完整的 GitHub 仓库地址或 owner/repo');
}
