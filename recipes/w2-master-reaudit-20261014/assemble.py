import json,copy,re,hashlib,html
from pathlib import Path
from collections import Counter
from datetime import datetime,timezone,timedelta

ROOT=Path('.');WORK=ROOT/'.work/w2-master-reaudit-20261014';OUT=ROOT/'outputs/ui-audit-20261014/20261014-master-data-reaudit'
inputs=json.loads((WORK/'inputs.json').read_text(encoding='utf-8'));env=inputs['environment']
RUN='W2-master-20261014-fd786de-'+env['worktree_fingerprint'][:8]
DEST=OUT/f'SN318_W2_主数据用例复核_20261014_dev_fd786de_dirty-{env["worktree_fingerprint"][:8]}.xlsx'
def evidence(id):return json.loads((OUT/'evidence'/(id+'.json')).read_text(encoding='utf-8'))['metrics']
cases=[]
selected={c['id']:c for c in inputs['cases']}
def make(id,steps):
 c=copy.deepcopy(selected[id]);c['steps']=steps;c['url']=steps[0].get('url','http://127.0.0.1:5173/system-config/master-data')
 results=[s['result'] for s in steps];c['result']='不通过' if '不通过' in results else '受阻' if '受阻' in results else '通过'
 c['manual_review']='';cases.append(c);return c
def step(result,actual,ids,needed='',url=''):
 return {'result':result,'actual':actual,'evidence_ids':ids,'needed':needed,'url':url}
prefixes={1:'M01-country-baseline',**{i:f'R{i+2}-loaded' for i in range(2,19)}}
normalized=[]
for n in range(1,21):
 id=f'UI-M1-{n:03}'
 if n==1:base,empty,reset='M01-country-baseline','M02-country-empty','M03-country-reset'
 elif n<19:base,empty,reset=[f'R{n+2}-{s}' for s in ['loaded','empty','reset']]
 else:base,empty,reset=[f'S{n}-relation-{s}' for s in ['loaded','empty','reset']]
 b,e,r=map(evidence,[base,empty,reset]);keyword='NO_UI_20261014_RECHECK'
 assert any(i['value']==keyword for i in e['inputs']),id
 empty_rows=[x for x in e['rows'] if '暂无' in x or '未找到' in x]
 assert empty_rows,id
 assert b['rows']==r['rows'],(id,'reset not equal')
 if n<19:assert len(e['rows'])==1,id
 normalized.append({'case_id':id,'url':b['url'],'empty':empty_rows,'restored':True,'evidence':[base,empty,reset]})
 make(id,[
  step('通过',f'查询词{keyword}保留，当前列表/子表完成态为0条。',[empty],url=e['url']),
  step('不通过',f'筛选无结果显示“{empty_rows[0]}”，没有“未找到相关结果/请调整筛选条件”的说明及清空筛选引导；工具栏重置仍可用。',[empty]),
  step('通过','点击重置后输入清空，原对象及原列表/子表记录恢复；当前证据中基线与恢复行内容一致。',[base,reset])])
(OUT/'list-checks.json').write_text(json.dumps(normalized,ensure_ascii=False,indent=2),encoding='utf-8')

make('UI-M1-021',[
 step('通过','FREIGHT编码控件存在且disabled；名称运费可编辑。',['F01-fee-edit']),
 step('通过','名称改为UI临时修改_取消验证后点击取消，FREIGHT仍显示运费，没有提交临时名称。',['F02-fee-edit-unsaved','F03-fee-edit-cancel'])])
make('UI-M1-022',[
 step('通过','空表单保存后费用项编码、名称、分组编码、默认币种分别有字段下必填提示，表单保持打开。',['F05-fee-empty-submit']),
 step('通过','提交重复FREIGHT后捕获“记录已存在，请检查编码或关联对象”；各输入保留，保存按钮恢复可用，取消后列表仍3条。只判本条要求的明确重复反馈，不等同于字段错误映射通过。',['F06-fee-duplicate-ready','F07-fee-duplicate-result','F08-fee-create-cancel'])])
