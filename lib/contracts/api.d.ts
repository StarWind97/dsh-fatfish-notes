import type { PersonalApiContract } from './personal.js';
import type { NotesApiContract } from './notes.js';
export interface ErrorResponse {
    ok: false;
    status: 'error';
    error: string;
    code: string;
    previousFolder?: string;
}
export interface ApiContract extends PersonalApiContract, NotesApiContract {
}
export type ApiPath = keyof ApiContract;
export type ApiSuccess = ApiContract[ApiPath]['response'];
export type ApiResponse = ApiSuccess | ErrorResponse;
