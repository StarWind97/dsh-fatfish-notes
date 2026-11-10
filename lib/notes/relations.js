import { fromMarkdown } from 'mdast-util-from-markdown';
import { noteLinkId } from '../contracts/note-links.js';
/** Parse real links and used reference definitions; code, images and unused definitions do not count. */
export function linkedNotes(body) {
    const tree = fromMarkdown(body), definitions = new Map(), references = [], ids = new Set();
    function add(url) { const id = noteLinkId(url); if (id)
        ids.add(id); }
    function visit(node) {
        if (node.type === 'link')
            add(node.url);
        if (node.type === 'definition' && !definitions.has(node.identifier.toUpperCase()))
            definitions.set(node.identifier.toUpperCase(), node.url);
        if (node.type === 'linkReference')
            references.push(node.identifier.toUpperCase());
        if ('children' in node)
            node.children.forEach(visit);
    }
    visit(tree);
    references.forEach(ref => add(definitions.get(ref) ?? ''));
    return ids;
}
export function fillTemplate(value, title, date) {
    return value.replace(/\{\{(日期|date|标题|title)\}\}/g, (_, key) => key === '日期' || key === 'date' ? date : title);
}
