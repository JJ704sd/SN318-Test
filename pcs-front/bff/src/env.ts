/** BFF 运行配置。BFF 无状态，全部配置来自环境变量（不落盘、不连库）。 */
export interface BffConfig {
  /** 监听端口 */
  port: number
  /** 监听地址 */
  host: string
  /** pcs-service 上游地址（产品、价格、计费路由） */
  pcsServiceBaseUrl: string
  /** lmd-service 上游地址（物流主数据路由） */
  lmdServiceBaseUrl: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  return {
    port: Number(env.BFF_PORT ?? 8180),
    host: env.BFF_HOST ?? '0.0.0.0',
    pcsServiceBaseUrl: env.PCS_SERVICE_BASE_URL ?? 'http://127.0.0.1:8181',
    lmdServiceBaseUrl: env.LMD_SERVICE_BASE_URL ?? 'http://127.0.0.1:8182',
  }
}
