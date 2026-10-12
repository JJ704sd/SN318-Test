from pathlib import Path
from collections import Counter
import json

WORK=Path('./recipes/ui-spec-audit-20261012')
records=[json.loads(s) for s in (WORK/'review-records.ndjson').read_text('utf-8-sig').splitlines() if s.strip()]
manifest=json.loads((WORK/'review-records.manifest.json').read_text('utf-8-sig'))
assert len(records)==manifest['records_count'] and not manifest['has_more']
summary=[]
for n,r in enumerate(records,1):
    rid=f'RV{n:02d}'
    print(json.dumps({'ref':rid, **{k:v for k,v in r.items() if k not in ['截图','框架/规范依据/设计稿截图','备注']}},ensure_ascii=False))
    summary.append({'ref':rid,'record':r})
(WORK/'review-source.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),'utf-8')
print('Adaptation counts:',dict(Counter(v for r in records for v in r['框架适配判断'])))
print('Status counts:',dict(Counter(v for r in records for v in r['确认状态'])))
fields=json.loads((WORK/'fields.json').read_text('utf-8-sig'))['data']['fields']
print('Fields:',[f['name'] for f in fields])

norm_path=Path('./recipes/ui-actual-audit/ui-norm-live.json')
norm=json.loads(norm_path.read_text('utf-8-sig'))
print('Norm top-level keys:',list(norm))
print('Norm metadata:',{k:v for k,v in norm.get('data',{}).items() if k!='document'})
