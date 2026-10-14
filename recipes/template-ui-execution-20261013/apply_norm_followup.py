import json, shutil, hashlib
from pathlib import Path
from datetime import datetime,timezone
work=Path(__file__).parent
ev=Path('./artifacts/weekly-ui/evidence/template-execution-20261013')
ledger=ev/'case-results.json'
shutil.copy2(ledger,work/'case-results-before-norm-followup.json')
runs=json.loads(ledger.read_text('utf8'));r={x['id']:x for x in runs}
c=r['UI-TPL-022'];c['status']='不通过';c['steps'][0].update(actual='1024×768实际双列，控件宽约294–306px。规范4.5.2内嵌表oppJwY的Tablet表单要求单列，布局不符合；无需另等专项批准稿。',verdict='不通过');c['reason']='规范4.5.2已有Tablet单列判据；基于原E038–E040重新判定。错误提示及底栏可达性通过。';c['issues']=['M08']
c=r['UI-TPL-037'];c['status']='不通过';c['steps'][0].update(actual='1279与1280列表/表单已取证。1279属于Tablet，但表单仍双列，违反oppJwY单列要求。主操作和固定列可达、根级无横向溢出。',verdict='不通过');c['steps'][1].update(actual='768属于Tablet，表单实际仍双列，违反单列要求；底部按钮和备注可达，列表详情可打开返回。长文本专项仍缺样例。',verdict='不通过');c['reason']='Tablet单列表单已有通用规范判据；1279和768实测双列，判不通过。Mobile范围及长文本样例仍需补齐。';c['issues']=['M08']
c=r['UI-TPL-032'];c['steps'][3]['actual']='加载左侧Spin保留文字；Text默认46px/loading64px，规范附件同样会因Spin增宽。“宽度不变/不抖动”是旧用例自加要求，规范未要求该尺寸固定，已修订预期。缺少加载结束及动作计数样例，本步仍受阻。';c['reason']='需稳定active取证和loading到完成的受控样例。Text宽度变化不判为规范冲突或实现缺陷。';c['issues']=['R07']
c=r['UI-TPL-031'];c['steps'][1]['actual']+='另确认Tablet双列表单违反规范4.5.2单列要求。';c['steps'][2]['actual']=c['steps'][2]['actual'].replace('Text loading宽度规范图也增大，作为图文冲突待确认。','Text loading宽度规范图也增大，原用例附加的固定宽度口径已修订。');c['issues'].append('M08')
now=datetime.now(timezone.utc).isoformat()
for id in ['UI-TPL-022','UI-TPL-037','UI-TPL-032','UI-TPL-031']:r[id]['normReassessedAt']=now
ledger.write_text(json.dumps(runs,ensure_ascii=False,indent=2),'utf8')
for name in ['norm-followup-oppJwY.json','norm-followup-UXf6DG.json','norm-followup-NLQci9.json']:
    data=json.loads((work/name).read_text('utf8'));assert not data.get('has_more');assert all(not x.get('truncated') for x in data['ranges']);assert data['revision']==3138
    shutil.copy2(work/name,ev/name)
doc=json.loads((work/'norm-followup-live.json').read_text('utf-8-sig'))['data']['document']
brief={'checkedAt':now,'normUrl':'https://example.invalid/source/d247592562','title':'AI 与数字化中心-通用设计规范 V1.2','bodyRevision':doc['revision_id'],'tableRevision':3138,'bodySha256':hashlib.sha256(doc['content'].encode()).hexdigest(),'bodyMatchesExecutedSnapshot':True,'sourceCell':'oppJwY!C3','rule':'Tablet表单布局为单列','reclassifiedCases':['UI-TPL-022','UI-TPL-037'],'newModification':'M08','caseCounts':{'通过':12,'不通过':8,'受阻':20},'basis':'原保存截图和DOM量测重新判定；本次没有新增页面操作或应用代码改动。','case32Correction':'删除无明确规范依据的加载态宽度不变要求；保留Spin、原文字、禁点及结束恢复检查。'}
(ev/'norm-followup-review.json').write_text(json.dumps(brief,ensure_ascii=False,indent=2),'utf8')
print(json.dumps(brief,ensure_ascii=False,indent=2))
