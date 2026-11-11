import type { CaptureSource, NoteJob, NoteStage, NoteStageResult } from '../contracts/notes.js';
export declare const AI_LIMITS: {
    readonly characters: 32000;
    readonly chunks: 32;
    readonly resultBytes: 128000;
    readonly summaryBytes: 800;
    readonly attempts: 8;
};
export declare const attemptId: (jobId: string, index: number, attempt: number) => string;
/** Whole messages first, then whole Markdown blocks. An oversized indivisible
 * block fails visibly rather than silently clipping code or early messages. */
export declare function planStages(source: CaptureSource, jobId: string): NoteStage[];
export declare function stageResult(input: unknown, stage: NoteStage, concise?: boolean): NoteStageResult;
export declare function stagePrompt(job: NoteJob, stage: NoteStage): string;