make('UI-M1-023',[step('通过','实际控件名称为“请输入ISO 4217 编码”，存在且disabled，当前CNY不可编辑；本条仅判编码只读。',['C01-currency-edit'])])
make('UI-M1-024',[step('通过','已生效USD/CNY的源币种、目标币种、倍率7.1234、生效日2026-10-01均disabled；通过日历将结束日临时改为2026-10-30后取消，原结束日2026-10-31保留；当前无普通删除按钮。仅按原用例明确的M1呈现判定，D02产品规则裁决仍保留。',['C04-rate-edit','C05-rate-end-unsaved','C06-rate-cancel'])])
make('UI-M1-025',[
 step('不通过','查询按钮32px高、圆角2px，预期8px。',['C03-rate-visual']),
 step('不通过','正文#1A2130；ratio 7.1234的实际内层为left，操作内层居中、间距4px。预期正文#4B5564、数字右对齐、操作左对齐。',['C03-rate-visual','C03-rate-metrics']),
 step('通过','实际表格卡片.by-card--default为圆角12px、padding24px；量测真实卡片祖先，未用表格容器8px替代。',['C09-cards-and-tabs'])])

make('UI-W2-50-1',[
 step('通过','主分类计价底座、费用项子类和费用项对象层级可识别，与RV01页头主Tab/子项/列表新增的通用分层建议一致。',['R18-loaded','C09-cards-and-tabs']),
 step('通过','编码/名称清楚，当前列表有新增费用项按钮，打开的是新增费用项表单。',['R18-loaded','F04-fee-create']),
 step('受阻','已打开表单并取消回费用项；现有字段仍为分组编码及默认币种文本。本周产品PRD与M1字段映射、必填/选择控件采纳口径未取得，不能以能打开表单代替批准稿符合性。',['F04-fee-create','F08-fee-create-cancel'],'产品确认费用类型、分组、默认币种字段映射及采纳设计；对应D01。')])
make('UI-W2-50-2',[
 step('受阻','当前新增入口可达，但原前置要求的编码上限L未明确，不能自定L再测试L-1/L/L+1。',['F04-fee-create'],'PRD明确编码长度L及边界判据。'),
 step('不通过','重复FREIGHT只出现全局Toast“记录已存在，请检查编码或关联对象”，编码字段下没有对应重复错误，未满足本用例“提示关联编码字段”的预期；其他输入保留。',['F07-fee-duplicate-result']),
 step('受阻','尚无不同于重复编码的可控保存失败响应；未制造新持久化记录来替代失败样例，字段错误纠正后的新失败链路未执行。',['F07-fee-duplicate-result'],'非重复编码的可控保存失败响应及恢复样例。')])
make('UI-W2-51-1',[
 step('通过','币种视图的编码、名称和状态可识别，子对象币种与列表工具栏一致。',['R19-loaded','C07-switch-currency']),
 step('不通过','汇率视图源币种/目标币种、直接倍率及生效日/结束日可识别，但7.1234实际内层左对齐，违反本步骤数值右对齐要求。',['C03-rate-metrics','C08-switch-rate']),
 step('通过','从汇率切币种再切汇率，币种4条、汇率3条及各自字段/新增按钮与所选对象一致，未残留另一视图工具栏。',['C07-switch-currency','C08-switch-rate'])])
make('UI-W2-51-2',[
 step('受阻','当前3条倍率为7.1234/7.8123/0.9123；没有0和空倍率专项记录。',['R20-loaded'],'批准的空/零显示口径及0、空样例。'),
 step('受阻','当前没有极小、极大及超精度样例；产品精度及版本维护冲突仍待D02裁决，不能用普通4位倍率替代专项。',['R20-loaded'],'批准显示精度及极值/超精度样例。'),
 step('受阻','当前为USD/EUR/HKD到CNY，未取得长币种名称样例；未将短编码样例的可读性当成本步骤通过。',['R20-loaded'],'长币种名及全文读取样例。')])
make('UI-W2-56-1',[
 step('通过','通过主数据下的业务字典入口切换，当前监管方式位于字典子对象中；主/子分类分层符合已读取RV01通用建议。',['R17-loaded','D01-dictionary-create']),
 step('通过','监管方式标题/列表字段及新增监管方式按钮可识别，属于当前字典对象。',['R17-loaded','D01-dictionary-create']),
 step('受阻','点击新增监管方式再取消后仍回原监管方式对象。已完成当前M1普通UI步骤，但原前置的本周业务字典PRD/专项分类采纳稿及范围未核实，整条未据此判通过。',['D01-dictionary-create','D02-dictionary-cancel'],'补业务字典PRD映射及专项分类采纳稿；不阻塞已明确普通UI步骤。')])
