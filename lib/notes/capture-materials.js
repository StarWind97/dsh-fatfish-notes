import { changeReferences, references } from './portable-links.js';
import { markdownLabel } from '../contracts/note-links.js';
const localTarget = (value) => { try {
    value = decodeURIComponent(value);
}
catch { } ; return value.replace(/^file:\/\/\/?/i, '').replace(/\\/g, '/').replace(/^\.\//, ''); };
/** A file card has an explicit identity. Plain text and legacy sources never guess one. */
export function capturedFile(block, message, materials) {
    if (block.type !== 'text' || block.materialId === undefined || materials === undefined)
        return null;
    const matches = materials.filter(m => m.id === block.materialId);
    const material = matches.length === 1 ? matches[0] : undefined;
    if (!material || material.origin !== 'upload' || material.kind !== 'file' || material.messageId !== message.id || material.seq !== message.seq || !new RegExp(`^upload:${message.seq}:[0-9]+$`).test(material.id) || material.saved && !/^[a-f0-9]{64}$/.test(material.saved.id))
        return { label: '上传文件（关联不可用）', markdown: '上传文件（关联不可用）', material: undefined };
    const label = material.name.replace(/[\r\n]/g, ' '), safe = label.replace(/[\\`*_[\]<>]/g, '\\$&');
    const suffix = !material.available ? '文件不可用' : material.saved ? '' : '未包含';
    return { material, label: label + (suffix ? `（${suffix}）` : ''), markdown: material.saved && material.available ? `[${safe}](../attachments/${material.saved.id}.bin)` : `${safe}（${suffix}）` };
}
/** Match only actual local Markdown destinations to known selected materials. No disk search. */
export function captureLinks(messages, materials, paths = new Map()) {
    const result = new Map();
    for (const m of messages)
        for (const b of m.blocks)
            if (b.type === 'text')
                for (const ref of references(b.text)) {
                    if (!ref.used || /^(?:https?:|data:|fatfish-note:|#)/i.test(ref.url))
                        continue;
                    const target = localTarget(ref.url), matches = materials.filter(file => {
                        const path = paths.get(file.id), normalized = path && localTarget(path);
                        return target === file.name || !!normalized && (target === normalized || /^[a-z]:\//i.test(target) && target.toLowerCase() === normalized.toLowerCase());
                    });
                    if (matches.length === 1) {
                        const id = matches[0].id;
                        result.set(id, [...(result.get(id) ?? []), { url: ref.url, image: ref.image }]);
                    }
                }
    return result;
}
export function capturedText(body, materials = [], externalImagesAsLinks = true) {
    return changeReferences(body, ref => {
        if (!ref.used)
            return undefined;
        const material = materials.find(m => m.bodyLinks?.includes(ref.url));
        if (!material) {
            if (externalImagesAsLinks && ref.image && /^https?:\/\//i.test(ref.url)) {
                ref.image = false;
                return ref.url;
            }
            return undefined;
        }
        if (material.assetId)
            return '../assets/' + material.assetId;
        if (material.saved) {
            ref.image = false;
            return '../attachments/' + material.saved.id + '.bin';
        }
        return undefined;
    });
}
export function supplementMarkdown(materials, files = []) {
    const rows = [...materials.assetIds.map((id, i) => `[补充图片 ${i + 1}](../assets/${id})`), ...materials.attachmentIds.map(id => `[${markdownLabel(files.find(f => f.id === id)?.name ?? '附件')}](../attachments/${id}.bin)`)];
    return rows.length ? '\n\n## 补充附件\n\n' + rows.join('\n\n') : '';
}
/** A delivery belongs to a turn; an upload belongs to its visible message. */
export function materialsFor(messages, materials) {
    const ids = new Set(messages.map(m => m.id)), turns = new Set(messages.flatMap(m => m.turn === undefined ? [] : [m.turn]));
    return materials.filter(m => m.messageId ? ids.has(m.messageId) : m.turn !== undefined && turns.has(m.turn));
}
export function materialMarkdown(materials) {
    if (!materials.length)
        return '';
    const label = (s) => s.replace(/[\\\[\]<>]/g, '\\$&');
    return '\n\n## 文件与图片\n\n' + materials.map(m => m.assetId ? `![${label(m.name)}](../assets/${m.assetId})` : m.saved ? `[${label(m.name)}](../attachments/${m.saved.id}.bin)` : `${label(m.name)}（未选择归档）`).join('\n\n');
}
