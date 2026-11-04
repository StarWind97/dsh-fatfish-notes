import { createApplication } from './host/application.js';
import { createHttpHandler, routePaths } from './host/routes.js';
import { registerNoteTools } from './host/note-tools.js';
import { dataDirectory } from './storage/paths.js';
import { ownApplication, PLUGIN_NAME } from './host/plugin-identity.js';
export const name = PLUGIN_NAME;
export const inject = ['tools'];
export async function apply(ctx) {
    const dir = dataDirectory();
    const app = await ownApplication(ctx, dir, () => createApplication({ dir, conversation: () => ctx.get('sessionController') }));
    ctx.effect(() => registerNoteTools(ctx.tools, app.notes), 'notes tools');
    ctx.inject(['webServer'], injected => {
        const handler = createHttpHandler({ app, getOrigin: () => injected.webServer.getOrigin() });
        const offs = routePaths.map(path => injected.webServer.register({ kind: 'exact', path: `/${name}${path}`, handler }));
        return () => { for (const off of offs)
            off(); };
    });
}
