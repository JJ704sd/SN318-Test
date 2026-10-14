from pathlib import Path
from datetime import datetime,timezone,timedelta
from collections import Counter
import copy,hashlib,html,json,re,shutil,zipfile
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit

ROOT=Path('.');WORK=ROOT/'.work/w2-master-reaudit-20261014';OUT=ROOT/'outputs/ui-audit-20261014/20261014-master-data-reaudit';OLD=OUT.parent/'20261014-ui-audit'
record=json.loads((OUT/'复核记录.json').read_text(encoding='utf-8'));plan=json.loads((WORK/'workbook-plan.json').read_text(encoding='utf-8'));dest=Path(plan['destination'])
record['environment'].update(viewport='1440×900',zoom=1,visual_viewport_scale=1,device_pixel_ratio=1,viewport_restored=True)
record['ui_actions_finished_at']=datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
used=set(e for c in record['cases'] for s in c['steps'] for e in s['evidence_ids'])
used.add('C09-card-measurement')
evidence_map={}
for id in sorted(used):
 files=[f for f in (OUT/'evidence').glob(id+'.*') if f.suffix in ['.json','.txt','.jpg','.png']]
 assert files,id
 evidence_map[id]=[f.relative_to(OUT).as_posix() for f in files]
 for file in files:
  if file.suffix=='.json':
   j=json.loads(file.read_text(encoding='utf-8'));j.setdefault('evidence_id',id)
 # Unused transient captures are not silently interpreted as current results.
for file in list((OUT/'evidence').iterdir()):
 if file.is_file() and file.stem not in used:file.unlink()
record['evidence_index']={id:[{'path':p,'sha256':hashlib.sha256((OUT/p).read_bytes()).hexdigest()} for p in paths] for id,paths in evidence_map.items()}

def numbered(text):
 return {n:t.strip() for n,t in re.findall(r'\[(\d+)\]([^\[]*)',text)}
for c in record['cases']:
 actions,expected=numbered(c['actions']),numbered(c['expected'])
 for i,s in enumerate(c['steps'],1):
  s.update(id=str(i),action=actions.get(str(i),c['actions']),expected=expected.get(str(i),c['expected']))
  assert s['actual'] and s['expected'] and s['evidence_ids']
  assert all(id in evidence_map for id in s['evidence_ids'])
  if s['result']=='受阻':assert s['needed']
  if c['id']=='UI-M1-025' and i==3:s['evidence_ids'].append('C09-card-measurement')
 result='不通过' if any(s['result']=='不通过' for s in c['steps']) else '受阻' if any(s['result']=='受阻' for s in c['steps']) else '通过'
 assert c['result']==result,c['id']
assert dict(Counter(c['result'] for c in record['cases']))==record['counts']

# Preserve the dated normative snapshots used in this run, without describing
# them as a fresh cloud retrieval.
sources=['norm-live.json','norm-2xUUpH.json','norm-IOfbnI.json','norm-Jhut4D.json','norm-jYqjvY.json','norm-hezLMm.json','norm-tkqkxw.json','review-live.ndjson','review-live.manifest.json','product-prd-live-readable.md','base-prd-live-readable.md','M1-development-baseline.md']
for name in sources:shutil.copy2(OLD/'sources'/name,OUT/'sources'/name)
shutil.copy2(ROOT/'pcs-front/docs/本地UI测试.md',OUT/'sources/local-ui-test.md')
record['source_snapshots']=[{'path':'sources/'+name,'freshness':'snapshot','source_date':'2026-10-14','sha256':hashlib.sha256((OUT/'sources'/name).read_bytes()).hexdigest()} for name in sources]
(OUT/'复核记录.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')

esc=lambda v:html.escape(str(v),quote=True)
def links(ids):
 ids=list(ids)
 if 'C09-cards-and-tabs' in ids and 'C09-card-measurement' not in ids:ids.append('C09-card-measurement')
 return ' '.join(f'<a href="{esc(p)}">{esc(id)} {Path(p).suffix[1:]}</a>' for id in ids for p in evidence_map[id])
