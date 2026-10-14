/**
 * API 领域入口：@core/api
 *
 * typed request（get/post/…）、HTTP 实例扩展点（getHttp/createHttp）与错误类型。
 * 依赖方向：只依赖 config/utils；【不】依赖 UI、router、auth 或 store。
 * 错误提示 / 未认证跳转 / CSRF 失效响应由业务系统 configureApiHandlers 注入（见 ./handlers）。
 *
 * /api 收窄闭包：attachInterceptors / API_HOSTS / genRequestId 及 AI 流式 streamChat
 * 为 http 层内部实现，不再对外导出（1.x 根入口已移除，无兼容出口）。
 */
export { configureApiHandlers } from './handlers'
export type { ApiHandlers } from './handlers'
export { http, getHttp, createHttp } from './http'
export type { ApiModule, RequestMeta } from './http'
export { get, post, put, patch, del, upload, download, request } from './request'
export type { RequestConfig, UploadConfig, DownloadConfig } from './request'
export { ERROR_TEXT, HTTP_CODE_MAP, BIZ_CODE_MAP, resolveHttpMeta } from './errorCode'
export type { ApiErrorKind, NormalizedApiError } from './errorCode'
export { resolveStreamError, STREAM_ERROR_TEXT, isAbortError } from './streamError'
export type {
  StreamError,
  StreamErrorKind,
  StreamFailure,
  StreamFailurePhase,
} from './streamError'
export { createStreamParser } from './streamParser'
export type { StreamParser, StreamProtocol, ParsedFrame, StreamEvent } from './streamParser'
