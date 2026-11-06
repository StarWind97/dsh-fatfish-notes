import { homedir } from 'node:os'
import { join } from 'node:path'

/** Plugin control data; the selected library can live in a different directory. */
export function dataDirectory(home=process.env.DSH_HOME||join(homedir(),'.dsh')):string {
  return join(home,'fatfish-notes')
}
