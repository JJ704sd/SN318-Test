/** BFF 运行配置。凭据只从服务端环境变量读取。 */
export interface BffConfig {
  /** 监听端口 */
  port: number
  /** 监听地址 */
  host: string
  /** pcs-service 上游地址（产品、价格、计费路由） */
  pcsServiceBaseUrl: string
  /** lmd-service 上游地址（物流主数据路由） */
  lmdServiceBaseUrl: string
  authIssuer: string
  authBffPublicOrigin: string
  authBffPrefix: string
  authBrowserClientId: string
  authBrowserClientSecret: string
  /** Browser login token audience forwarded to authenticated domain services. */
  authBrowserAudience: string
  authMachineClientId: string
  authMachineClientSecret: string
  authSystemCode: string
  authEnvironment: string
  authPermissionVersion: string
  authRedisUrl: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  return {
    port: Number(env.BFF_PORT ?? 8180),
    host: env.BFF_HOST ?? '0.0.0.0',
    pcsServiceBaseUrl: env.PCS_SERVICE_BASE_URL ?? 'http://127.0.0.1:8080',
    lmdServiceBaseUrl: env.LMD_SERVICE_BASE_URL ?? 'http://127.0.0.1:8082',
    authIssuer: env.AUTH_CENTER_ISSUER ?? 'http://localhost:7070',
    authBffPublicOrigin: required(env.AUTH_BFF_PUBLIC_ORIGIN, 'AUTH_BFF_PUBLIC_ORIGIN'),
    authBffPrefix: env.AUTH_BFF_PREFIX ?? '/pcs/auth',
    authBrowserClientId: env.AUTH_BROWSER_CLIENT_ID ?? 'frontend-demo-bff',
    authBrowserClientSecret: required(env.AUTH_BROWSER_CLIENT_SECRET, 'AUTH_BROWSER_CLIENT_SECRET'),
    authBrowserAudience: env.AUTH_BROWSER_AUDIENCE ?? env.AUTH_BROWSER_CLIENT_ID ?? 'frontend-demo-bff',
    authMachineClientId: env.AUTH_MACHINE_CLIENT_ID ?? 'frontend-demo-machine',
    authMachineClientSecret: required(env.AUTH_MACHINE_CLIENT_SECRET, 'AUTH_MACHINE_CLIENT_SECRET'),
    authSystemCode: env.AUTH_SYSTEM_CODE ?? 'pcs.front',
    authEnvironment: env.AUTH_ENVIRONMENT ?? 'test',
    authPermissionVersion: env.AUTH_PERMISSION_VERSION ?? 'test',
    authRedisUrl: required(env.AUTH_REDIS_URL, 'AUTH_REDIS_URL'),
  }
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is required`)
  return value.trim()
}