changes=[c for c in record['cases'] if c['previous_result']!=c['result']]
change_rows=''.join('<tr>'+''.join(f'<td>{esc(v)}</td>' for v in [c['id'],c['name'],c['previous_result'],c['result']])+'</tr>' for c in changes)
case_html=[]
for c in sorted(record['cases'],key=lambda c:c['row']):
 step_rows=''.join(f'<tr><td>{s["id"]}</td><td>{esc(s["action"])}<details><summary>原预期</summary>{esc(s["expected"])}</details></td><td>{esc(s["result"])}</td><td>{esc(s["actual"])}'+(f'<p>缺条件：{esc(s["needed"])}</p>' if s['needed'] else '')+'<p>'+links(s['evidence_ids'])+'</p></td></tr>' for s in c['steps'])
 case_html.append(f'<article id="{c["id"]}"><h3>{esc(c["id"])} {esc(c["name"])} · {c["result"]}</h3><p>上一轮：{esc(c["previous_result"])}；业务表原行{c["row"]}，本轮N-Q列。仅按当前步骤及判据记录，不将整条受阻写成全部未测。</p><table><thead><tr><th>步骤</th><th>操作/原预期</th><th>结果</th><th>实际/证据</th></tr></thead><tbody>{step_rows}</tbody></table></article>')
