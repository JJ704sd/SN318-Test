import Fastify, { type FastifyInstance } from 'fastify'
import { registerLmdProxyRoutes } from './lmd-proxy.js'
import { registerPcsProxyRoutes } from './pcs-proxy.js'

export interface LocalDevOptions {
  environment: string
  nodeEnvironment?: string
  host: string
  lmdServiceBaseUrl: string
  pcsServiceBaseUrl: string
  fetcher?: typeof globalThis.fetch
}

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1', '[::1]']

export function createLocalDevApp(options: LocalDevOptions): FastifyInstance {
  if (options.environment !== 'dev' || options.nodeEnvironment === 'production') {
    throw new Error('Local BFF requires APP_ENV=dev and a non-production NODE_ENV')
  }
  if (!LOOPBACK_HOSTS.includes(options.host)) {
    throw new Error('Local BFF must bind to a loopback address')
  }
  for (const value of [options.lmdServiceBaseUrl, options.pcsServiceBaseUrl]) {
    const url = new URL(value)
    if (
      url.protocol !== 'http:' ||
      !LOOPBACK_HOSTS.includes(url.hostname) ||
      url.username ||
      url.password
    ) {
      throw new Error('Local BFF upstreams must use HTTP loopback addresses without credentials')
    }
  }

  const app = Fastify({ logger: false, bodyLimit: 1 * 1024 * 1024 })
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin
    if (origin === undefined) return
    try {
      const url = new URL(origin)
      if (url.protocol === 'http:' && LOOPBACK_HOSTS.includes(url.hostname)) return
    } catch {
      // 非法 Origin 按非本地请求拒绝。
    }
    await reply
      .code(403)
      .send({ code: 'local_origin_required', message: '仅允许本地开发请求', data: null })
  })
  app.get('/healthz', async () => ({ status: 'ok', mode: 'local-dev' }))
  const transport = options.fetcher === undefined ? {} : { fetcher: options.fetcher }
  registerLmdProxyRoutes(app, { upstreamBaseUrl: options.lmdServiceBaseUrl, ...transport })
  registerPcsProxyRoutes(app, { upstreamBaseUrl: options.pcsServiceBaseUrl, ...transport })
  return app
}
