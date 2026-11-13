import { ATTACHMENT_LIMIT } from '../contracts/notes.js';
import { NOTE_LIMITS } from './types.js';
import { digest, fail } from './validation.js';
import { mediaTypeFor, sourceBytes, validateAsset } from './assets.js';
import { missing, utf8 } from './files.js';
/** Only immutable resource paths enter this internal installer, never documents or manifests. */
export function syncResource(resource) {
    const match = /^(assets\/([a-f0-9]{64}\.(?:png|jpg|gif|webp))|sources\/([a-f0-9]{64})\.json|attachments\/([a-f0-9]{64})\.bin)$/.exec(resource.path);
    if (!match)
        fail('note_path');
    const limit = match[2] ? NOTE_LIMITS.image : match[3] ? NOTE_LIMITS.source : ATTACHMENT_LIMIT;
    if (!Number.isSafeInteger(resource.bytes) || resource.bytes < 0 || resource.bytes > limit)
        fail('note_limit');
    const verify = (bytes) => {
        if (bytes.length !== resource.bytes)
            fail('note_hash');
        if (match[2]) {
            if (validateAsset(bytes, mediaTypeFor(match[2])).id !== match[2])
                fail('note_hash');
        }
        else if (digest(bytes) !== (match[3] ?? match[4]) || (match[3] && !sourceBytes(JSON.parse(utf8(bytes))).equals(bytes)))
            fail('note_hash');
    };
    return { ...resource, verify, async present(files) {
            // Match reference-check cache keys; always compare the expected length, including cache hits.
            const size = await files.check(resource.path, match[4] ? resource.bytes : limit, verify).catch(e => { if (missing(e))
                return null; throw e; });
            if (size === null)
                return false;
            if (size !== resource.bytes)
                fail('note_hash');
            return true;
        } };
}
export function* resourceBatches(resources) {
    let batch = [], bytes = 0;
    for (const resource of resources) {
        if (batch.length && (batch.length === 4 || bytes + resource.bytes > 8 * 1024 * 1024)) {
            yield batch;
            batch = [];
            bytes = 0;
        }
        batch.push(resource);
        bytes += resource.bytes;
    }
    if (batch.length)
        yield batch;
}
export async function missingSyncResources(batch, files) {
    // Independent reads share the bounded batch. Drain them all before releasing the queue on error.
    const checked = await Promise.allSettled(batch.map(resource => resource.present(files))), missingResources = [];
    for (const [i, result] of checked.entries()) {
        if (result.status === 'rejected')
            throw result.reason;
        if (!result.value)
            missingResources.push(batch[i]);
    }
    return missingResources;
}
