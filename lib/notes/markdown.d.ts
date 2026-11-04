import type { NoteRevision } from './types.js';
export declare const NOTE_METADATA_BYTES: number;
/** Restricted YAML-compatible JSON scalars/arrays. The delimiter's newline is not part of body. */
export declare function serializeNoteMarkdown(revision: NoteRevision): string;
export declare function parseNoteMarkdown(markdown: string): {
    revision: NoteRevision;
    declaredRevision: string;
    changed: boolean;
};
