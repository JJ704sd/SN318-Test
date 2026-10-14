# AI 域通用原子组件

> AI 域内跨子目录复用的纯展示组件。命名统一 `Ai` 前缀。

## 组件清单

| 组件 | 职责 |
|---|---|
| `AiTag.vue` | AI 生成内容角标 / AI 建议前缀 |
| `AiAvatar.vue` | AI 头像 |
| `AiPingWave.vue` | 在线脉冲动画 |
| `AiStatusIndicator.vue` | AI 状态指示（就绪 / 思考中 / 超时 / 错误） |
| `AiStreamCursor.vue` | 流式输出光标 |
| `AiThinkingDots.vue` | 思考中省略号动画 |
| `AiActiveContainer.vue` | AI 激活态容器（hover/focus 反馈） |

## 引用规则

- 仅被 `ai/assistant/` `ai/embedded/` 引用，**不**被业务页面（`views/`）直接引用
- 不反向引用 `ai/assistant/` `ai/embedded/`，避免循环依赖
- 不耦合具体业务字段与接口
