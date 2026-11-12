import { exportTree } from './export/model.js';
import { attachmentLinkId } from '../contracts/note-links.js';
/** Actual Markdown uses only: code and unused definitions are not document resources. */
export function bodyMaterials(body) {
    const root = exportTree(body), nodes = [root], definitions = new Map();
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if ('children' in n)
            nodes.push(...n.children);
        if (n.type === 'definition' && !definitions.has(n.identifier.toUpperCase()))
            definitions.set(n.identifier.toUpperCase(), n.url);
    }
    const assetIds = new Set(), attachmentIds = new Set();
    for (const n of nodes) {
        const url = n.type === 'link' || n.type === 'image' ? n.url : n.type === 'linkReference' || n.type === 'imageReference' ? definitions.get(n.identifier.toUpperCase()) : undefined;
        if (!url)
            continue;
        const asset = /^\.\.\/assets\/([a-f0-9]{64}\.(?:png|jpg|webp|gif))$/.exec(url)?.[1], file = attachmentLinkId(url);
        if (asset)
            assetIds.add(asset);
        if (file)
            attachmentIds.add(file);
    }
    return { assetIds: [...assetIds], attachmentIds: [...attachmentIds] };
}
