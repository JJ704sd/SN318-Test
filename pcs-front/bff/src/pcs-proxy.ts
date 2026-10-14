import type { FastifyInstance, FastifyRequest } from 'fastify'
import { registerUpstreamProxyRoute } from './upstream-proxy.js'

export interface PcsProxyOptions {
  upstreamBaseUrl: string
  timeoutMs?: number
  authorizationResolver?: (request: FastifyRequest) => Promise<string | undefined>
  fetcher?: typeof globalThis.fetch
}

export function registerPcsProxyRoutes(app: FastifyInstance, options: PcsProxyOptions): void {
  registerUpstreamProxyRoute(app, {
    routePrefix: '/pcs/api/pcs/v1',
    upstreamBaseUrl: options.upstreamBaseUrl,
    upstreamPathPrefix: '/api/v1',
    unavailableCode: 'pcs_upstream_unavailable',
    unavailableMessage: 'PCS 服务暂时不可用，请稍后重试',
    timeoutMs: options.timeoutMs ?? 8000,
    ...(options.authorizationResolver === undefined
      ? {}
      : { authorizationResolver: options.authorizationResolver }),
    ...(options.fetcher === undefined ? {} : { fetcher: options.fetcher }),
  })
}
