import type { NoteView } from '../contracts/notes.js';
/** Derived only from validated revisions; rebuilding never writes user data. */
export declare class BacklinkIndex {
    private outgoing;
    private incoming;
    update(views: NoteView[]): void;
    get(noteId: string): NoteView[];
}
