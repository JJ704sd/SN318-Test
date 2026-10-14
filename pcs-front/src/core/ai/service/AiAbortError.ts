/**
 * AiAbortError —— AI 中断信号（用户主动停止，规范 §02.2 原则四：中断 ≠ 失败）。
 *
 * 从 MockAiAdapter 拆出为 service 层公共错误：适配器（Mock / 真实）在收到
 * AbortSignal 中断时抛出，ai store / 上层据此区分「用户主动停止」与真实失败，
 * 落 aborted 中性态而非 failed。
 *
 * 原宿主为 MockAiAdapter，store 依赖它会把 Mock 静态拖入引用链；拆出后
 * store 只依赖本中立模块，Mock 仍 re-export 本类以兼容既有导入路径。
 */
export class AiAbortError extends Error {
  constructor() {
    super('AI 请求已被用户停止')
    this.name = 'AiAbortError'
  }
}
