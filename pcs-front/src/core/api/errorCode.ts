/**
 * 错误码体系与四类错误分流（实施方案任务 5.1A / 2.13B；规范 §07 异常场景）
 *
 * 当前后端错误码规范未定，先按 HTTP 状态码起步 + 预留业务码段。
 * 分流四类：业务校验 / 系统 / 网络 / 权限（超时归入网络，规范约定）。
 * 文案集中在本文件（项目已移除 copy.ts，改由各领域常量各自持有），
 * 系统/技术错误只展示友好文案，原始错误码折叠进 Toast「详情」、不暴露堆栈。
 */

/** 四类错误分流（超时并入网络类）。 */
export type ApiErrorKind = 'business' | 'system' | 'network' | 'permission'

/** 归一化错误对象：HTTP 层与业务层的错误都收敛到此结构后再分流。 */
export interface NormalizedApiError {
  /** 分流类别，决定 Toast 文案与后续处理动作。 */
  kind: ApiErrorKind
  /** HTTP 状态码（网络错误/无响应时为 0）。 */
  httpStatus: number
  /** 业务错误码（后端 {code}，无则为 undefined）。 */
  bizCode?: number | string
  /** 面向用户的友好文案。 */
  message: string
  /** 原始错误对象，仅用于折叠进「详情」/日志，不直接展示。 */
  raw?: unknown
}

/** 面向用户的错误文案（主动句、专业简洁；规范 §08 文案）。 */
export const ERROR_TEXT = {
  /** 系统错误（HTTP 5xx）。 */
  system: '系统繁忙，请稍后重试',
  /** 网络错误（断网 / DNS 失败 / 超时）。 */
  network: '网络异常，请检查网络后重试',
  /** 权限错误（401 / 403）。 */
  permission: '暂无操作权限',
  /** 业务校验缺省兜底（后端未回具体 msg 时）。 */
  business: '操作失败，请稍后重试',
  /** 请求被取消（AbortError），静默不弹 Toast，仅用于日志。 */
  aborted: '请求已取消',
} as const

/** 单个 HTTP 状态码的处理映射：分流类别 + 缺省文案。 */
interface HttpCodeMeta {
  kind: ApiErrorKind
  /** 缺省文案；业务类会优先取后端 msg 原文，此处仅兜底。 */
  text: string
}

/**
 * HTTP 状态码映射表（先按状态码起步）。
 * 200 为业务正常，不入错误表；未命中的状态码按段落回落（见 resolveHttpMeta）。
 */
export const HTTP_CODE_MAP: Record<number, HttpCodeMeta> = {
  400: { kind: 'business', text: ERROR_TEXT.business },
  401: { kind: 'permission', text: ERROR_TEXT.permission },
  403: { kind: 'permission', text: ERROR_TEXT.permission },
  404: { kind: 'system', text: '请求的资源不存在' },
  500: { kind: 'system', text: ERROR_TEXT.system },
}

/**
 * 业务错误码段映射（预留）。
 * 待后端错误码规范出台后在此填充（如 1xxxx 段），改这一处即可、不散落各拦截器。
 * 示例：{ 10001: { kind: 'business', text: '账号或密码错误' } }
 */
export const BIZ_CODE_MAP: Record<number | string, HttpCodeMeta> = {
  // 待后端错误码规范出后填充
}

/** 按 HTTP 状态码解析处理映射；未精确命中时按 4xx=业务、5xx=系统回落。 */
export function resolveHttpMeta(status: number): HttpCodeMeta {
  const hit = HTTP_CODE_MAP[status]
  if (hit) return hit
  if (status >= 500) return { kind: 'system', text: ERROR_TEXT.system }
  if (status >= 400) return { kind: 'business', text: ERROR_TEXT.business }
  return { kind: 'system', text: ERROR_TEXT.system }
}
