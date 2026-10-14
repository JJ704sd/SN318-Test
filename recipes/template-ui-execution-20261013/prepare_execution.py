import json, re, hashlib, shutil, html
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone, timedelta

work = Path(__file__).parent
base = Path('./artifacts/weekly-ui')
ev = base/'evidence/template-execution-20261013'
design = json.loads(Path('./recipes/weekly-local-20261013/rewritten-cases.json').read_text('utf-8'))
runs = sorted(json.loads((ev/'case-results.json').read_text('utf-8')), key=lambda x:x['id'])
caps = json.loads((ev/'capture-index.json').read_text('utf-8'))
capmap = {x['id']: x for x in caps}
health = json.loads((ev/'environment-health.json').read_text('utf-8-sig'))
audit = json.loads((work/'full-audit-overrides.json').read_text('utf-8'))
auditmap = {x['id']:x for x in audit['cases']}
assert len(auditmap) == 40 and audit['currentReferencedTables'] == 124
assert len(runs) == len({x['id'] for x in runs}) == 40
assert len(caps) == len(capmap)
runmap = {x['id']:x for x in runs}
oldrefmap={'R01':'B029','R02':'B011','R03':'B011','R04':'S02','R05':'S01','R06':'B016'}
for r in runs:
    oldissues=r['issues'][:]
    r['issues']=list(dict.fromkeys(oldrefmap.get(x,x) for x in oldissues))
    if any(s['verdict']=='受阻' for s in r['steps']):
        bid='B'+r['id'][-3:]
        if bid not in r['issues']:r['issues'].append(bid)
    if r['issues']!=oldissues:r.setdefault('previousIssueRefs',oldissues)
(ev/'case-results.json').write_text(json.dumps(runs,ensure_ascii=False,indent=2),'utf8')
steps = lambda s: re.findall(r'^\[\d+\](.*?)(?=^\[\d+\]|\Z)',s,re.M|re.S)
tz = timezone(timedelta(hours=8))
local = lambda s: datetime.fromisoformat(s.replace('Z','+00:00')).astimezone(tz).strftime('%Y-%m-%d %H:%M:%S +08:00')
joined=[]
for c in design['templates']:
    r=runmap[c['id']]
    assert len(steps(c['steps'])) == len(steps(c['expected'])) == len(r['steps']), c['id']
    for key in r['evidence']:
        assert key in capmap and (ev/capmap[key]['file']).is_file(), key
    j={**c, **r, 'originalSteps':steps(c['steps']), 'originalExpected':steps(c['expected'])}
    if c['id']=='UI-TPL-022':
        j['updatedSteps']=c['steps'].replace('[1]查看双列表单的标签、输入框及列间距。','[1]查看表单列数、标签、输入框及间距。')
        j['updatedExpected']=c['expected'].replace('[1]控件在可用宽度内，标签不覆盖输入；列间距及表单布局符合Tablet批准稿。','[1]1024属于Tablet，表单采用单列，标签在上、输入框铺满所在列；两侧padding16px，间距遵循5.7。')
    if c['id']=='UI-TPL-032':
        j['updatedExpected']=c['expected'].replace('结束后恢复规定状态，按钮尺寸和相邻布局不抖动。','结束后恢复规定状态，Spin及原文字可辨。')
    for key,value in audit['caseOverrides'].get(c['id'],{}).items():
        j['updated'+key[0].upper()+key[1:]]=value
        if key in ['precondition','title']:j[key]=value
    if j.get('updatedSteps'):j['originalSteps']=steps(j['updatedSteps'])
    if j.get('updatedExpected'):j['originalExpected']=steps(j['updatedExpected'])
    assert len(j['originalSteps']) == len(j['originalExpected']) == len(r['steps']), c['id']
    j['actualText']='本次执行：'+local(r['recordedAt'])+'，本地dev / Mock。\n'+'\n'.join(f"[{s['step']}]【{s['verdict']}】{s['actual']}" for s in r['steps'])
    if r['reason']: j['actualText']+='\n受限原因：'+r['reason']
    j['actualText']+='\n全面规范复核：'+local(audit['checkedAt'])+'；原证据重判，未新增页面执行。'
    j['actualText']+='\n证据：'+', '.join(r['evidence'])+'。图片和量测JSON见配套报告/证据包。'
    if r['issues']: j['actualText']+='\n清单：'+', '.join(r['issues'])
    j['updatedNotes']=re.sub(r'【执行说明】[^\n]*','【执行说明】2026-10-13实测见右侧；受阻项逐步保留原因。',c['notes'])
    j['updatedNotes']=j['updatedNotes'].replace('修改项：','原设计修改项：')
    j['updatedNotes']=re.sub(r'【审查方式】[^\n]*','【审查方式】浏览器实际操作、截图及只读DOM量测；Mock源码仅用于确认样例限制。',j['updatedNotes'])
    a=auditmap[c['id']]
    j['updatedNotes']=re.sub(r'【知识库依据】[^\n]*','【知识库依据】'+a['source'],j['updatedNotes'])
    admission=a['remaining'] or ('已确认差异，待修改复测。' if r['status']=='不通过' else '本条修订后的步骤已覆盖。')
    j['updatedNotes']=re.sub(r'【准入状态】[^\n]*','【准入状态】'+admission,j['updatedNotes'])
    j['updatedNotes']+='\n【全面复核】'+a['decision']
    if r['issues']:j['updatedNotes']+='\n【本次清单】'+'、'.join(r['issues'])
    j['audit']=a
    joined.append(j)
