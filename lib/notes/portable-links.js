import { exportTree } from './export/model.js';
import { definitionLabel } from './export/markdown.js';
export function references(body) {
    const result = [], imageDefinitions = new Set(), nodes = [];
    function visit(n) { nodes.push(n); if (n.type === 'imageReference')
        imageDefinitions.add(n.identifier.toUpperCase()); if ('children' in n)
        n.children.forEach(visit); }
    visit(exportTree(body));
    for (const n of nodes)
        if ((n.type === 'link' || n.type === 'image' || n.type === 'definition') && n.position?.start.offset !== undefined && n.position.end.offset !== undefined)
            result.push({ url: n.url, image: n.type === 'image' || n.type === 'definition' && imageDefinitions.has(n.identifier.toUpperCase()), start: n.position.start.offset, end: n.position.end.offset, node: n });
    return result;
}
export function changeReferences(body, change) {
    const edits = references(body).flatMap(ref => {
        const url = change(ref);
        if (url === undefined || (url === ref.url && !(ref.node.type === 'image' && !ref.image)))
            return [];
        const n = ref.node, destination = '<' + url.replace(/[<>\r\n]/g, encodeURIComponent) + '>', title = 'title' in n && n.title ? ' ' + JSON.stringify(n.title) : '';
        const label = 'children' in n ? body.slice(n.children[0]?.position?.start.offset ?? ref.start, n.children.at(-1)?.position?.end.offset ?? ref.end) : 'alt' in n ? (n.alt ?? '').replace(/[\\[\]]/g, '\\$&') : '';
        const text = n.type === 'definition' ? `${definitionLabel(body.slice(ref.start, ref.end))} ${destination}${title}` : `${ref.image ? '!' : ''}[${label}](${destination}${title})`;
        return [{ ...ref, text }];
    });
    for (const edit of edits.sort((a, b) => b.start - a.start))
        body = body.slice(0, edit.start) + edit.text + body.slice(edit.end);
    return body;
}
