import { changeReferences } from '../portable-links.js';
import { attachmentLinkId } from '../../contracts/note-links.js';
import { noteDateTime } from '../date.js';
import { object, id, hash, text } from '../validation.js';
import { validateAsset, mediaTypeFor } from '../assets.js';
import { ExportError, exportModel } from './model.js';
import { exportFilename, exportMarkdown, sourceMarkdown } from './markdown.js';
import { exportZip } from './zip.js';
import { exportPdf } from './pdf.js';
import { EXPORT_LIMITS } from './layout.js';
import { imageDimensions } from './image.js';
export async function createExport(repository, input, signal) {
    const v = object(input), format = text(v.format, 30);
    if (Object.keys(v).some(key => !['noteId', 'revision', 'format', 'includeSource', 'includeTags', 'includeSummary', 'convertedImages', 'assetId'].includes(key)))
        throw new ExportError('export_request');
    if (!['markdown', 'markdown-zip', 'pdf', 'png-long', 'png-pages', 'snapshot', 'original'].includes(format))
        throw new ExportError('export_request');
    for (const flag of [v.includeSource, v.includeTags, v.includeSummary]) {
        if (flag !== undefined && typeof flag !== 'boolean')
            throw new ExportError('export_request');
    }
    const note = await repository.getRevision(id(v.noteId), hash(v.revision), signal), filename = exportFilename(note.title);
    if (format === 'original') {
        const asset = text(v.assetId, 80);
        if (!note.assetIds.includes(asset))
            throw new ExportError('export_image_missing');
        return { bytes: await repository.getAsset(asset, signal), mediaType: mediaTypeFor(asset), filename: `${filename}-${asset.slice(0, 10)}.${asset.split('.')[1]}` };
    }
    const body = note.body, markdownOnly = format === 'markdown' || format === 'markdown-zip';
    const model = exportModel(note.title, body, note.assetIds, markdownOnly);
    let appendix;
    if (v.includeSource === true && note.sourceId) {
        const source = sourceMarkdown(await repository.getSource(note.sourceId, signal)), sourceModel = exportModel('', source.body, source.assets, markdownOnly);
        appendix = source.body;
        model.blocks.push(...sourceModel.blocks.slice(1)); // The appendix supplies its own heading.
        model.assetIds = [...new Set([...model.assetIds, ...sourceModel.assetIds])];
    }
    const header = { title: note.title, modified: noteDateTime(note.recordedAt),
        tags: v.includeTags === false ? [] : note.tags, summary: v.includeSummary === false ? '' : note.summary };
    const details = [{ type: 'text', kind: 'meta', runs: [{ text: header.modified }] }];
    if (header.tags.length)
        details.push({ type: 'text', kind: 'meta', runs: [{ text: header.tags.map(tag => '#' + tag).join(' · ') }] });
    if (header.summary)
        details.push({ type: 'text', kind: 'quote', runs: [{ text: header.summary }] }, { type: 'rule' });
    model.blocks.splice(1, 0, ...details);
    const images = {};
    for (const asset of model.assetIds) {
        signal?.throwIfAborted();
        images[asset] = await repository.getAsset(asset, signal);
    }
    if (format === 'snapshot' || format === 'png-long' || format === 'png-pages') {
        const snapshot = { noteId: note.noteId, revision: note.revision, filename, model, assets: Object.fromEntries(Object.entries(images).map(([asset, bytes]) => [asset, `data:${mediaTypeFor(asset)};base64,${bytes.toString('base64')}`])) };
        return { bytes: Buffer.from(JSON.stringify(snapshot)), mediaType: 'application/json; charset=utf-8', filename: `${filename}.json` };
    }
    const attached = {}, attachmentNames = new Map();
    if (markdownOnly)
        for (const a of note.attachments ?? []) {
            const name = a.id.slice(0, 16) + '-' + exportFilename(a.name);
            attachmentNames.set(a.id, name);
            if (format === 'markdown-zip')
                attached[name] = await repository.getAttachment(a.id, signal);
        }
    const portableBody = changeReferences(body, ref => { const file = attachmentLinkId(ref.url); return file && attachmentNames.has(file) ? 'attachments/' + encodeURIComponent(attachmentNames.get(file)) : undefined; });
    if (format === 'markdown')
        return { bytes: Buffer.from(exportMarkdown(header, portableBody, appendix)), mediaType: 'text/markdown; charset=utf-8', filename: `${filename}.md` };
    if (format === 'markdown-zip')
        return { bytes: exportZip(filename, exportMarkdown(header, portableBody, appendix), images, attached), mediaType: 'application/zip', filename: `${filename}.zip` };
    return renderPdfFile(filename, model, images, v.convertedImages, signal);
}
export async function renderPdfFile(filename, model, images, convertedImages, signal) {
    const conversions = convertedImages === undefined ? [] : convertedImages;
    if (!Array.isArray(conversions))
        throw new ExportError('export_conversion');
    const seen = new Set();
    let bytesTotal = 0;
    for (const conversion of conversions) {
        const item = object(conversion), asset = text(item.assetId, 80), base64 = text(item.png, 2 * 1024 * 1024);
        if (Object.keys(item).some(key => !['assetId', 'png'].includes(key)))
            throw new ExportError('export_conversion');
        if (seen.has(asset) || !model.assetIds.includes(asset) || !/\.(gif|webp)$/.test(asset) || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64))
            throw new ExportError('export_conversion');
        seen.add(asset);
        const bytes = Buffer.from(base64, 'base64');
        bytesTotal += bytes.length;
        if (bytesTotal > 1024 * 1024)
            throw new ExportError('export_conversion_budget');
        validateAsset(bytes, 'image/png');
        const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
        if (!width || !height || width > EXPORT_LIMITS.side || height > EXPORT_LIMITS.side || width * height > EXPORT_LIMITS.imagePixels)
            throw new ExportError('export_image_budget');
        const original = imageDimensions(images[asset]);
        if (width !== original.width || height !== original.height)
            throw new ExportError('export_conversion');
        images[asset] = bytes;
    }
    if (model.assetIds.some(asset => /\.(gif|webp)$/.test(asset) && !seen.has(asset)))
        throw new ExportError('export_conversion_required');
    return { bytes: await exportPdf(model, images, signal), mediaType: 'application/pdf', filename: `${filename}.pdf` };
}
