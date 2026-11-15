import { NoteRepository } from './repository.js';
import type { NoteObjects } from './types.js';
export interface InitialNotes {
    objects: NoteObjects;
    files: Map<string, Buffer>;
}
export type InitialNotesProvider = (local: NoteObjects, remote: NoteObjects) => Promise<InitialNotes | undefined>;
/** Stable identities are independent of titles, installation date and device. */
export declare function handbookId(generation: number, key: string): string;
export declare function pristineNotes(objects: NoteObjects): boolean;
export declare function handbookBundle(generation?: number, title?: string): Promise<InitialNotes>;
export declare const initialHandbook: InitialNotesProvider;
export declare function existingHandbook(objects: NoteObjects): string | null;
/** Only invoked by an explicit help action; no scan is added to ordinary reading. */
export declare function openHandbook(repository: NoteRepository, add: boolean, signal?: AbortSignal): Promise<{
    noteId: string | null;
    created: boolean;
}>;
