import type { Context } from '@deepseek-ai/cordis';
import type { NotebookApplication } from './application.js';
export interface HostRouteServices {
    webServer: Pick<Context['webServer'], 'getOrigin' | 'register'>;
    connection: Pick<Context['connection'], 'requestRejection'>;
}
/** Raw WebServer routes need the host's trust and authentication check explicitly. */
export declare function registerHostRoutes(services: HostRouteServices, app: NotebookApplication): () => void;