make('UI-W2-56-2',[
 step('受阻','当前字典子对象5项；未取得长类别名及超过7项同级分类样例。',['R13-loaded','R17-loaded'],'批准的>7项/长类别替代承载设计及样例。'),
 step('受阻','当前5项都能分别选择并恢复列表，但不代替原用例首末项搜索/长类别样例切换。',['R13-reset','R17-reset'],'专项类别样例。'),
 step('受阻','本轮未在专项替代承载样例执行Tab/方向键/Home/End，未用DOM存在代替可访问性实测。',['D02-dictionary-cancel'],'专项承载样例及批准键盘/ARIA判据。')])

counts=Counter(c['result'] for c in cases);assert len(cases)==31 and len({c['id'] for c in cases})==31
related={c['row']:c for c in cases};values=[['复核状态（fd786de 主数据轮次）','复核实际/证据（保留原H-M）','本轮Build与范围','相对上一轮的变化']]
for row in range(2,103):
 if row in related:
  c=related[row];actual='\n'.join(f'[{i}]【{s["result"]}】{s["actual"]}'+(f'\n缺条件：{s["needed"]}' if s['needed'] else '')+'\n证据：'+', '.join(s['evidence_ids']) for i,s in enumerate(c['steps'],1))
  values.append([c['result'],actual,RUN+'\n1440×900 / 100% / demo / dev Mock',f'{c["previous_result"]} → {c["result"]}；只比较记录轮次，不当作源码修复证明。'])
 else:values.append(['未执行','本轮聚焦主数据相关31条；本条未复核，K-M旧轮次记录保留。',RUN+'\n本轮未涉及','未重跑；不产生新通过/失败结论。'])
blocks=[{'sheet':'业务UI与交互用例','range':'N1:Q102','values':values,'header':'N1:Q1','widths':{'N':19,'O':82,'P':35,'Q':43}}]
issue_rows=[]
for row in range(36,52):
 id=inputs['old_sheet_values']['修改清单'].get('A'+str(row),'')
 if id in ['W2-R01','W2-R03','W2-R04','W2-R09','W2-R11']:
  actual={'W2-R01':'主数据查询按钮仍2px；模板范围未复测。证据C03-rate-visual。','W2-R03':'主数据操作仍居中、gap4px；模板范围未复测。证据C03-rate-visual。','W2-R04':'主数据普通正文仍#1A2130；模板范围未复测。证据C03-rate-metrics。','W2-R09':'18列表+2子表无结果仍暂无××数据，重置恢复已验证。见UI-M1-001至020。','W2-R11':'汇率7.1234实际内层仍左对齐。证据C03-rate-metrics。'}[id]
  issue_rows.append(['复测不通过（主数据范围）',actual,RUN,'仅主数据；不代测模板或其他业务页。'])
 elif id in ['W2-D01','W2-D02','W2-D03']:
  actual={'W2-D01':'费用项仍分组编码/默认币种文本，产品PRD与M1映射待裁决。F04/F07。','W2-D02':'M1只读/结束区间可调/无删除已验证，但产品版本/删除/审批裁决未完成。C04-C06。','W2-D03':'本地仍启用Mock，界面仍写“选择对象查看正式数据”。R18-loaded。'}[id]
  issue_rows.append(['待裁决/确认',actual,RUN,'保留待确认性质，不改成业务验收通过。'])
 elif id=='W2-G02':issue_rows.append(['本轮相关缺口仍受阻','专项分类长文/>7项及键盘路径、极值数据等仍缺；已可执行普通UI步骤分别取证。',RUN,'按31条逐步骤记录，不把所有缺口归于开发。'])
 else:issue_rows.append(['本轮未复核','本轮没有重跑该问题对应页面或异常分支；原整改/复测状态保留。',RUN,'未取得新的关闭证据。'])
