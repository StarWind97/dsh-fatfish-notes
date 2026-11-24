import type { Language } from '../domain/localization.js';
import type { PersonalBinding, PersonalPreview } from '../contracts/personal.js';
import { type NotebookLocation } from './folder.js';
export interface Config {
    folder?: string;
    locations?: NotebookLocation[];
    version: 1;
    notesConsent: boolean;
    notesAcknowledged: string | null;
    enabled: boolean;
    binding: PersonalBinding | null;
    lastSuccessAt: string | null;
    lastFailure?: {
        at: string;
        code: string;
    };
    initializing: boolean;
    handbookLanguage?: Language;
    paused: {
        code: string;
        message: string;
    } | null;
    preview: (PersonalPreview & {
        creationAttempted: boolean;
        folderPrepared?: boolean;
    }) | null;
}
export declare const MANIFEST = "notebook.json";
export declare const SCOPE: string[];
export declare const PAUSE: Set<string>;
export declare function fail(code: string, message: string, status?: number): never;
export declare function record(input: unknown, allowed: readonly string[]): Record<string, unknown>;
export declare function account(input: unknown): input is PersonalBinding['account'];
export declare function binding(input: unknown): input is PersonalBinding;
export declare function locationOf(bound: PersonalBinding, folder: string): NotebookLocation;
export declare function remember(locations: NotebookLocation[] | undefined, current: NotebookLocation): NotebookLocation[];
export declare function validateConfig(input: unknown, home: string): Config;
