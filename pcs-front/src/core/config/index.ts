/**
 * Config 领域入口：@core/config
 *
 * 运行时配置加载（env.js/config.js）与实时读取 env getter。依赖方向最低，可被一切领域依赖。
 */
export { loadConfig, getConfig, isLoaded } from './runtime'
export type { RuntimeConfig, EnvName } from './runtime'
export { env, assertEnv } from './env'
export type { AiProvider } from './env'
