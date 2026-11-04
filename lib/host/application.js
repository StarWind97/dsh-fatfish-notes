import { NotesApplication } from './notes.js';
import { GitHubCli } from '../onboarding/cli.js';
import { PrivateWorkspaceSync } from '../private-workspace/sync.js';
export class NotebookApplication {
    options;
    notes;
    backup;
    constructor(options) {
        this.options = options;
        this.notes = new NotesApplication(options.dir, options.conversation ?? (() => undefined), () => this.backup.changingLocation ? 'busy' : this.backup.ready);
        this.backup = new PrivateWorkspaceSync({ dir: options.dir, notes: this.notes.repository, drainNotes: () => this.notes.drain(), gateway: options.personal?.gateway ?? new GitHubCli(), ...options.personal });
    }
    personalState() { return { ok: true, sync: this.backup.state() }; }
    async close() { await Promise.all([this.notes.close(), this.backup.close()]); }
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