counts=dict(Counter(r['status'] for r in runs))
stepcounts=dict(Counter(s['verdict'] for r in runs for s in r['steps']))

checklist=[]
def issue(id,kind,level,obj,spec,actual,recommend,accept,cases,proof):
    checklist.append(dict(id=id,kind=kind,level=level,object=obj,spec=spec,actual=actual,recommend=recommend,accept=accept,cases=cases,evidence=proof,state='待修改' if kind=='规范差异' else '待确认'))
issue('M01','规范差异','P2','列表/组件页默认按钮','规范3.4 jYqjvY、5.1 Jhut4D；R001/R007','查询及四类普通按钮圆角2px，规定8px。032原受阻遗漏了可判定的默认态差异。','将Arco普通按钮圆角映射到8px token，保留独立的图标/尺寸规则。','默认32px高且圆角8px，hover/loading/disabled外形一致。','001、031、032','E006、E049、E054、R001')
issue('M02','规范差异','P2','标准列表页头','规范4.2内嵌表0rCax8：标准页头94px','实际97px，面包屑本体18px，main区57px，多出3px。','检查面包屑行盒和inline基线，按页头层级收敛总高度。','标准页头94px，标题/右侧操作底部对齐，窄屏无遮挡。','002、031','E006-measurements.json、E006-details.json')
issue('M03','规范差异','P2','表格操作列','规范5.8 tkqkxw：操作列左对齐、操作间距16px','操作内层居中，Space gap8px；左右固定列本身正常。005原第3步也要求操作左对齐，原通过漏判。','统一操作容器左对齐及16px间距，保持固定列宽与内部滚动。','Desktop/Tablet下操作左对齐，16px间距，固定列不重叠。','003、005、031','E006-details.json、E007、E008')
issue('M04','规范差异','P2','表格普通正文','规范3色板、5.8正文#4B5564','目的地、重量、日期内层普通文字#1A2130。','覆盖表格普通正文色；标题、链接及语义Tag分别保留规范色。','普通正文#4B5564，选中/hover状态文字仍可读。','004、031','E006-details.json、E015、R007')
issue('M05','规范差异','P2','输入占位文字','规范5.2 placeholder #C0C4CC','组件页可编辑input的placeholder #86909C；禁用placeholder #C9CDD4。','将placeholder及适用禁用态映射到规范token，避免Arco默认色残留。','默认placeholder #C0C4CC；其余六态分别按5.2核对，focus光晕及错误提示保留。','033、031','E050-input-states.json、E050、E051、E052')
issue('M07','规范差异','P2','新建表单字段标签','规范5.7表单标签#4B5564；R002','1440新建表单label实际#4E5969。','统一表单label正文色为#4B5564，红色必填星号独立。','必填/选填标签14px正文色正确，星号与错误提示仍使用错误色。','031','E091-form-layout.json、E091、R002')
issue('M08','规范差异','P2','Tablet表单列数','规范4.5.2表oppJwY C3：Tablet单列','1024、1279、768宽度表单实际仍双列。旧报告错误地按缺专项批准稿受阻。','将768–1279的表单切为单列，按通用规范执行；无需为已有明确数值另等批准稿。','在768、1024、1279宽度为单列，两侧16px留白，输入及底栏可达；1280以上按Desktop布局验证。','022、037、031','E038、E087、E089、E087-breakpoint-forms.json、norm-followup-oppJwY.json')
issue('S01','可用性建议','P1','首错自动滚动','5.7明确可见错误呈现，但未定义首错聚焦/滚动算法；属补充建议','首错被滚到top约1px，位于56px固定顶栏下，焦点仍在保存。','确认聚焦策略后，为首错scroll容器预留顶栏安全区并验证连续错误。','批准策略下首错输入、标签及提示可见，修正后定位下一错不被顶栏挡住。','014','E030、E031、E030-focus.json')
issue('S02','可用性建议','P2','标签/错误可访问关联','5.7未定义Input的for/id、ARIA描述或目标读屏器；属补充建议','label无for，控件无id/aria-labelledby、aria-describedby；错误role=alert。','批准后绑定label/控件及错误描述，补目标读屏器、键盘组合验证。','明确读出字段名、必填/错误信息；DOM关联有效，纠错后不残留旧错误。','013','E025、E026')
issue('S03','可用性建议','P2','本地Mock环境提示','环境可识别性补充建议','基础配置页面在Mock数据环境仍显示“查看正式数据”。','在开发预览明确显示Mock样例，避免截图被误用作真实数据验收。','dev页面可识别Mock环境；真实环境按发布配置显示。','环境说明','E074、environment-health.json')
issue('R07','用例口径修订','P2','Text按钮loading宽度','规范5.1、7.1及按钮附件R001','实现与规范图均因Spin增宽。旧用例的尺寸不抖动属于附加要求，规范没有要求宽度固定。','已修订032预期为Spin、原文字保留、不可重复触发及结束后恢复；active和完成样例仍需补。','按真实规范验证按钮状态，不把正常增加Spin宽度判作规范冲突或实现缺陷。','032、031','E049-buttons.json、E054、R001')
checklist[-1]['state']='已修订'
for r in runs:
    if not any(s['verdict']=='受阻' for s in r['steps']): continue
    c=next(x for x in joined if x['id']==r['id'])
    a=auditmap[r['id']]
    missing='\n'.join(f"[{s['step']}] {s['actual']}" for s in r['steps'] if s['verdict']=='受阻')
    checklist.append(dict(id='B'+r['id'][-3:],kind='执行条件待补' if r['status']=='受阻' else '部分步骤待补',level=c['priority'],object=c['title'],spec=a['source'],actual=missing,recommend=a['remaining'] or r['reason'],accept='按当前修订用例补齐未覆盖步骤，保存同状态截图；规范已有明确规格时不再等待额外设计批准。补充验收/业务策略先记录明确基线。',cases=r['id'],evidence='、'.join(r['evidence']),state='待补条件'))
