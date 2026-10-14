/**
 * AI 交互状态机契约（从 ai.ts 拆出以单一职责）。
 *
 * ai.ts 负责 store 实现（状态流转、请求编排、定时器管理），本层只声明
 * 「AI 有哪些可视状态、如何归因超时」这份契约本身。契约稳定、实现可变，
 * AiTimeoutKind 现由 @/api/streamError 定义（依赖方向 ai → api），本模块 re-export 保持旧引用面。
 */
import type { AiTimeoutKind } from '@core/api/streamError'
export type { AiTimeoutKind }

/**
 * AI 交互状态机（实施方案任务 4.5 / 规范 §02.2 原则三、原则四；§11 对话式 AI）
 *
 * 固化「建议 → 确认 → 执行」三步链，并覆盖规范 §02.2 原则四要求的
 * 生成 / 任务 / 异常三链路完整状态——AI 的每一种工作状态对用户可见，
 * 不允许「不知道 AI 在干什么」的空白期，异常也不得被笼统兜底为一个 error。
 *
 * status 是 AI 工作状态可视化（任务 4.12 AiStatusIndicator）的唯一数据源，
 * 且【只反映展示态】，不得成为绕过用户确认直接执行的旁路。
 */
export type AiStatus =
  | 'idle' // 空闲，不渲染状态（纯工程初始态，规范未列此视觉状态，走查免核）
  // ── A 生成链路 ──
  | 'requesting' // 请求中：建立连接/排队，尚未进入 AI 处理（灰色信号波纹，非流光）
  | 'thinking' // 思考中：接收请求到开始输出之间（三点脉冲 + 流光）
  | 'streaming' // 生成中：流式输出中（逐字 + 末尾光标 + 流光）
  | 'done' // 完成：内容静止 + 「AI 建议」角标 + 操作按钮出现
  // ── B 任务链路（Agent/运小星）──
  | 'executing' // 执行中：调工具，须写清"在调什么工具/第几步"（进度 + 流光）
  | 'awaitingUser' // 等待用户：AI 挂起等待确认/授权/补充（衔接原则三）
  // ── C 异常链路 ──
  | 'aborted' // 中断：用户主动停止或被打断，非报错（中性「已停止」，禁止红色）
  | 'timeoutNetwork' // 网络超时：客户端网络问题（引导检查网络后重试）
  | 'timeoutServer' // 服务器超时：服务端仍在处理，沿用思考中活跃态，引导继续等待，不引导重试
  | 'timeoutModel' // 模型超时：>10s 无响应（引导稍后重试/重新生成）
  | 'failed' // 失败：接口报错，只给原因说明，不暴露堆栈/错误码

/** 未配置 aiStatusMinDuration 时，done 态短暂停留后自动回落 idle 的兜底时长（ms）。 */
export const DONE_HOLD = 1200

let msgSeq = 0
/** 生成会话内自增的消息 ID（时间戳 + 序号，避免同毫秒多条重复）。 */
export function nextMsgId(): string {
  msgSeq += 1
  return `ai-${Date.now()}-${msgSeq}`
}
