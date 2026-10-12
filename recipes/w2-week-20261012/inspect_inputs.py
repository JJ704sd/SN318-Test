import json
from pathlib import Path
import openpyxl

work = Path(__file__).parent
source = Path('./artifacts/smoke-ui/SN318_冒烟与UI用例_飞书五色及实际页面复核.xlsx')
w = openpyxl.load_workbook(source)
review = [json.loads(x) for x in (work/'review-live.ndjson').read_text(encoding='utf-8-sig').splitlines()]
ui = []
for r in list(w['UI检查'].values)[5:]:
    ui.append(dict(id=r[0],module=r[1],point=r[2],steps=r[9],expected=r[10],source=r[11],priority=r[15],state=r[16],color=r[17],reviewId=r[27]))
old_ids = {r['reviewId'] for r in ui if r['reviewId']}
print('UI mappings',[(r['id'],r['point'],r['reviewId']) for r in ui])
print('New Review', [{k:v for k,v in r.items() if k not in ['截图','框架/规范依据/设计稿截图']} for r in review if r['record_id'] not in old_ids])
print('METADATA',[(s.title,c.coordinate,c.value) for s in w for row in s for c in row if c.data_type!='f' and isinstance(c.value,str) and ('642' in c.value or '21条' in c.value or '21 条' in c.value or 'revision' in c.value)])
print('DEV',[(r[0],r[1],r[2],r[5]) for r in list(w['开发冒烟'].values)[6:]])
print('Color map',list(w['网站详情对照'].values)[18:])
(work/'baseline-read.json').write_text(json.dumps({'path':str(source),'ui':ui,'functional':[{ 'id':r[0],'module':r[1],'point':r[2],'steps':r[9],'expected':r[10],'source':r[11]} for r in list(w['冒烟用例'].values)[5:]],'dev': [list(r) for r in list(w['开发冒烟'].values)[6:]],'sheets':list(w.sheetnames)},ensure_ascii=False,indent=2),encoding='utf-8')
