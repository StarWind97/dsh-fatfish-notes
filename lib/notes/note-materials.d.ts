import type { NoteContent, NoteSupplements } from '../contracts/notes.js';
type Materials = Pick<NoteContent, 'body' | 'assetIds' | 'attachments' | 'supplements'>;
/** Legacy revisions are read without rewriting their Markdown or hashes. */
export declare function supplementMaterials(note: Materials): NoteSupplements;
/** Persist this when editing: a later deletion from the body must not resurrect a supplement. */
export declare function remainingSupplements(note: Materials): NoteSupplements;
export declare function currentMaterials(note: Materials): NoteSupplements;
export declare function withoutSupplement(note: Materials, id: string): NoteSupplements;
export {};