for item in checklist:
    item['evidence']=item['evidence'].replace('、','\n')
assert {x for r in runs for x in r['issues']} <= {x['id'] for x in checklist}
shutil.copy2(work/'norm-full-audit-text.txt',ev/'norm-full-audit-body.txt')
sourcebody=json.loads((work/'norm-full-audit-live.json').read_text('utf-8-sig'))['data']['document']
(ev/'norm-full-audit-body.json').write_text(json.dumps({k:sourcebody[k] for k in ['title','revision_id','content'] if k in sourcebody},ensure_ascii=False,indent=2),'utf8')
(ev/'norm-full-audit-review.json').write_text(json.dumps({**{k:v for k,v in audit.items() if k!='caseOverrides'},'caseTextChanges':{k:list(v) for k,v in audit['caseOverrides'].items()}},ensure_ascii=False,indent=2),'utf8')

# Copy the exact norm attachments used for comparison. These are evidence, not instructions.
normdest=ev/'norm-reference';normdest.mkdir(exist_ok=True)
figs=json.loads((work/'norm-figures.json').read_text('utf-8'))
normmanifest=[]
for p in sorted((work/'norm-reference').glob('*.html')):
    shutil.copy2(p,normdest/p.name)
    candidates=[x for x in figs if x['name']==p.name]
    chosen=candidates[-1] if p.name=='card-components.html' else candidates[0]
    normmanifest.append({**chosen,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'downloaded_size':p.stat().st_size,'body_revision':5256})
