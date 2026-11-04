import { NotebookError } from '../domain/errors.js';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_NOTE_IMAGE_BYTES = 20 * 1024 * 1024;
export const IMAGE_EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
export function normalizeAssetId(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.trim()))
        throw new NotebookError('invalid_asset', '图片标识格式无效');
    return value.trim();
}
function detectType(bytes) {
    if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0)
        return 'image/png';
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9)
        return 'image/jpeg';
    if (bytes.length >= 13 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)) && bytes.readUInt16LE(6) > 0 && bytes.readUInt16LE(8) > 0)
        return 'image/gif';
    if (bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.readUInt32LE(4) === bytes.length - 8 && bytes.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16)))
        return 'image/webp';
    return null;
}
/** Copies and canonicalizes all data before any async work; journals never reopen mutable source files. */
export function normalizeImageAssets(value) {
    if (!Array.isArray(value) || value.length > 128)
        throw new NotebookError('invalid_asset', '图片列表格式无效或数量过多');
    const ids = new Set();
    let total = 0;
    return value.map((raw) => {
        if (typeof raw !== 'object' || raw === null || !('id' in raw) || !('mediaType' in raw) || !('base64' in raw))
            throw new NotebookError('invalid_asset', '图片快照格式无效');
        const id = normalizeAssetId(raw.id);
        if (ids.has(id))
            throw new NotebookError('invalid_asset', '图片标识不能重复');
        ids.add(id);
        if (typeof raw.base64 !== 'string' || raw.base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 1024)
            throw new NotebookError('image_limit', '单张图片不能超过 5 MiB');
        const encoded = raw.base64.replace(/\s/g, '');
        if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1)
            throw new NotebookError('invalid_asset', '图片 base64 编码无效');
        const bytes = Buffer.from(encoded, 'base64');
        if (bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, ''))
            throw new NotebookError('invalid_asset', '图片 base64 编码无效');
        if (bytes.length > MAX_IMAGE_BYTES || (total += bytes.length) > MAX_NOTE_IMAGE_BYTES)
            throw new NotebookError('image_limit', '单张图片上限 5 MiB，每次导入总上限 20 MiB');
        const mediaType = detectType(bytes);
        if (!mediaType || mediaType !== raw.mediaType)
            throw new NotebookError('invalid_asset', '图片内容与声明类型不符，仅支持 PNG、JPEG、WebP 和 GIF');
        return { id, mediaType, base64: bytes.toString('base64') };
    });
}