blocks.append({'sheet':'修改清单','range':'P35:S51','values':[['复核状态（主数据轮次）','复核表现/证据','本轮Build','覆盖限制']]+issue_rows,'header':'P35:S35','widths':{'P':30,'Q':82,'R':38,'S':43}})
new_issue=[['本轮新增问题','类型','等级','页面/对象','依据','实际差异','复现步骤','修改建议','验收标准','关联用例','证据','状态','缺条件','负责人','基线'],['W2-MR01','已证实交互差异','P2','费用项新增重复编码','原UI-W2-50-2步骤2；规范5.7/7.3','只弹全局重复Toast，编码字段未显示关联错误','FREIGHT+有效名称/分组/币种保存','将编码唯一性错误映射到编码字段下，保留其他输入','重复FREIGHT时编码字段下定位重复原因；输入保留、保存解锁','UI-W2-50-2；UI-M1-022仅要求明确反馈，已通过','F07-fee-duplicate-result','待修改/未复测','编码上限L与其他失败样例另列受阻','待确认',RUN]]
blocks.append({'sheet':'修改清单','range':'A54:O55','values':new_issue,'header':'A54:O54'})
summary=[['最新主数据复核','结果/统计','基线/定位','本轮范围与限制'],['运行基线',RUN,'dev / '+env['commit'],'dirty '+env['worktree_fingerprint']],['本轮复核数','', '业务N2:N102','18列表+2关联子表+5定向补测+6原业务候选，共31条'],['通过','', 'COUNTIFS按本轮N列','只限本地Mock及记录的步骤'],['不通过','', 'COUNTIFS按本轮N列','20个空态失败共用R09；用例数不等于独立缺陷数'],['受阻','', 'COUNTIFS按本轮N列','缺产品字段/分类映射、编码L、极值/长文及专项策略样例'],['本轮未复核','', 'COUNTIFS按本轮N列','70条其他业务候选保留旧轮次，未产生新判定'],['业务记录总数','', '本轮状态分类总和','101条业务记录；不要和40条模板历史混加'],['关键变化','UI-M1-022 受阻→通过','F05-F08本轮证据','本次捕获明确重复错误、输入保留与保存按钮恢复；不是据源码推定修复'],['模板与人工','模板40条未重跑；人工J2/J3原样保留','原H-M、用例与旧清单保留','模型复核追加到N-Q；人工栏不代填'],['工作包覆盖','W2-50/51/56仅相关UI步骤复核','当前仅主数据URL范围','其他业务工作包未复核；不沿用旧缺入口结论作为新项目现状'],['规范来源','沿用10/14已取得V1.2/Review快照','正文rev5256，表rev3138，Review rev680','本轮未刷新云端规范；在sources保留对应快照及时间'],['操作边界','取消临时编辑；重复提交失败未新增记录','dev Mock，不覆盖真实接口/权限/持久化','仓库改动与基线指纹另做前后核对']]
blocks.append({'sheet':'范围与依据','range':'A236:D248','values':summary,'header':'A236:D236'})
formulas=[{'sheet':'范围与依据','cell':'B238','formula':'=SUM(B239:B241)','expected':31},{'sheet':'范围与依据','cell':'B239','formula':'=COUNTIFS(\'业务UI与交互用例\'!N2:N102,"通过")','expected':counts['通过']},{'sheet':'范围与依据','cell':'B240','formula':'=COUNTIFS(\'业务UI与交互用例\'!N2:N102,"不通过")','expected':counts['不通过']},{'sheet':'范围与依据','cell':'B241','formula':'=COUNTIFS(\'业务UI与交互用例\'!N2:N102,"受阻")','expected':counts['受阻']},{'sheet':'范围与依据','cell':'B242','formula':'=COUNTIFS(\'业务UI与交互用例\'!N2:N102,"未执行")','expected':70},{'sheet':'范围与依据','cell':'B243','formula':'=SUM(B239:B242)','expected':101}]
record={'run_id':RUN,'phase':'execution','environment':env,'ended_at':datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds'),'scope':'主数据31条复核；模板及70条其他业务未重跑','counts':dict(counts),'cases':cases,'source_workbook':inputs['source_workbook'],'source_sha256':inputs['source_sha256'],'delivery_workbook':str(DEST),'manual_values_preserved':inputs['manual_values'],'source_mode':'10/14 earlier normative snapshot reused','new_issue_ids':['W2-MR01']}
(OUT/'复核记录.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
(WORK/'workbook-plan.json').write_text(json.dumps({'source':str(OUT/'sources/执行基线原件.xlsx'),'destination':str(DEST),'blocks':blocks,'formulas':formulas,'record':str(OUT/'复核记录.json')},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'counts':dict(counts),'case_count':31,'destination':str(DEST),'changes':[(c['id'],c['previous_result'],c['result']) for c in cases if c['previous_result']!=c['result']]},ensure_ascii=False))
