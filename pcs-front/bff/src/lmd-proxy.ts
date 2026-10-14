import type { FastifyInstance, FastifyRequest } from 'fastify'
import { registerUpstreamProxyRoute } from './upstream-proxy.js'

export interface LmdProxyOptions {
  upstreamBaseUrl: string
  timeoutMs?: number
  authorizationResolver?: (request: FastifyRequest) => Promise<string | undefined>
  fetcher?: typeof globalThis.fetch
}

/**
 * 注册 LMD 业务代理。
 *
 * 浏览器只访问 pcs-front BFF；BFF 保留请求方法、查询参数和 JSON body，
 * 只转发认证和链路所需的请求头，避免把浏览器 Cookie 直接送到 LMD。
 */
export function registerLmdProxyRoutes(
  app: FastifyInstance,
  options: LmdProxyOptions,
): void {
  registerUpstreamProxyRoute(app, {
    routePrefix: '/pcs/api/lmd/v1',
    upstreamBaseUrl: options.upstreamBaseUrl,
    upstreamPathPrefix: '/api/v1',
    unavailableCode: 'lmd_upstream_unavailable',
    unavailableMessage: 'LMD 服务暂时不可用，请稍后重试',
    timeoutMs: options.timeoutMs ?? 8000,
    ...(options.authorizationResolver === undefined
      ? {}
      : { authorizationResolver: options.authorizationResolver }),
    ...(options.fetcher === undefined ? {} : { fetcher: options.fetcher }),
  })
}
