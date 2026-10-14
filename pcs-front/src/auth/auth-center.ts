import { createAuthClient, type AuthClient } from '@baiyun/auth-center-browser'
import { env } from '@core/config'

let authCenterClient: AuthClient | null = null

function normalizePath(value: string): string {
  const trimmed = value.trim().replace(/^\/+|\/+$/gu, '')
  return trimmed ? `/${trimmed}` : ''
}

function createBasePath(prefix: string): string {
  return `${prefix}/auth`
}

/**
 * 创建与当前运行环境匹配的权限中台浏览器客户端。
 * 相对 bffHost 走同源代理，绝对 bffHost 拆分 origin 与路径，避免把路径传给 bffOrigin。
 */
export function getAuthCenterClient(): AuthClient {
  if (authCenterClient) return authCenterClient

  const configuredHost = env.bffHost.trim()
  if (/^https?:\/\//u.test(configuredHost)) {
    const bffUrl = new URL(configuredHost)
    authCenterClient = createAuthClient({
      bffOrigin: bffUrl.origin,
      basePath: createBasePath(normalizePath(bffUrl.pathname)),
    })
    return authCenterClient
  }

  authCenterClient = createAuthClient({
    basePath: createBasePath(normalizePath(configuredHost)),
  })
  return authCenterClient
}
