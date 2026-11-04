import { createNoteRevision, validateNoteRevision } from './revisions.js';
import { hash, fail, text } from './validation.js';
import { NOTE_LIMITS } from './types.js';
export const NOTE_METADATA_BYTES = 8 * 1024 * 1024;
/** Restricted YAML-compatible JSON scalars/arrays. The delimiter's newline is not part of body. */
export function serializeNoteMarkdown(revision) {
    const { body, ...metadata } = validateNoteRevision(revision);
    return `---\n${Object.entries(metadata).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n${body}`;
}
export function parseNoteMarkdown(markdown) {
    text(markdown, NOTE_LIMITS.body + NOTE_METADATA_BYTES);
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
    if (!match || !match[1] || Buffer.byteLength(match[1]) > NOTE_METADATA_BYTES)
        fail('note_frontmatter');
    const data = Object.create(null);
    for (const line of match[1].split(/\r?\n/)) {
        const pair = /^([A-Za-z]+): (.+)$/.exec(line);
        if (!pair?.[1] || pair[2] === undefined || Object.hasOwn(data, pair[1]))
            fail('note_frontmatter');
        try {
            data[pair[1]] = JSON.parse(pair[2]);
        }
        catch {
            fail('note_frontmatter');
        }
    }
    const declaredRevision = hash(data.revision);
    delete data.revision;
    const revision = createNoteRevision({ ...data, body: markdown.slice(match[0].length) });
    return { revision, declaredRevision, changed: revision.revision !== declaredRevision };
}
