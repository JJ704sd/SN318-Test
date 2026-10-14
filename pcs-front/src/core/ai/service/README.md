# AI 服务层（src/ai/service）

本目录是整个 AI 层的**可替换后端抽象**。UI 层只依赖统一出口（`useAiService` / ai store），
不感知具体适配器，因此可以在 **Mock** 与真实后端之间无缝切换。

## 目录结构

| 文件 | 职责 |
|---|---|
| `types.ts` | AI 服务层类型契约（消息 / 建议 / 动作 / 流式 / 依据） |
| `AiService.ts` | `AiService` 接口 + `BaseAiService` 抽象基类 |
| `AiAbortError.ts` | AI 中断信号（用户主动停止），store/上层据此落 aborted，不依赖具体 Mock 实现 |
| `MockAiAdapter.ts` | Mock 适配器（setTimeout 模拟流式 + 本地回复/建议），模板演示显式注册使用 |
| `LlmAdapter.ts` | **deprecated**：早期真实 LLM 占位骨架，方法均抛「未实现」，1.x 兼容导出，2.0 物理删除 |
| `mock-data/` | Mock 数据模块（`replies` 对话库 / `suggestions` 建议库 / `nl-filter` NL 解析），由 MockAiAdapter 按方法动态 import（不静态携带） |

## 注册契约（正式 API）

```ts
import { registerAiService, getAiService } from '@core/ai'

// 业务在 aiEnabled=true 且动态导入 /ai 后显式注册
registerAiService(myAdapter)   // 真实业务注册自定义 adapter；模板演示注册 MockAiAdapter

const svc = getAiService()      // 取当前实例
```

- AI 服务由业务系统**显式注册**，通用能力框架不静默替业务决定后端。
- `registerAiService` 可**重复注册覆盖**，支持开发热更新时安全更换适配器。
- 未注册时调用 `getAiService()` 抛出明确的初始化错误（S4-C 起移除早期「回落默认 Mock」：
  回落会把 Mock 与 Mock 数据静态拖入 import 链）。启用 AI 的业务须先注册再使用 AI。

## 核心红线：建议 → 确认 → 执行（规范 §02.2 原则三）

- `requestSuggestions`：只**产出建议**，无任何副作用；即使建议携带 action 也不执行。
- `confirmAndExecute`：三步链中**唯一**产生副作用的方法，调用方必须保证 action 已经过
  用户显式确认（高风险动作还需二次确认）。

接口层**不提供**任何「产出建议并同时执行」的合并方法——新增适配器时同样不得打破这一分离。

## 如何新增一个真实适配器

1. 新建 `XxxAdapter.ts`，`extends BaseAiService`（或 `implements AiService`），
   实现 `sendMessage` / `requestSuggestions` / `confirmAndExecute` 三个方法。
2. **流式**（`sendMessage`）**不要手写 fetch/SSE**：import `streamChat`
   （`src/api/httpStream.ts`），把 `content` + `history` 组成 messages 数组，
   透传 `signal`，用 `onChunk` 驱动增量、`onDone` 收流、`onError` 按归因交给 ai store。
3. **一次性调用**（`requestSuggestions` / `confirmAndExecute`）走 typed 帮助函数
   （`src/api/request` 的 `get` / `post` 等），返回值已解包为 `data`。
4. 业务系统在 `main.ts`（启用 AI 后）调用 `registerAiService(new XxxAdapter())` 注册。

> 自定义 adapter 可参考 `src/api/httpStream.ts` 的流式回调契约与 `AiService` 接口注册实现。

## 运行时配置（endpoint / apiKey）

**禁止在代码里硬编码 endpoint 或密钥**，一律走运行时配置。业务侧从 `@/config/env` 读取
（已封装运行时优先 + 构建期回落，见 `src/config/env.ts`）。

配置通过 `public/config.js` 注入（纯 JSON，main.ts 主动 fetch 存内存模块作用域），避免硬编码：

```javascript
// public/config.js
{
  apiBaseUrl: 'https://api.example.com',   // 数据请求基址
  aiStreamPath: '/ai/stream',              // 流式接口路径（业务适配器 / 流式工具使用）
}
```

| 配置键 | 用途 | 备注 |
|---|---|---|
| `apiBaseUrl` | API 服务基址 | 数据请求基地址 |
| `aiStreamPath` | 流式接口路径 | 默认 `/ai/stream` |
| `aiStatusMinDuration` | 每个状态最短展示时间（ms） | 默认 `0` 跟随接口；演示环境可设 `3000` |
| `aiProvider` | **deprecated**（2.0 移除） | 旧 provider 开关，`'llm'` 已不再实例化占位，读到回落 Mock 并告警 |
| `llmEndpoint` | **deprecated**（2.0 移除） | 真实 LLM endpoint，改由业务自定义 adapter 内部处理 |

- 部署时：由运维/CI 注入 `public/config.js`；优先级高于构建期。
- **apiKey / 密钥**：交由服务端代理或运行时注入，**切勿**写进前端仓库或版本库。不挂 window，避免 XSS 篡改风险。

## 1.x provider 切换（deprecated）

早期版本通过改一处配置切换 Mock ↔ 真实（`aiProvider: 'llm'` + 实现 `LlmAdapter`）。
该机制已废弃：`LlmAdapter` 已物理删除，真实后端由业务实现自定义 adapter 并经
`registerAiService` 注册；`aiProvider` / `llmEndpoint` 为运行时配置保留字段（deprecated）。

真实接入请走**注册契约**：实现自定义 adapter 后 `registerAiService` 显式注册。
