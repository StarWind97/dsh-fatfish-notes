import { fromMarkdown } from 'mdast-util-from-markdown';
import { attachmentLinkId } from '../contracts/note-links.js';
/** Omitting a selected file removes the live link/image, retaining an honest caption. */
export function omitMaterials(body, assets, files) {
    const root = fromMarkdown(body), nodes = [root], definitions = new Map(), changes = [];
    for (let i = 0; i < nodes.length; i++)
        if (nodes[i].children)
            nodes.push(...nodes[i].children);
    nodes.sort((a, b) => (a.position?.start.offset ?? 0) - (b.position?.start.offset ?? 0));
    for (const n of nodes)
        if (n.type === 'definition' && !definitions.has(n.identifier))
            definitions.set(n.identifier, n.url);
    for (const n of nodes) {
        if (!['image', 'imageReference', 'link', 'linkReference'].includes(n.type))
            continue;
        const url = n.url ?? definitions.get(n.identifier) ?? '', image = /^\.\.\/assets\/(.+)$/.exec(url)?.[1], file = attachmentLinkId(url);
        if ((image && !assets.has(image)) || (file && !files.has(file))) {
            const name = n.alt ?? n.children?.map((v) => v.value ?? '').join('') ?? '文件';
            changes.push({ start: n.position.start.offset, end: n.position.end.offset, text: name + '（未包含）' });
        }
    }
    // Replacing an outer link also removes its image caption; do not apply an overlapping edit twice.
    const outer = changes.filter(c => !changes.some(parent => parent !== c && parent.start <= c.start && parent.end >= c.end));
    for (const c of outer.sort((a, b) => b.start - a.start)) {
        body = body.slice(0, c.start) + c.text + body.slice(c.end);
    }
    return body;
}
