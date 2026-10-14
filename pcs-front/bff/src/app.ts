import Fastify, {
  type FastifyInstance,
  type FastifyPluginAsync,
  type FastifyRequest,
} from 'fastify'
import { Redis } from 'ioredis'
import {
  createBffService,
  createFrontendProfileClient,
  createOidcClient,
  createResourceServer,
} from '@baiyun/auth-center-node'
import { createFastifyAuthPlugin } from '@baiyun/auth-center-node/fastify'
import { createRedisSessionStore } from '@baiyun/auth-center-node/redis'

import type { BffConfig } from './env.js'
import { registerLmdProxyRoutes } from './lmd-proxy.js'
import { registerPcsProxyRoutes } from './pcs-proxy.js'

/**
 * 创建 Fastify BFF 实例。
 *
 * 边界（SN318 技术方案 4.5）：BFF 做认证上下文承接、请求参数整形、
 * 上游客户端封装、只读聚合、超时预算、错误码映射和前端 DTO 转换；
 * 不实现领域规则、不直连 PCS/LMD 数据库。Redis 仅用于认证 Session。
 */
export function createApp(config: BffConfig): FastifyInstance {
  const app = Fastify({
    logger: true,
    bodyLimit: 1 * 1024 * 1024,
    trustProxy: true,
  })

  const redis = new Redis(config.authRedisUrl)
  const credentials = {
    async get() {
      return {
        kind: 'client-secret' as const,
        clientId: config.authMachineClientId,
        clientSecret: config.authMachineClientSecret,
      }
    },
  }
  const oauth = createOidcClient({
    issuer: config.authIssuer,
    clientId: config.authBrowserClientId,
    clientSecret: config.authBrowserClientSecret,
    redirectUri: `${config.authBffPublicOrigin}${config.authBffPrefix}/callback`,
    audience: config.authBrowserAudience,
  })
  const frontendProfileClient = createFrontendProfileClient({
    issuer: config.authIssuer,
    credentials,
    systemCode: config.authSystemCode,
    environment: config.authEnvironment,
    version: config.authPermissionVersion,
    machineAudience: 'auth-center',
    machineScopes: ['permissions:profile'],
  })
  const bff = createBffService({
    oauth,
    store: createRedisSessionStore(redis, { prefix: 'pcs-front:auth:' }),
    bffPublicOrigin: config.authBffPublicOrigin,
    allowInsecureCookiesForLocalhostTest: isLocalhostHttpOrigin(config.authBffPublicOrigin),
    frontendProfileClient,
    systemCode: config.authSystemCode,
  })
  const resourceServer = createResourceServer({
    issuer: config.authIssuer,
    credentials,
    audience: config.authBrowserAudience,
  })
  app.addHook('onClose', async () => {
    await redis.quit()
  })
  const authPlugin = createFastifyAuthPlugin({
    resourceServer,
    bff,
    bffPublicOrigin: config.authBffPublicOrigin,
    allowInsecureCookiesForLocalhostTest: isLocalhostHttpOrigin(config.authBffPublicOrigin),
    bffPrefix: config.authBffPrefix,
  })
  // 认证插件与业务路由必须注册在同一 Fastify encapsulation 中，否则插件的
  // preHandler 不会覆盖后续注册的代理路由。
  app.register(async (instance) => {
    // 本地 file 依赖解析到另一仓库的 Fastify 类型副本，运行时两者使用同一 v5 接口。
    await (authPlugin as unknown as FastifyPluginAsync)(instance, {})

    // readiness 只检查 BFF 自身，不探测上游。
    instance.get('/healthz', { config: { auth: 'public' } }, async () => ({ status: 'ok' }))

    const resolveSessionAuthorization = (request: FastifyRequest) =>
      resolveBffSessionAccessToken(request, bff)
    registerLmdProxyRoutes(instance, {
      upstreamBaseUrl: config.lmdServiceBaseUrl,
      authorizationResolver: resolveSessionAuthorization,
    })
    registerPcsProxyRoutes(instance, {
      upstreamBaseUrl: config.pcsServiceBaseUrl,
      authorizationResolver: resolveSessionAuthorization,
    })
  })

  return app
}

async function resolveBffSessionAccessToken(
  request: FastifyRequest,
  bff: ReturnType<typeof createBffService>,
): Promise<string | undefined> {
  if (request.headers.authorization !== undefined) return undefined
  const cookieName = bff.sessionCookieName?.() ?? 'byauth_session'
  const sessionId = request.headers.cookie
    ?.split(';')
    .map((value) => value.trim().split('=', 2))
    .find(([key]) => key === cookieName)?.[1]
  if (sessionId === undefined || sessionId === '') return undefined
  return bff.getSessionAccessToken(sessionId)
}

function isLocalhostHttpOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}
