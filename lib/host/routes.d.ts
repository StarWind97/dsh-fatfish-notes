import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NotebookApplication } from './application.js';
export declare const routePaths: readonly ["/notes/usage", "/notes/capture-progress", "/notes/conversation-file", "/notes/reference", "/notes/import-task", "/notes/transfer", "/notes/import-worker", "/notes/session-context", "/notes/associate", "/notes/workspace-book", "/notes/manage", "/notes/catalog", "/notes/history", "/notes/revision", "/notes/backlinks", "/workspace/register", "/workspace/state", "/workspace/action", "/workspace/open", "/notes/library-export", "/notes/attachment", "/notes/download", "/notes/batch", "/notes", "/notes/save", "/notes/image", "/notes/trash", "/notes/restore", "/notes/resolve", "/notes/notebooks", "/notes/notebook", "/notes/jobs", "/notes/job", "/notes/job/retry", "/notes/job/cancel", "/notes/candidate", "/notes/capture", "/notes/selection", "/notes/get", "/notes/source", "/personal", "/personal/folder/pick", "/personal/sync/preview", "/personal/sync/connect", "/personal/sync", "/personal/sync/start", "/personal/sync/tools", "/personal/sync/login", "/personal/sync/move", "/personal/sync/reset-preview", "/personal/sync/reset", "/notes/asset", "/notes/export-font", "/notes/export", "/notes/conversation-export"];
export declare function fence(req: IncomingMessage, origin: string): void;
export declare function createHttpHandler({ app, getOrigin }: {
    app: NotebookApplication;
    getOrigin: () => string;
}): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
