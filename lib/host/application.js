import { NotesApplication } from './notes.js';
import { GitHubCli } from '../onboarding/cli.js';
import { PrivateWorkspaceSync } from '../private-workspace/sync.js';
import { NotebookError } from '../domain/errors.js';
import { EditCoordinator, windowRequest } from './edit-coordinator.js';
import { id, object, text } from '../notes/validation.js';
export class NotebookApplication {
    options;
    notes;
    backup;
    workspace;
    requireWindowIdentity = false;
    openWindow;
    closeWindowService;
    constructor(options) {
        this.options = options;
        this.notes = new NotesApplication(options.dir, options.conversation ?? (() => undefined), () => this.backup.changingLocation ? 'busy' : this.backup.ready);
        this.backup = new PrivateWorkspaceSync({ dir: options.dir, notes: this.notes.repository, drainNotes: () => this.notes.drain(), gateway: options.personal?.gateway ?? new GitHubCli(), ...options.personal });
        this.workspace = new EditCoordinator(() => this.backup.state().binding?.repositoryId ?? null, () => this.notes.repository.generation);
        this.notes.repository.editGuard = (ids, required) => this.workspace.check(ids, windowRequest.getStore(), required);
    }
    workspaceRequest(path, input) {
        return this.notes.repository.coordinate(() => {
            const v = object(input), actor = windowRequest.getStore();
            if (path === '/workspace/register')
                return this.workspace.register(text(v.windowId, 36), v.surface);
            if (!actor)
                throw new NotebookError('window_expired', '请重新打开笔记窗口', 409);
            const noteId = v.noteId === undefined ? undefined : id(v.noteId);
            if (path === '/workspace/state') {
                let theme;
                if (v.theme !== undefined) {
                    const raw = object(v.theme);
                    if (typeof raw.dark !== 'boolean' || !['zh', 'en'].includes(String(raw.language)))
                        throw new NotebookError('window_invalid', '主题无效');
                    const color = (key) => { const value = text(raw[key], 100); if (!/^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|color\(srgb [\d.\s/]+\))$/i.test(value))
                        throw new NotebookError('window_invalid', '主题颜色无效'); return value; };
                    theme = { dark: raw.dark, language: raw.language, background: color('background'), foreground: color('foreground'), muted: color('muted'), border: color('border') };
                }
                return this.workspace.state(actor, noteId, theme);
            }
            if (v.action === 'acquire')
                return this.workspace.acquire(actor, id(v.noteId));
            if (v.action === 'release')
                return this.workspace.release(actor, noteId);
            if (v.action === 'handoff')
                return this.workspace.handoff(actor, id(v.noteId));
            if (v.action === 'cancel')
                return this.workspace.cancel(actor, text(v.requestId, 36));
            if (v.action === 'ack')
                return this.workspace.acknowledge(actor, text(v.requestId, 36));
            throw new NotebookError('window_invalid', '窗口操作无效');
        });
    }
    async changeLocation(work) {
        await this.notes.repository.coordinate(() => this.workspace.beginLocationChange());
        const before = this.backup.state().binding?.repositoryId;
        try {
            return await work();
        }
        finally {
            this.workspace.endLocationChange(before !== this.backup.state().binding?.repositoryId);
        }
    }
    personalState() { return { ok: true, sync: this.backup.state() }; }
    async pickFolder(signal) {
        if (!this.options.pickFolder)
            throw new NotebookError('notebook_picker_unavailable', '当前宿主无法打开目录选择窗口', 409);
        return { ok: true, folder: await this.options.pickFolder(signal) };
    }
    async close() { await this.closeWindowService?.(); await Promise.all([this.notes.close(), this.backup.close()]); }
}
export async function createApplication(options) {
    const app = new NotebookApplication(options);
    try {
        await app.backup.load();
        return app;
    }
    catch (error) {
        await app.close();
        throw error;
    }
}
