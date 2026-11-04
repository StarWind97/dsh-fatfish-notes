import { homedir } from 'node:os';
import { join } from 'node:path';
/** Package identity is independent of the existing user-data identity, including for new installs. */
export function dataDirectory(home = process.env.DSH_HOME || join(homedir(), '.dsh')) {
    return join(home, 'github-notebook');
}
