import type { NotebookApplication } from './application.js';
export declare function findNotesBrowser(): Promise<string | null>;
/** This listener belongs to the existing DSH application and dies with it. */
export declare function enableStandalone(app: NotebookApplication, dir: string): Promise<void>;
