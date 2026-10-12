import Fastify, { type FastifyInstance } from 'fastify'

import type { BffConfig } from './env.js'

/**
 * 创建 Fastify BFF 实例。
 *
 * 边界（SN318 技术方案 4.5）：BFF 只做认证上下文承接、请求参数整形、
 * 上游客户端封装、只读聚合、超时预算、错误码映射和前端 DTO 转换；
 * 不实现领域规则、不直连 PCS/LMD 数据库、不访问 Redis。
 */
export function createApp(config: BffConfig): FastifyInstance {
  const app = Fastify({
    logger: true,
    bodyLimit: 1 * 1024 * 1024,
    trustProxy: true,
  })

  // readiness 只检查 BFF 自身（无状态服务，不探测上游）
  app.get('/healthz', async () => ({ status: 'ok' }))

  // TODO(liheng, 2026-09-24): 在 PRODUCT_CENTER_API_PREFIX 下注册业务路由，
  // 主数据路由转发 config.lmdServiceBaseUrl，产品/价格/计费路由转发 config.pcsServiceBaseUrl。
  void config

  return app
}
