# 来源与历史基线

本表是 2026-10-14 创建 Skill 时核对的导航，不是未来运行的实时状态。后续以本轮指定来源、采纳版本及当前环境为准。保留旧记录便于比较，不将全部历史副本当作当前主文件。

## 指导文档

| 来源 | 用途 | 本次取得的证据 |
| --- | --- | --- |
| [排期表](https://example.invalid/source/7cdefbaffe) | 周期、工作包、阶段和优先级 | 用户本次截图；本地 10/13 rev988 值快照。W2 10/12–10/16，38 项 UI/开；本轮未取得线上最新修订 |
| [AI 与数字化中心通用设计规范 V1.2](https://example.invalid/source/05cc32fecc) | Token、组件状态、响应式及页面模板判据 | 10/14 复核证据的正文 rev5256；嵌入表主要来自 10/13 rev3138，部分 10/14 重读。正文相同不等于所有嵌入表已刷新 |
| [SN318 原型 UI Review 及框架适配表](https://example.invalid/source/e04459bb0b) | 页面专项设计结论、冲突及复用分类 | 10/13 rev680 与 10/14 浏览器可见视图，24 条含空白占位。按 record_id 追踪，不按显示顺序匹配 |
| [前端开发基本思路](https://example.invalid/source/0caf9d9812) | 视觉交互、数据、工程三维交付及契约—Mock—联调方法 | 引用聊天读到第59版，本轮读取本地导出 `./private-local-path`。导出遗漏的两张环境表仍未核对 |
| 项目 `AGENTS.md`、`docs/本地UI测试.md`、`public/config.js`、`package.json` | 当前内联核心层、启动方式、Mock 能力、实际脚本 | 本轮读回。源码修复时重新确认适用指令，不沿用旧文档的包导入或代理描述 |

源快照位置（以项目根目录 `.` 为起点）：

- `.work/weekly-local-20261013/schedule-values.json`、`data.json`：排期值及 W2 映射。
- `.work/template-ui-execution-20261013/norm-full-audit-text.txt`、`norm-full-audit-table-text.txt`：规范正文及嵌入表展开值。
- `outputs/template-reaudit/受阻16条核实/sources/source-boundary.json`：来源更新时间和未核对边界。
- `pcs-front/docs/template-reference/frontend-prototype/`：业务原型导出，涉及具体业务工作包时按模块读取。

本轮 CLI 读取遇到 bot 网络限制和 user 会话缺失，因此采用上述已核对快照，不新建登录授权。以后有现成身份时优先 `lark-cli`；命令参数以已安装版本的 help 为准，必要时用 `wiki +node-get` 解析 obj_token，再 `docs +fetch`；表格需另读相关 sheet，不能只读正文。只读任务不写回飞书。

## 已读取的五个聊天

| 聊天 | 提炼用途 |
| --- | --- |
| [复核40条通用模板UI用例](https://example.invalid/local-reference) | 原步骤判定、loading 取证、路径校准、人工意见保留及逐分支受阻 |
| [梳理本周前端 UI 审查清单](https://example.invalid/local-reference) | 先输出 UI 清单，本周按实际交付介入；撤销固定逐日顺序 |
| [探索 pcs-front 前端界面](https://example.invalid/local-reference) | 最小前端＋Mock 环境、主数据样例范围、内存与权限边界 |
| [分析指导文档并结合SN318前端](https://example.invalid/local-reference) | 文档目标与当前实现分开，静态研究与运行验证分开 |
| [修订PCS测试用例并梳理本周任务](https://example.invalid/local-reference) | 工作包映射、公共检查复用、只读／历史／数值范围细化 |

后续用户引用聊天时仍需 live `read_thread`，这份索引不代替读取。

## 工作簿版本选择

默认历史执行起点为：

`outputs/template-reaudit/受阻16条核实/SN318_W2_UI与交互测试用例_16条受阻核实_含人工二次复核.xlsx`

本轮按该文件 H 列回读：40 条模板为通过13、不通过12、受阻15；76 条业务候选仍未执行。J列已有一项人工填写，不能因为旧聊天说“40行留空”而清空。当前文件 SHA-256 为 `PRIVATE_SOURCE_HASH`，之后变化需重新核对。

其他参考按用途选取，不回退到它们的旧执行计数：

- `outputs/weekly-ui/SN318_W2_UI与交互测试用例_按工单用例风格重写.xlsx`：格式、116条结构及修改清单。其模板结果为旧版12/10/18。
- `outputs/w2-tasks/20261013/PCS_W2前端测试用例_飞书与页面复核修订.xlsx`：105条工作包专项参考，保留修订理由，不当作业务通过记录。
- `outputs/smoke-ui/SN318_冒烟与UI用例_飞书五色及实际页面复核.xlsx`：覆盖和交接。
- `outputs/ui-audit/SN318_基础配置前端UI走查_修改清单及截图证据.xlsx` 与 `W2/SN318_W2前端UI规范审查_修改清单.xlsx`：基础配置历史问题、设计范围和缺口。

主文件本轮明确指定时优先采用指定文件；旧结果重判要写版本来源，不能静默混合不同日期证据。查看最后修改时间只能发现候选，不足以确认主版本。

## 当前环境锚点

本轮只确认入口与基线，没有重跑40条或业务整批：`dev`，HEAD `b2efcdb15e949a07b7d5d74aa997c082106a6b0f`，存在既有未提交修改；`/demo/list` 自动登录后可见86条演示运单。

主数据本地说明覆盖20类资源；内存数据刷新恢复，认证 Mock 为全量权限。20类主数据、40条模板与38个工作包不是同一个统计口径。新版核心层在 `src/core/`，以当前项目指令中的 `@core/<领域>` 导入为准，不套用旧包时代的结论。
