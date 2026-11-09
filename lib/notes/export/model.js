import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
export class ExportError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
export function exportLink(url) {
    try {
        const u = new URL(url);
        return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : undefined;
    }
    catch {
        return undefined;
    }
}
export function exportTree(body) { return fromMarkdown(body, { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] }); }
/** Safe projection, shared by PDF and the isolated image renderer. No HTML or URL fetch. */
export function exportModel(title, body, allowed, markdownOnly = false) {
    const tree = exportTree(body), definitions = new Map(), used = new Set();
    function scan(node) {
        // Depth-first child order is document order, including nested definitions.
        if (node.type === 'definition' && !definitions.has(node.identifier.toUpperCase()))
            definitions.set(node.identifier.toUpperCase(), node.url);
        if ('children' in node)
            for (const child of node.children)
                scan(child);
    }
    scan(tree);
    function image(url, alt) {
        const match = /^\.\.\/assets\/([a-f0-9]{64}\.(?:png|jpg|webp|gif))$/.exec(url), asset = match?.[1];
        if (!asset || !allowed.includes(asset)) {
            if (markdownOnly && /^https?:\/\//i.test(url))
                return { type: 'text', kind: 'paragraph', runs: [{ text: alt }] };
            throw new ExportError('export_image_unarchived');
        }
        used.add(asset);
        return { type: 'image', assetId: asset, alt };
    }
    function runs(nodes, style = {}) {
        return nodes.flatMap(node => {
            if (node.type === 'image' || node.type === 'imageReference')
                return [image(node.type === 'image' ? node.url : definitions.get(node.identifier.toUpperCase()) ?? '', node.alt ?? '')];
            if (node.type === 'break')
                return [{ text: '\n', ...style }];
            // Raw HTML is visible literal text, never an executable node.
            if (node.type === 'text' || node.type === 'html' || node.type === 'inlineCode')
                return [{ text: node.value, ...style, ...(node.type === 'inlineCode' ? { code: true } : {}) }];
            if ('children' in node) {
                const href = node.type === 'link' ? exportLink(node.url) : node.type === 'linkReference' ? exportLink(definitions.get(node.identifier.toUpperCase()) ?? '') : undefined;
                return runs(node.children, { ...style, ...(node.type === 'strong' ? { strong: true } : {}), ...(node.type === 'emphasis' ? { emphasis: true } : {}), ...(href ? { href } : {}) });
            }
            return [];
        });
    }
    function textBlocks(nodes, kind, prefix = '', level) {
        const out = [], values = runs(nodes);
        let pending = prefix ? [{ text: prefix }] : [];
        const flush = () => { if (pending.length)
            out.push({ type: 'text', kind, runs: pending, ...(level ? { level } : {}) }); pending = []; };
        for (const value of values) {
            if ('type' in value) {
                flush();
                out.push(value);
            }
            else
                pending.push(value);
        }
        flush();
        return out;
    }
    function blocks(nodes, quote = false, prefix = '') {
        return nodes.flatMap(node => {
            switch (node.type) {
                case 'paragraph': return textBlocks(node.children, quote ? 'quote' : 'paragraph', prefix);
                case 'heading': return textBlocks(node.children, 'heading', prefix, node.depth);
                case 'code': return [{ type: 'text', kind: 'code', runs: [{ text: node.value, code: true }] }];
                case 'html': return [{ type: 'text', kind: 'code', runs: [{ text: node.value }] }];
                case 'blockquote': return blocks(node.children, true);
                case 'list': return node.children.flatMap((item, index) => blocks(item.children, quote, node.ordered ? `${(node.start ?? 1) + index}. ` : '• '));
                case 'thematicBreak': return [{ type: 'rule' }];
                case 'table': return [{ type: 'table', rows: node.children.map(row => row.children.map(cell => {
                            const contents = runs(cell.children);
                            if (contents.some(v => 'type' in v) && !markdownOnly)
                                throw new ExportError('export_table_image');
                            return contents.filter(v => !('type' in v));
                        })) }];
                case 'definition': return [];
                default: return [];
            }
        });
    }
    return { title, blocks: [{ type: 'text', kind: 'heading', level: 1, runs: [{ text: title || '未命名笔记' }] }, ...blocks(tree.children)], assetIds: [...used] };
}
