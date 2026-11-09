/** Messages are authored for public display; external exceptions belong in private diagnostics. */
export class NotebookError extends Error {
    code;
    status;
    affectedCount;
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = 'NotebookError';
    }
}
