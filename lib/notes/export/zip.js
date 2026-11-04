import { zipSync } from 'fflate';
export function exportZip(filename, markdown, images) {
    const files = { [filename + '.md']: Buffer.from(markdown) };
    for (const [assetId, bytes] of Object.entries(images))
        files[`assets/${assetId}`] = bytes;
    return Buffer.from(zipSync(files, { level: 6 }));
}
