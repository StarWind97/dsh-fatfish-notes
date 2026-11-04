import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { randomUUID } from 'node:crypto';
import { NotebookError } from '../domain/errors.js';
import { MAX_IMAGE_BYTES, normalizeImageAssets } from '../media/images.js';
const unsafe = () => new NotebookError('unsafe_image_url', '仅能导入公开 HTTPS 图片，不能访问本机、私网或受限地址');
async function abortable(work, signal) { signal.throwIfAborted(); let abort; const cancelled = new Promise((_resolve, reject) => { abort = () => reject(new NotebookError('aborted', '图片导入已取消或超时', 409)); signal.addEventListener('abort', abort, { once: true }); }); try {
    return await Promise.race([work, cancelled]);
}
finally {
    if (abort)
        signal.removeEventListener('abort', abort);
} }
/** Conservative global-unicast policy; reject transition and special-use ranges. */
export function isPublicAddress(address) {
    const family = isIP(address);
    if (family === 4) {
        const [a, b] = address.split('.').map(Number);
        return a !== undefined && b !== undefined && a !== 0 && a !== 10 && a !== 127 && a < 224 && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && (b === 168 || b === 0 || b === 2)) && !(a === 198 && (b === 18 || b === 19 || b === 51)) && !(a === 203 && b === 0) && !(a === 100 && b >= 64 && b <= 127);
    }
    if (family === 6) {
        const lower = address.toLowerCase();
        return /^[23][0-9a-f]{3}:/.test(lower) && !lower.startsWith('2001:') && !lower.startsWith('2002:') && !lower.startsWith('3fff:');
    }
    return false;
}
export async function publicImageTarget(input, resolve = host => lookup(host, { all: true, verbatim: true })) {
    let url;
    try {
        url = new URL(input);
    }
    catch {
        throw unsafe();
    }
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !hostname.includes('.') || hostname.endsWith('.') || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || input.length > 4096)
        throw unsafe();
    const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolve(hostname);
    if (!addresses.length || addresses.some(a => !isPublicAddress(a.address)))
        throw unsafe();
    return { url, address: addresses[0] };
}
/** Pin the already validated DNS address through the TLS connection (no second DNS lookup). */
const pinnedRequest = ({ url, address }, signal) => new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', signal, agent: false, headers: { accept: 'image/png,image/jpeg,image/webp,image/gif' }, lookup: (_hostname, options, callback) => callback(null, options.all ? [address] : address.address, address.family) }, res => {
        const status = res.statusCode ?? 0, location = res.headers.location, mediaType = (res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
        if (status >= 300 && status < 400) {
            res.resume();
            resolve({ status, ...(location ? { location } : {}), mediaType, bytes: Buffer.alloc(0) });
            return;
        }
        if (Number(res.headers['content-length']) > MAX_IMAGE_BYTES) {
            res.destroy();
            reject(new NotebookError('image_limit', '单张图片不能超过 5 MiB'));
            return;
        }
        let size = 0;
        const chunks = [];
        res.on('data', (chunk) => { size += chunk.length; if (size > MAX_IMAGE_BYTES) {
            res.destroy();
            reject(new NotebookError('image_limit', '单张图片不能超过 5 MiB'));
        }
        else
            chunks.push(chunk); });
        res.once('error', reject);
        res.once('end', () => resolve({ status, mediaType, bytes: Buffer.concat(chunks) }));
    });
    req.once('error', reject);
    req.end();
});
export async function importImage(input, signal, dependencies = {}) {
    const active = signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000);
    let url = input;
    for (let redirects = 0; redirects <= 4; redirects++) {
        active.throwIfAborted();
        const target = await abortable(publicImageTarget(url, dependencies.lookup), active);
        active.throwIfAborted();
        const response = await abortable((dependencies.request ?? pinnedRequest)(target, active), active);
        if (response.status >= 300 && response.status < 400) {
            if (!response.location)
                throw unsafe();
            url = new URL(response.location, target.url).href;
            continue;
        }
        if (response.status !== 200)
            throw new NotebookError('image_import_failed', '公开图片暂时无法读取', 502);
        return normalizeImageAssets([{ id: randomUUID(), mediaType: response.mediaType, base64: response.bytes.toString('base64') }])[0];
    }
    throw unsafe();
}
