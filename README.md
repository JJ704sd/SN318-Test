# SN318-Test

SN318 测试设计、前端 UI 审查与脱敏前端源码快照。此仓库按公开发布范围整理，原始资料与私有工程保留在本地。

| 目录 | 内容 |
| --- | --- |
| `artifacts/checklist/` | 分批提测检查表、边界异常复核、需求重核版本 |
| `artifacts/smoke-ui/` | 功能冒烟与界面交互检查表、颜色层级复核版本 |
| `artifacts/ui-audit/` | UI 测试建议、基础配置走查与 W2 审查清单 |
| `artifacts/frontend-audit/` | 前端 UI 规范审查与修改清单 |
| `pcs-front/` | Vue 管理端与 Fastify BFF 的脱敏源码快照 |
| `recipes/` | 检查表生成、修订和复核的历史脚本 |
| `tools/audit_publication.py` | 对待发布 Git 文件及 XLSX 包内内容进行检查 |
| `docs/` | 发布范围与验证记录 |

检查表保留原有执行字段、公式、样式和审查结论。用例设计、局部页面观察及导出验证各有自己的证据范围，不能据此认定整套环境测试已经通过。读取具体记录时请沿用表内的“未执行”“待确认”等状态。

公开版已移除真实凭据、内部服务及文档地址、人员姓名、来源记录标识、本机路径、作者元数据和嵌入截图。表内截图索引只保留定位与说明，原始图像留在本地。公开占位链接不提供原文访问。

`pcs-front` 依赖私有包 `@baiyun/template-core`。公开仓库不包含该包及认证配置；安装和运行需使用者自行取得合法访问权限，并在用户级配置 registry。参考 `pcs-front/README.md`。

`recipes` 记录历史处理方法，其相对路径以仓库根目录为基准。依赖的原始文档快照、中间数据及截图未公开，部分脚本需要补齐这些输入后才能运行；这次发布没有重跑历史测试或文档生成流程。

发布前检查：

```powershell
git add README.md .gitignore artifacts pcs-front recipes tools docs
python tools/audit_publication.py --staged
git diff --cached --check
```

扫描用于发现常见泄露模式，新增公开文件仍需人工检查发布范围。
