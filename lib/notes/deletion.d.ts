import type { NoteObjects } from './types.js';
export declare function deletionIds(value: unknown): string[];
export declare function deletionData(noteId: string): string;
export declare function readDeletion(value: unknown): string;
export declare function withoutDeleted(objects: NoteObjects, deleted?: string[]): NoteObjects;
export declare function moduleVersion(objects: NoteObjects): 1 | 2;
