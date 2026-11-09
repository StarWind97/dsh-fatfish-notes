import { fromMarkdown } from 'mdast-util-from-markdown';
import { normalizeImageAssets, IMAGE_EXTENSIONS } from '../media/images.js';
import { NOTE_LIMITS } from './types.js';
import { assetId, digest, fail, hash, canonical, object } from './validation.js';
import { utf8 } from './files.js';
export function validateAsset(bytes, mediaType) {
    normalizeImageAssets([{ id: 'note', mediaType, base64: bytes.toString('base64') }]);
    return { id: `${digest(bytes)}.${IMAGE_EXTENSIONS[mediaType]}`, bytes: bytes.length, mediaType };
}
export function mediaTypeFor(id) {
    assetId(id);
    const ext = id.split('.')[1];
    return ext === 'png' ? 'image/png' : ext === 'jpg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/webp';
}
/** Only archive references are resolved here; ordinary remote links are never fetched. */
export function validateBodyAssets(body, ids) {
    const images = [];
    const tree = fromMarkdown(body), definitions = new Map();
    const nodes = [tree];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.children)
            nodes.push(...node.children);
    }
    // Resolve nested definitions by source order, not breadth-first collection order.
    nodes.sort((a, b) => (a.position?.start.offset ?? 0) - (b.position?.start.offset ?? 0));
    for (const node of nodes)
        if (node.type === 'definition' && node.identifier && typeof node.url === 'string' && !definitions.has(node.identifier.toUpperCase()))
            definitions.set(node.identifier.toUpperCase(), node.url);
    for (const node of nodes) {
        if (node.type !== 'image' && node.type !== 'imageReference')
            continue;
        const url = node.url ?? definitions.get(node.identifier?.toUpperCase() ?? '');
        if (!url)
            fail('note_asset');
        images.push(url);
        if (/^https?:\/\//i.test(url))
            continue; // Rendering/import policy belongs to the controlled host, never this repository.
        const match = /^\.\.\/assets\/([a-f0-9]{64}\.(?:png|jpg|gif|webp))$/.exec(url);
        if (!match?.[1] || !ids.includes(match[1]))
            fail('note_asset', '正文包含未知附件或不安全的本机路径');
    }
    return images;
}
export async function checkReferences(files, content) {
    validateBodyAssets(content.body, content.assetIds);
    for (const file of content.attachments ?? []) {
        const bytes = await files.read(`attachments/${hash(file.id)}.bin`, file.bytes);
        if (bytes.length !== file.bytes || digest(bytes) !== file.id)
            fail('note_hash');
    }
    const visit = (node) => {
        if (['link', 'definition'].includes(node.type)) {
            const match = /^\.\.\/attachments\/([a-f0-9]{64})\.bin$/.exec(node.url ?? '');
            if (match && !content.attachments?.some(a => a.id === match[1]))
                fail('note_asset', '附件不属于此笔记');
        }
        node.children?.forEach(child => visit(child));
    };
    visit(fromMarkdown(content.body));
    let total = 0;
    for (const id of content.assetIds) {
        const bytes = await files.read(`assets/${assetId(id)}`, NOTE_LIMITS.image);
        if (validateAsset(bytes, mediaTypeFor(id)).id !== id)
            fail('note_hash');
        total += bytes.length;
        if (total > NOTE_LIMITS.imageTotal)
            fail('note_limit', '单篇图片总量超过 20 MiB');
    }
    if (content.sourceId !== null) {
        const bytes = await files.read(`sources/${hash(content.sourceId)}.json`, NOTE_LIMITS.source);
        if (digest(bytes) !== content.sourceId)
            fail('note_hash');
        try {
            object(JSON.parse(utf8(bytes)));
        }
        catch {
            fail('note_source');
        }
    }
}
export function sourceBytes(value) {
    object(value);
    const bytes = Buffer.from(canonical(value));
    if (bytes.length > NOTE_LIMITS.source)
        fail('note_limit', '原始快照超过 20 MiB');
    return bytes;
}
