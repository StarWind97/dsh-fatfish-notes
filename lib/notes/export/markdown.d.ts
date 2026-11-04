import type { NoteRevision } from '../../contracts/notes.js';
export declare function exportFilename(title: string): string;
export declare function sourceMarkdown(source: Record<string, unknown>): {
    body: string;
    assets: string[];
};
/** Keep raw reference-label spelling: identifier matching does not decode entity/escape spellings. */
export declare function definitionLabel(raw: string): string;
export declare function rewriteMarkdown(body: string, closeAtEnd?: boolean): string;
/** Public metadata only. Note and opt-in source are separate parse units. */
export declare function exportMarkdown(header: Pick<NoteRevision, 'title' | 'tags' | 'summary'> & {
    modified: string;
}, body: string, appendix?: string): string;
