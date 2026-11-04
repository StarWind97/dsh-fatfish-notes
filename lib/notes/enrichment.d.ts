import type { CaptureRequest, CaptureResult, NoteJob, NoteStage } from '../contracts/notes.js';
import { NoteRepository } from './repository.js';
export interface NoteModel {
    dispatch(job: NoteJob, stage: NoteStage, prompt: string, signal: AbortSignal): Promise<void>;
    inspect(sessionId: string, requestIds: string[], signal: AbortSignal): Promise<{
        active: string[];
        ended: string[];
    }>;
}
/** Journal is local scheduling state, deliberately outside the revision sync
 * module. Every transition, including prompt admission identity, precedes I/O. */
export declare class NoteEnrichment {
    readonly repository: NoteRepository;
    private readonly model;
    private tail;
    private readonly dispatches;
    private readonly cancelIntents;
    constructor(repository: NoteRepository, model: NoteModel);
    private run;
    private checkCancelled;
    private write;
    private read;
    list(): Promise<string[]>;
    ensure(request: CaptureRequest, captured: CaptureResult, signal: AbortSignal): Promise<NoteJob | null>;
    get(jobId: string): Promise<NoteJob>;
    drive(jobId: string, signal: AbortSignal): Promise<NoteJob>;
    submit(input: unknown, sessionId: string | undefined, signal: AbortSignal): Promise<{
        jobId: string;
        status: NoteJob['status'];
    }>;
    private finish;
    private prepareAdoption;
    private apply;
    adopt(jobId: string, expected: unknown, signal: AbortSignal): Promise<NoteJob>;
    cancel(jobId: string): Promise<NoteJob>;
    retry(jobId: string, signal: AbortSignal): Promise<NoteJob>;
}
