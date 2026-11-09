import { zipSync } from 'fflate';
export function exportZip(filename, markdown, images, attachments = {}) {
    const files = { [filename + '.md']: Buffer.from(markdown) };
    for (const [assetId, bytes] of Object.entries(images))
        files[`assets/${assetId}`] = bytes;
    for (const [name, bytes] of Object.entries(attachments))
        files['attachments/' + name] = bytes;
    return Buffer.from(zipSync(files, { level: 0 }));
}
