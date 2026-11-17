import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { ServerResponse } from 'node:http'
import type { ErrorResponse } from '../contracts/api.js'
import type { NotebookApplication } from './application.js'
import { PLUGIN_NAME } from './plugin-identity.js'
import { createHttpHandler, routePaths } from './routes.js'

export interface HostRouteServices {
  webServer: Pick<Context['webServer'], 'getOrigin' | 'register'>
  connection: Pick<Context['connection'], 'requestRejection'>
}

function reject(res: ServerResponse, status: 401 | 403 | 503): void {
  const value: ErrorResponse = { ok: false, status: 'error',
    code: status === 401 ? 'host_unauthorized' : status === 403 ? 'host_forbidden' : 'host_access_unavailable',
    error: status === 401 ? 'DSH 登录已失效，请重新连接宿主' : status === 403 ? 'DSH 拒绝此来源的请求' : '暂时无法验证 DSH 访问权限，请稍后重试' }
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}

/** Raw WebServer routes need the host's trust and authentication check explicitly. */
export function registerHostRoutes(services: HostRouteServices, app: NotebookApplication): () => void {
  const delegate = createHttpHandler({ app, getOrigin: () => services.webServer.getOrigin() })
  const handler: ReturnType<typeof createHttpHandler> = async (req, res) => {
    let status: 401 | 403 | undefined
    try { status = services.connection.requestRejection(req) }
    catch { reject(res, 503); return }
    if (status !== undefined) { reject(res, status); return }
    // Keep the plugin's stricter loopback, origin, body and editing checks too.
    await delegate(req, res)
  }
  const off: (() => void)[] = []
  try {
    for (const path of routePaths) off.push(services.webServer.register({ kind: 'exact', path: `/${PLUGIN_NAME}${path}`, handler }))
  } catch (error) { for (const dispose of off) dispose(); throw error }
  return () => { for (const dispose of off) dispose() }
}
