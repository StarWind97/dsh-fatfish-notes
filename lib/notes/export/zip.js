import { zipSync, Zip, ZipPassThrough } from 'fflate';
import { setImmediate as yieldIO } from 'node:timers/promises';
/** Keep only one input file and one output chunk; response writes provide backpressure. */
export async function* zipEntries(entries, signal) {
    let queue = [], failure = null;
    const zip = new Zip((error, data) => { if (error)
        failure = error;
    else
        queue.push(data); });
    try {
        for (const entry of entries) {
            signal?.throwIfAborted();
            const data = await entry.read(), file = new ZipPassThrough(entry.path);
            zip.add(file);
            for (let p = 0; p < data.length; p += 256 * 1024) {
                signal?.throwIfAborted();
                file.push(data.subarray(p, p + 256 * 1024), false);
                if (failure)
                    throw failure;
                for (const output of queue)
                    yield output;
                queue = [];
                await yieldIO();
            }
            file.push(new Uint8Array(), true);
            if (failure)
                throw failure;
            for (const output of queue)
                yield output;
            queue = [];
        }
        zip.end();
        if (failure)
            throw failure;
        for (const output of queue)
            yield output;
    }
    finally {
        zip.terminate();
    }
}
export async function zippedFile(filename, entries, signal, streaming = false) {
    const stream = () => zipEntries(entries, signal);
    if (streaming)
        return { bytes: Buffer.alloc(0), filename: filename + '.zip', mediaType: 'application/zip', stream };
    const chunks = [];
    for await (const chunk of stream())
        chunks.push(Buffer.from(chunk));
    return { bytes: Buffer.concat(chunks), filename: filename + '.zip', mediaType: 'application/zip' };
}
export function exportZip(filename, markdown, images, attachments = {}) {
    const files = { [filename + '.md']: Buffer.from(markdown) };
    for (const [assetId, bytes] of Object.entries(images))
        files[`assets/${assetId}`] = bytes;
    for (const [name, bytes] of Object.entries(attachments))
        files['attachments/' + name] = bytes;
    return Buffer.from(zipSync(files, { level: 0 }));
}
