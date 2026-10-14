/**
 * Typed 请求帮助函数矩阵（实施方案任务 5.1A；规范 §07 / §09）
 *
 * 页面 / API 层只 import 这些函数、不直接碰 axios。
 * 返回值即响应拦截解包后的 data（{code,data,msg} 已剥离），泛型 T 即业务数据类型。
 * 全部支持第三参 config（含 meta.{skipAuth,retry,silent,apiModule,baseURL}、signal 取消、headers）。
 */

import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios'
import { getHttp, http } from './http'
import { runOnError } from './handlers'
import { ERROR_TEXT, type NormalizedApiError } from './errorCode'

/** 帮助函数统一配置类型（第三参）。 */
export type RequestConfig = AxiosRequestConfig

/** 按 config.meta.apiModule 选后端实例（缺省 main），使多地址路由对帮助函数可达。 */
function client(config?: RequestConfig) {
  return getHttp(config?.meta?.apiModule)
}

/** 上传选项：透传上传进度回调。 */
export interface UploadConfig extends RequestConfig {
  onProgress?: (event: AxiosProgressEvent) => void
}

/** 下载选项：文件名 + 下载进度回调。 */
export interface DownloadConfig extends RequestConfig {
  /** Content-Disposition 缺失时的兜底文件名。 */
  filename?: string
  onProgress?: (event: AxiosProgressEvent) => void
}

/** GET：查询参数走 params，幂等可重试。 */
export function get<T>(url: string, params?: object, config?: RequestConfig): Promise<T> {
  return client(config).get<T>(url, { ...config, params }).then((res) => res.data)
}

/** POST：请求体走 JSON body，写操作不自动重试。 */
export function post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return client(config).post<T>(url, data, config).then((res) => res.data)
}

/** PUT：整体更新，写操作不自动重试。 */
export function put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return client(config).put<T>(url, data, config).then((res) => res.data)
}

/** PATCH：局部更新，写操作不自动重试。 */
export function patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return client(config).patch<T>(url, data, config).then((res) => res.data)
}

/** DELETE：delete 是 TS 保留字故命名 del；参数走 params。 */
export function del<T>(url: string, params?: object, config?: RequestConfig): Promise<T> {
  return client(config).delete<T>(url, { ...config, params }).then((res) => res.data)
}

/**
 * 上传：multipart/form-data。
 * 不手写 Content-Type（交给浏览器带 boundary），透传 onUploadProgress。
 */
export function upload<T>(
  url: string,
  data: FormData | File,
  config?: UploadConfig,
): Promise<T> {
  let formData: FormData
  if (data instanceof FormData) {
    formData = data
  } else {
    formData = new FormData()
    formData.append('file', data)
  }
  const { onProgress, ...rest } = config ?? {}
  return client(config)
    .post<T>(url, formData, { ...rest, onUploadProgress: onProgress })
    .then((res) => res.data)
}

/**
 * 下载：responseType blob，响应拦截按 responseType 跳过解包。
 * 从 Content-Disposition 取文件名触发浏览器保存，缺省用传入 filename。
 */
export async function download(
  url: string,
  params?: object,
  config?: DownloadConfig,
): Promise<void> {
  const { filename, onProgress, ...rest } = config ?? {}
  const response = await client(config).get<Blob>(url, {
    ...rest,
    params,
    responseType: 'blob',
    onDownloadProgress: onProgress,
  })
  // 后端可能对错误也返回 HTTP 200 + JSON 错误信封（被 blob 化）：识别后走错误分流，避免存成坏文件
  await assertNotJsonError(response.data)
  const disposition = response.headers?.['content-disposition'] as string | undefined
  const name = parseFilename(disposition) ?? filename ?? 'download'
  saveBlob(response.data, name)
}

/** 兜底任意方法，返回解包后的 data。 */
export function request<T>(config: RequestConfig): Promise<T> {
  return client(config).request<T>(config).then((res) => res.data)
}

/** blob 实为 JSON 错误信封时，解析并抛出归一错误，阻止把错误存成文件。 */
async function assertNotJsonError(blob: Blob): Promise<void> {
  if (!blob.type.includes('application/json')) return
  const text = await blob.text()
  let message: string = ERROR_TEXT.business
  let bizCode: number | string | undefined
  try {
    const envelope = JSON.parse(text) as { code?: number | string; msg?: string }
    if (envelope.msg) message = envelope.msg
    bizCode = envelope.code
  } catch {
    // 非合法 JSON，用兜底文案
  }
  const normalized: NormalizedApiError = {
    kind: 'business',
    httpStatus: 200,
    bizCode,
    message,
    raw: text,
  }
  // blob 实为错误信封时不静默：走注入的 onError（download 场景的确定性提示）
  runOnError(normalized)
  throw normalized
}

/** 从 Content-Disposition 解析文件名（兼容 filename* UTF-8 编码）。 */
function parseFilename(disposition?: string): string | undefined {
  if (!disposition) return undefined
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition)
  return plainMatch?.[1]
}

/** 触发浏览器保存 Blob。 */
function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export { http }