report=f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SN318 主数据用例复核 · fd786de</title><style>body{{font:15px/1.65 system-ui,'Microsoft YaHei',sans-serif;color:#263644;background:#f3f6f9;margin:0}}main{{max-width:1240px;padding:24px;margin:auto}}article,.summary{{background:white;border:1px solid #d5e1e9;border-radius:12px;padding:20px;margin:18px 0}}table{{width:100%;border-collapse:collapse;table-layout:fixed}}th,td{{padding:10px;border-bottom:1px solid #d5e1e9;text-align:left;vertical-align:top;overflow-wrap:anywhere}}th{{background:#edf3fa}}a{{color:#046efc}}img{{max-width:100%}}pre{{white-space:pre-wrap;overflow-wrap:anywhere}}h1{{font-size:26px}}h3{{font-size:18px}}details{{margin-top:8px}}.cases th:first-child{{width:40px}}.cases th:nth-child(2){{width:25%}}.cases th:nth-child(3){{width:60px}}</style><main>
<h1>SN318 主数据用例复核</h1><p>{esc(record['run_id'])} · 2026-10-14 · 本地dev/Mock · demo身份 · 1440×900/100%</p>
<div class="summary"><p><b>本轮复核31条：通过4，不通过23，受阻4。</b>包含18个列表、2个关联子表、5条定向检查及6条原业务候选的可执行分支。其余70条业务记录及40条模板未重跑，旧轮次状态保留。</p><p><b>先看业务表N-Q列、范围与依据第236行起、修改清单P-S列。</b>历史H-M、J列已有人工意见及原清单未覆盖。通过/不通过/受阻/未复核统计来自本轮N列；不要将旧K列与N列混加。</p><p>UI-M1-022从受阻改通过：本次捕获重复错误Toast、输入保留及保存按钮恢复。20个无结果空态仍引用共性问题R09；数字/正文/按钮与操作对齐仍有规范差异。</p><p>新增W2-MR01：重复费用编码未关联到编码字段下。UI-M1-022只要求明确反馈，所以通过；UI-W2-50-2另要求字段关联错误，因此不通过，两者判据不同。</p></div>
<p><a href="{esc(dest.name)}">复核后的Excel</a> · <a href="sources/执行基线原件.xlsx">保留的原始执行基线</a> · <a href="复核记录.json">本轮结构化记录</a> · <a href="文件校验.json">文件及环境校验</a></p>
<h2>状态发生变化的7条</h2><table><thead><tr><th>用例</th><th>名称</th><th>旧轮次</th><th>本轮</th></tr></thead><tbody>{change_rows}</tbody></table>
<h2>主要新证据</h2><p>重复费用项仍停在表单并保留输入，错误Toast可见。证据支持UI-M1-022的完整本地反馈分支；不证明真实后端、权限或持久化。</p><img src="evidence/F07-fee-duplicate-result.jpg" alt="重复费用项提交后的错误反馈与保留输入"><p>{links(['F07-fee-duplicate-result'])}</p>
<h2>用例与逐步结果</h2><section class="cases">{''.join(case_html)}</section>
<h2>版本与来源</h2><p>dev/{esc(record['environment']['commit'])}；dirty指纹{esc(record['environment']['worktree_fingerprint'])}；Mock认证及数据均开启。源工作簿与仓库指纹已前后核对。本次未修改前端源码、未删除记录；临时编辑均取消，重复新增失败未增加记录。</p>
<p>沿用10/14较早取得的V1.2规范正文rev5256、嵌入表rev3138、UI Review rev680及M1冻结基线；本轮未重新读取云端规范。<a href="sources/norm-live.json">规范正文快照</a>、<a href="sources/norm-2xUUpH.json">7.2空态表</a>、<a href="sources/review-live.ndjson">Review快照</a>、<a href="sources/M1-development-baseline.md">M1基线</a>、<a href="sources/local-ui-test.md">当前本地Mock说明</a>。</p>
<p>4条受阻分别缺：费用字段/专项分类采纳映射、编码长度L和非重复失败样例、汇率极值/空零/长名称数据、长字典分类/&gt;7项及键盘专项样例。已明确的普通UI步骤继续实测，不把设计状态当作测试通过。</p>
<p>截图、DOM和量测依次采样，记录各自时间；未使用隐藏页签的离屏按钮作为可操作证据。切换资源后等待初始化，关联查询先切到可见“成员/国家关系”页签。</p>
<h2>打开与复测</h2><p>Excel当前N-Q列为本轮结果；J列留给人工复核。开发修复后按本报告步骤与预期复测，记录新版本/证据。未重跑模板与其他工作包不产生新的通过结论。</p></main></html>'''
(OUT/'主数据复核报告.html').write_text(report,encoding='utf-8')
readme=f'''# 主数据用例复核使用说明

1. 打开 `{dest.name}`，先看“业务UI与交互用例”N-Q列的当前复核结果。H-M为保留的原轮次，J列人工内容不由模型代填。
2. “范围与依据”第236行起是本轮汇总，计数公式关联业务N列。“修改清单”P-S列是原问题的本轮复核状态，54-55行新增W2-MR01。
3. 打开 [主数据复核报告](主数据复核报告.html)，逐用例查看动作、原预期、当前结果和证据链接。保留evidence和sources目录结构。
4. 本轮31条为4通过、23不通过、4受阻。UI-M1-022受阻转通过；6条原业务候选从未执行改成当前不通过或受阻。70条其他业务与40条模板未重跑。
5. 本地dev/Mock基线为fd786de/dirty-{record['environment']['worktree_fingerprint'][:8]}。规范采用10/14已有快照，不证明真实接口、权限或完整业务验收。

原工作簿在sources/执行基线原件.xlsx；原执行记录、公式、样式及J2/J3人工意见均保留。后续修改按新轮次追加，实际复测后再关闭问题。
'''
(OUT/'使用说明.md').write_text(readme,encoding='utf-8')
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):self.links += [v for k,v in attrs if k in ['href','src'] and v]
p=Parser();p.feed(report);local=0
for target in p.links:
 if target.startswith(('http:','https:','#')):continue
 assert (OUT/unquote(urlsplit(target).path)).is_file(),target;local+=1
check=json.loads((OUT/'文件校验.json').read_text(encoding='utf-8'))
check.update(report_local_links_checked=local,case_result_aggregation_verified=31,evidence_ids=len(evidence_map),visual_qa='新增用例、汇总、修改清单及新增问题的预览已检查；无截断。',render_command_note='Artifact Tool渲染图片和导入读回已生成，但渲染命令退出返回非零；本次未声称原生Excel应用打开验收。',final_output_sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
(OUT/'文件校验.json').write_text(json.dumps(check,ensure_ascii=False,indent=2),encoding='utf-8')
archive=OUT/'SN318_主数据用例复核_20261014_fd786de_证据包.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for file in sorted(OUT.rglob('*')):
  if file.is_file() and file!=archive:z.write(file,file.relative_to(OUT).as_posix())
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert hashlib.sha256(z.read(dest.name)).hexdigest()==hashlib.sha256(dest.read_bytes()).hexdigest()
print(json.dumps({'xlsx':str(dest),'report':str(OUT/'主数据复核报告.html'),'zip':str(archive),'zip_MB':round(archive.stat().st_size/1024/1024,2),'counts':record['counts'],'evidence_ids':len(evidence_map),'local_report_links':local,'source_workbook_unchanged':True},ensure_ascii=False))
