import type { CaptureSource, NoteRevision, NoteView } from '../../contracts/notes.js';
/** Ephemeral projection of a verified revision. It is never saved as a revision. */
export interface ReadingSnapshot {
    kind: 'reading';
    filename: string;
    note: NoteView;
    source: CaptureSource | null;
    assets: Record<string, string>;
}
export declare function readingProjection(note: NoteRevision, source: CaptureSource | null, assets: string[], files: string[], tags?: boolean, summary?: boolean): Omit<ReadingSnapshot, 'filename' | 'assets'>;
/** Card-only images and attachment originals are not decoded or read for a screenshot. */
export declare function readingImageIds(value: Pick<ReadingSnapshot, 'note' | 'source'>): string[];