(ev/'norm-reference-manifest.json').write_text(json.dumps(normmanifest,ensure_ascii=False,indent=2),'utf-8')
summary={'caseCounts':counts,'stepCounts':stepcounts,'cases':40,'steps':sum(stepcounts.values()),'screenshots':len(caps),'applicationScreenshots':sum(x['id'].startswith('E') for x in caps),'normReferenceScreenshots':10,'confirmedModifications':sum(x['kind']=='规范差异' for x in checklist),'checklistKinds':dict(Counter(x['kind'] for x in checklist)),'auditAt':audit['checkedAt'],'reviewedCases':40,'originalBlockedCases':20,'currentReferencedTables':124,'health':health}
(work/'execution-update.json').write_text(json.dumps({'cases':joined,'checklist':checklist,'summary':summary,'audit':audit},ensure_ascii=False,indent=2),'utf-8')
(ev/'execution-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),'utf-8')

esc=lambda s:html.escape(str(s or ''))
imgurl=lambda id:'evidence/template-execution-20261013/'+capmap[id]['file']
report=['''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCS通用模板40条UI与交互实测</title><style>
body{margin:0;background:#eff2f7;color:#25344a;font:15px/1.65 "Microsoft YaHei",sans-serif}main{max-width:1440px;margin:auto;padding:32px}h1{font-size:26px}h2{font-size:21px;margin-top:32px}h3{font-size:17px}section,details{background:white;border-radius:12px;padding:22px;margin:18px 0}summary{cursor:pointer;font-weight:600}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{padding:10px;vertical-align:top;border-bottom:1px solid #dde4ed;text-align:left}th{background:#e8eef5}a{color:#046efc}pre{white-space:pre-wrap;font-family:inherit}img{width:100%;border:1px solid #dce3ed}.proof{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.meta{color:#65758a;font-size:13px}.bad{color:#b6322b}.blocked{color:#8b610b}.good{color:#137d46}label{display:block;margin:20px 0}select{font:inherit;padding:8px}@media(max-width:720px){main{padding:16px}.proof{display:block}table{font-size:13px}}
</style><main><h1>PCS通用模板40条UI与交互实测</h1>''']
report.append('<style>.case-link{border:0;background:transparent;color:#046efc;text-decoration:underline;cursor:pointer;padding:0;font:inherit}details.case{scroll-margin-top:20px}.case table{table-layout:fixed}.case th:first-child{width:40px}.case th:last-child{width:90px}</style>')
report.append(f"<p>2026-10-13 · 本地dev/Mock原实测证据与全面规范复核。40条、{summary['steps']}个步骤：通过{counts.get('通过',0)}条，不通过{counts.get('不通过',0)}条，受阻{counts.get('受阻',0)}条。子步骤通过{stepcounts.get('通过',0)}、不通过{stepcounts.get('不通过',0)}、受阻{stepcounts.get('受阻',0)}。本轮复核未重新执行页面。</p>")
report.append('<section><h2>环境与取证方法</h2><p>先读取引用任务并检查5173监听、HTTP、Vite及Mock登录，后执行页面操作。起点/home落入基础配置，通用用例使用/demo/list、/demo/list/form、/demo/components及明确的/403、/500展示路由。</p>')
report.append(f"<p>以下为原页面执行时的环境快照：dev HEAD <code>{esc(health['head'])}</code>，监听PID21172；当时结束复查/home HTTP200且含Vite client。Mock认证/数据、权限全授予，AI助手关闭。规范全面复核沿用该批证据，未重新健康检查，未修改应用源码或重启dev。<a href='evidence/template-execution-20261013/environment-health.json'>健康记录</a>，<a href='evidence/template-execution-20261013/browser-console-end.json'>原浏览器警告/错误记录（0条）</a>。</p>")
report.append('<p>判定以规范文字/示例、实际操作、同状态截图和只读DOM颜色/尺寸/布局量测形成链路。源文件阅读用于确认Mock缺少哪些受控样例，不替代页面执行。截图捕获时已完成短加载的，不标作加载中证据；active未捕获不判通过。静态/403、/500只证明展示和返回，不证明初始化/提交异常响应。</p><p>整条通过要求前置满足并覆盖所有步骤；有已确认规范差异判不通过；未触发步骤或判据未批准判受阻，已执行子步骤保留其结果。业务76条保持原设计未执行。</p>')
report.append('<p>依据：<a href="'+esc(design['sources']['norm'])+'">通用设计规范</a> 正文rev5256/表格rev3138，<a href="'+esc(design['sources']['schedule'])+'">本周排期</a> rev988，<a href="'+esc(design['sources']['review'])+'">UI Review</a> rev680。规范关联的10个HTML附件已下载、渲染和截图，文件token与SHA见<a href="evidence/template-execution-20261013/norm-reference-manifest.json">附件索引</a>。引用任务为探索 pcs-front 前端界面（已读取健康上下文）。</p></section>')
report.append('<section><h2>全面规范复核与口径修正</h2><p>再次读取V1.2正文rev5256及内嵌表格rev3138。完整取得185张工作表，仅以当前正文实际引用的124张表及正文、关联10个官方HTML示例作为依据。逐条核对40条用例的前置、步骤、预期、实际、证据和清单；原20条受阻逐条列在下方索引，来源表ID可在完整规范快照定位。</p><p>005原通过漏计操作列居中，改不通过并关联M03；032补齐默认32px高/8px圆角，既有量测四类均2px，改不通过并关联M01。012明确改为保留合法默认值、验证可触发字段的错误呈现及纠错，已有3步证据通过；原“所有必填业务组合为空”未执行，留给功能字段校验。这是范围修订，不将未构造组合追认为通过。</p><p>011的640px多内容抽屉及031的官方示例前置已满足；030精度、034空态、036弹窗宽度、023纳入Mobile后的44px触达已有规范，不再等额外设计批准。013/014/016/029的补充可访问目标、首错算法、草稿与跨页选择策略仍需业务基线。020 Header表明确标“元素（举例）”，没有全局搜索必配条款；本期接入范围仍待确认。022/037上轮已按Tablet单列改不通过，本轮维持；新补Header48px预期尚未量测，不额外判失败。</p><p>删除032加载态宽度必须不变的附加要求。规范示例中Spin增宽不属于图文冲突。现有7项不同规范差异仍为7项，新增失败用例是已有差异的漏判。<a href="evidence/template-execution-20261013/norm-full-audit-review.json">本轮40条复核记录</a>　<a href="evidence/template-execution-20261013/norm-full-audit-body.txt">当前正文提取快照</a>　<a href="evidence/template-execution-20261013/norm-full-audit-sources.json">当前124张引用表完整快照</a>　<a href="evidence/template-execution-20261013/norm-followup-review.json">上轮局部复核历史</a></p></section>')
report.append('<section><h2>40条规范映射与原20条受阻复核索引</h2><p>原状态为上轮交付结果。本次状态按当前修订用例判定；“规范明确”与“有运行证据”分别核验。原受阻项以浅黄色标识。</p><div style="overflow-x:auto"><table><tr><th>用例/原状态</th><th>明确条款及规则</th><th>复核结论/本次状态</th><th>剩余缺口/证据</th></tr>')
for a in audit['cases']:
    report.append(f'<tr data-audit-id="{esc(a["id"])}" style="'+('background:#fff8e7' if a['before']=='受阻' else '')+f'"><td><button type="button" class="case-link" data-case-id="{esc(a["id"])}">{esc(a["id"])}</button><br>原：{esc(a["before"])}</td><td>{esc(a["source"])}<br>{esc(a["rule"])}</td><td>{esc(a["kind"])}<br>{esc(a["decision"])}<br><strong>本次：{esc(a["after"])}</strong></td><td>{esc(a["remaining"] or "本条步骤无新增执行缺口。")}<br>{esc(a["evidence"])}</td></tr>')
report.append('</table></div></section>')
report.append(f'<section><h2>规范差异与修改清单</h2><p>7项明确规范差异、3项可用性建议、1项口径修订；{summary["checklistKinds"].get("执行条件待补",0)}条整条受阻及{summary["checklistKinds"].get("部分步骤待补",0)}条失败用例的剩余子步骤缺口分别保留。异常样例和范围决策不能直接当成实现缺陷。</p><table><tr><th>编号/类型</th><th>对象与实际情况</th><th>依据及建议</th><th>验收标准</th></tr>')
for x in (item for item in checklist if item['kind'] not in ['执行条件待补','部分步骤待补']):
    report.append(f"<tr><td>{esc(x['id'])}<br>{esc(x['kind'])}<br>{esc(x['level'])}</td><td>{esc(x['object'])}<br>{esc(x['actual'])}</td><td>{esc(x['spec'])}<br>{esc(x['recommend'])}</td><td>{esc(x['accept'])}<br>用例：{esc(x['cases'])}<br>证据：{esc(x['evidence'])}</td></tr>")
report.append('</table></section><section><h2>规范与现场对照</h2><p>相同1440×900视口。规范附件包含组件及布局图，并非本页整页封板设计稿。视觉参考与实际样例分开标识。</p><div class="proof">')
for id in ['R001','E054','R002','E091','R010','E073']:
    report.append(f'<figure><figcaption>{esc(id)} {esc(capmap[id]["label"])}</figcaption><a href="{imgurl(id)}"><img loading="lazy" src="{imgurl(id)}"></a></figure>')
report.append('</div></section><h2>40条逐步实际结果</h2><label>筛选状态 <select id="filter"><option value="">全部</option><option>通过</option><option>不通过</option><option>受阻</option></select></label>')
for c in joined:
    cls={'通过':'good','不通过':'bad','受阻':'blocked'}[c['status']]
    report.append(f'<details id="{esc(c["id"])}" class="case" data-status="{esc(c["status"])}"><summary><span class="{cls}">{esc(c["status"])}</span>　{esc(c["id"])}　{esc(c["title"])}</summary><p class="meta">{esc(c["module"])} · 原页面执行 {esc(local(c["recordedAt"]))} · 规范复核 {esc(local(audit["checkedAt"]))}</p><p>依据：{esc(c["audit"]["source"])}<br>复核：{esc(c["audit"]["decision"])}</p><h3>当前前置条件与限制</h3><pre>{esc(c["precondition"])}</pre><p>{esc(c["reason"])}</p><table><tr><th>步骤</th><th>当前操作与预期</th><th>原实测结果及复核</th><th>子步骤结果</th></tr>')
    for i,s in enumerate(c['steps']):
        report.append(f'<tr><td>{i+1}</td><td>{esc(c["originalSteps"][i])}<br><strong>预期：</strong>{esc(c["originalExpected"][i])}</td><td>{esc(s["actual"])}</td><td>{esc(s["verdict"])}</td></tr>')
    report.append('</table><h3>截图及相关量测</h3><div class="proof">')
    for id in c['evidence']:
        report.append(f'<figure><figcaption>{esc(id)} {esc(capmap[id]["label"])}</figcaption><a href="{imgurl(id)}"><img loading="lazy" src="{imgurl(id)}"></a><div class="meta">{esc(local(capmap[id]["capturedAt"]))}<br>{esc(capmap[id]["url"])}</div></figure>')
    report.append('</div>')
    related=[p for p in ev.glob('*.json') if any(p.name.startswith(id+'-') for id in c['evidence'])]
    report.append('<p>'+ '　'.join(f'<a href="evidence/template-execution-20261013/{esc(p.name)}">{esc(p.name)}</a>' for p in related)+'</p></details>')
report.append('<section><h2>证据索引与复测要求</h2><p>沿用92张应用截图、10张规范参考截图，未新增页面执行。E078/E079为多标签页视口设置的无效Mobile尝试，保留说明但未用于Mobile结论；正确Mobile证据为E080/E081。短暂过渡状态只以当时DOM记录为界。</p><p><a href="evidence/template-execution-20261013/capture-index.json">截图索引</a>　<a href="evidence/template-execution-20261013/case-results.json">逐步执行记录</a>　<a href="evidence/template-execution-20261013/execution-summary.json">当前统计及历史环境</a></p><p>复测条件见上方逐条缺口：Tabs与多级菜单、slow/timeout/offline/500、提交/初始化403、长文极值及末页、首次与清空空态、Modal长内容/加载/失败、同文件上传重试成功、Mobile本期决策、首错/草稿/跨页选择策略。已有明确规范数值无需另等批准。修改清单尚未实施，真实业务功能留给原安排的测试。</p></section><script>document.getElementById("filter").addEventListener("change",e=>document.querySelectorAll(".case").forEach(x=>x.hidden=!!e.target.value&&x.dataset.status!==e.target.value));document.querySelectorAll(".case-link").forEach(b=>b.addEventListener("click",()=>{document.getElementById("filter").value="";document.querySelectorAll(".case").forEach(x=>x.hidden=false);const target=document.getElementById(b.dataset.caseId);target.open=true;target.scrollIntoView({block:"start"});}));</script></main></html>')
reportpath=base/'SN318_通用模板40条_UI交互实测报告_20261013.html'
reportpath.write_text(''.join(report),'utf-8')
print(json.dumps({'summary':summary,'report':str(reportpath),'checklistRows':len(checklist)},ensure_ascii=False,indent=2))
