import { NoteRepository } from './repository.js';
import type { NoteObjects } from './types.js';
import type { Language } from '../domain/localization.js';
export interface InitialNotes {
    objects: NoteObjects;
    files: Map<string, Buffer>;
}
export type InitialNotesProvider = (local: NoteObjects, remote: NoteObjects, language?: Language) => Promise<InitialNotes | undefined>;
/** Stable identities are independent of titles, installation date and device. */
export declare function handbookId(generation: number, key: string, version?: number, language?: Language): string;
export declare function pristineNotes(objects: NoteObjects): boolean;
export declare function handbookBundle(generation?: number, title?: string, language?: Language): Promise<InitialNotes>;
export declare const initialHandbook: InitialNotesProvider;
export declare function existingHandbook(objects: NoteObjects, language?: Language): string | null;
/** Only invoked by an explicit help action; no scan is added to ordinary reading. */
export declare function openHandbook(repository: NoteRepository, add: boolean, signal?: AbortSignal, language?: Language): Promise<{
    noteId: string | null;
    created: boolean;
}>;
