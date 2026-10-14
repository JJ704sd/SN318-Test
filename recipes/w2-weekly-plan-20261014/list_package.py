import hashlib
import json
import zipfile
from collections import Counter
from pathlib import Path

root=Path('./artifacts/ui-audit-20261014/weekly-plan-20261014')
archive=root/'SN318_本周工作简报与测试材料_20261014.zip'
out=root/'压缩包完整文件清单_1311项.md'
before=hashlib.sha256(archive.read_bytes()).hexdigest()
receipt=json.loads((root/'sources/本周简报文件包校验.json').read_text(encoding='utf-8'))
assert before==receipt['zip_sha256']
base='SN318_W2本周工作清单与推进安排_20261014'
principal=[
 (base+'.pdf','一页工作简报，用于直接汇报。'),
 (base+'.md','与PDF正文一致，方便复制和编辑。'),
 ('文件使用说明.md','说明各文件用途、查看顺序与复测使用方法。'),
 ('01_本轮审查/SN318_W2_UI与交互_20261014_dev_b2efcdb_dirty-5c6bc530.xlsx','本轮UI与交互用例、修改清单、验收标准和证据。'),
 ('02_受阻复核/SN318_W2_UI与交互测试用例_16条受阻核实_含人工二次复核.xlsx','受阻逐条核实的历史记录及人工二次复核。'),
 ('01_本轮审查/sources/执行基线原件.xlsx','保留的执行基线原件，用于对照追溯。'),
 ('01_本轮审查/审查报告.html','本轮图文报告及证据链接。'),
 ('02_受阻复核/复核证据.html','受阻核实报告及证据链接。'),
 ('01_本轮审查/审查记录.json','本轮结构化审查记录。'),
 ('01_本轮审查/历史证据索引.json','本轮保留的历史证据索引。'),
 ('02_受阻复核/复核索引.json','历史复核索引。'),
 ('02_受阻复核/本轮16条核实索引.json','16条受阻核实索引。'),
 ('01_本轮审查/交付校验.json','本包工作簿摘要及原交付校验信息。'),
 ('01_本轮审查/交付校验_原记录.json','保留的原交付校验记录。'),
 ('打包校验.json','包内文件摘要及打包检查结果。'),
 ('03_排期参考/schedule-live.json','10/14读取的W2排期快照。'),
 ('03_排期参考/phase-consensus-live.json','10/14读取的阶段共识快照。'),
]
with zipfile.ZipFile(archive) as z:
    entries=sorted([i for i in z.infolist() if not i.is_dir()],key=lambda i:i.filename)
    names={i.filename for i in entries}
    assert len(entries)==len(names)==1311
    assert all(name in names for name,_ in principal)
    groups=Counter('/'.join(i.filename.split('/')[:2]) if i.filename.count('/')>1 else i.filename.split('/')[0] if '/' in i.filename else '根目录' for i in entries)
    lines=['# 压缩包文件清单','',f'压缩包：{archive.name}', '',
           f'共{len(entries)}个文件。以下路径均相对于ZIP根目录；本清单只读取目录，未修改ZIP。','',
           '## 主要文件逐项说明','', '| 序号 | 包内文件路径 | 用途 |', '| --- | --- | --- |']
    lines += [f'| {n} | `{name}` | {use} |' for n,(name,use) in enumerate(principal,1)]
    lines += ['', '## 目录汇总','', '| 目录 | 文件数 |', '| --- | --- |']
    lines += [f'| `{name}` | {count} |' for name,count in sorted(groups.items())]
    lines += ['', '## 全部文件逐项清单','', '| 序号 | 包内完整路径 | 大小（字节） |', '| --- | --- | --- |']
    lines += [f'| {n} | `{i.filename}` | {i.file_size} |' for n,i in enumerate(entries,1)]
    lines += ['']
    out.write_text('\n'.join(lines),encoding='utf-8')
assert hashlib.sha256(archive.read_bytes()).hexdigest()==before
assert sum(groups.values())==1311
print(json.dumps({'list_path':str(out),'list_bytes':out.stat().st_size,'file_count':len(entries),'principal_count':len(principal),'zip_unchanged':True,'groups':dict(groups)},ensure_ascii=False))
