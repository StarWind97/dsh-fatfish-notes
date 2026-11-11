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
