/** Messages are authored for public display; external exceptions belong in private diagnostics. */
export declare class NotebookError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status?: number);
}
