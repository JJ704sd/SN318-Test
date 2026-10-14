# 交付结构与记录格式

## 工作簿和报告

沿用来源的4表结构：`业务UI与交互用例`、`通用模板UI与交互用例`、`范围与依据`、`修改清单`。用户指定其他结构时采用其结构。只准备小批新用例时可用一个用例表和清单，不强制复制完整历史大表。

用例列保持：`用例名称｜所属模块｜前置条件｜步骤描述｜预期结果｜用例等级｜备注｜执行状态｜实际结果/证据`。以备注中的稳定用例编号关联，不以Excel行号当主键。步骤／预期逐号对应。需要人工复核时使用独立 `人工二次复核`，已有值按用例ID保留，新值留空；AI复核写入实际结果或独立模型复核字段。

修改清单至少包含：`问题ID｜类型｜等级｜页面/对象｜规范定位｜实际差异｜复现步骤｜修改或补齐建议｜验收标准｜相关用例｜证据｜整改/复测状态｜缺条件`。规范待裁决、样例缺口、已证实规范差异、已证实交互缺陷分别标明。建议落实到组件或行为，未核实的源码根因标为建议检查，不写成确定原因。

报告提供当前执行范围、按模板／业务分组的结果、步骤覆盖、问题与受阻条件、来源／基线及证据链接。报告和ZIP使用相对链接，保留引用的历史证据并注明原日期；不为凑齐包复制整个私有仓库。

结果计数只读执行状态列或结构化 `result`，不能全文统计“通过／不通过”：人工意见、备注和历史结果也会包含这些词。模板与业务、用例与子步骤、问题与工作包分别统计。

文件命名如 `SN318_W2_UI与交互_20261014_dev_b2efcdb_dirty-<指纹>.xlsx`；指纹、日期来自本次核对。保存到项目 `outputs/<当前任务ID>/<日期>/` 或用户指定位置。允许文件被占用时另存清楚标注的副本，之后验证实际交付路径。

XLSX必要验证：未授权改动的单元格／公式／样式／表格／下拉及人工内容保留，新增用例映射准确；状态和覆盖变化正确更新汇总；打开保存文件读回；关键新增／修改区渲染无截断；证据链接有效。公式与文件检查通过单独报告，不当作页面验收。

## 可选 JSON 中间记录

`assets/run-template.json` 是待填写骨架，不是执行完成证明。模板的 `phase=plan`；真正记录操作和证据后再改为 `execution`。模板本身不要求填写人工意见。

| 集合／字段 | 规则 |
| --- | --- |
| `schema_version` | 固定1；未来改格式需兼容评估 |
| `run_id`, `phase` | 本批标识；plan 或 execution |
| `environment` | repository、branch、commit、dirty、worktree_fingerprint、base_url、mode、mock、role、timezone、started_at、viewport、zoom；执行模式必须具体 |
| `sources[]` | id、title、location、revision、retrieved_at、freshness（live/snapshot）、coverage；正文与嵌入表独立记录 |
| `evidence[]` | id、kind、path、captured_at、url、scope、run_id；本地文件相对run.json，kind取 screenshot/dom/measurement/ui-log/source/historical |
| `cases[]` | id、name、layer（template/business）、package_ids、source_ids、url、preconditions、steps、result、manual_review |
| `steps[]` | id、action、expected、source_ids、actual、result、evidence_ids；受阻另填blocker与needed；不适用填exclusion_source_ids |
| `issues[]` | id、type、case_ids、source_ids、actual、recommendation、acceptance、evidence_ids、status；待裁决或缺样例项说明needed |
| `packages[]` | id、source_id、source_row、phase、priority、entry、delivery、case_ids、blocker、next_action、owner；owner未知写待确认 |

步骤及用例结果值：`通过`、`不通过`、`受阻`、`未执行`、`不适用`。用例遵循SKILL的聚合表。一个步骤包含多个不同预期分支时先拆开，不用一个“通过”掩盖缺分支。

通过／不通过的步骤必须有实际表现、明确预期及来源，并引用至少一份本地证据。交互操作结果至少有 screenshot/dom/measurement/ui-log 中的证据，只有源码不能完成动态判定。证据 `scope` 必须写出适用状态与限制；文件存在不代表内容可信，交付前仍要人工式核对。

`manual_review` 是来源内容的原样保留槽，通常为空字符串。脚本不填、不判定、也不授权模型写入人工结论。模型不能据此将自身意见标成真人复核。

运行 `scripts/validate_run.py run.json` 将检查模式、必填、重复ID、引用、本地证据存在、用例聚合和工作包映射，打印 JSON 并用非零退出码报告错误。它不读取Excel、不访问网络、不启动浏览器、不修改记录；不得把它的 `ok=true` 描述成测试通过。无需JSON中间记录时直接核验工作簿和报告，不为遵循Skill重复录入。

## 使用示例

“使用 $sn318-ui-audit，按W2排期对当前已交付页面先做UI规范审查，输出修改清单和证据。随后逐包补齐UI与交互用例；未交付页面列出入口和样例缺口。”

“使用 $sn318-ui-audit，复测指定工作簿里本次已修的12项，保留未重跑结果和人工二次复核内容，并另存带Build标识的文件。”
