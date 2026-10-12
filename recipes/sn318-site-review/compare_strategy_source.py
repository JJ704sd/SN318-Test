import json
from pathlib import Path
root=Path('./recipes/sn318-site-review')
def read(name):return {r['record_id']:r for r in [json.loads(l) for l in (root/name).read_text(encoding='utf-8-sig').splitlines()]}
old=read('ui-color-recheck.ndjson');new=read('ui-strategy-live.ndjson')
changes=[{'record':rid,'fields':{k:{'before':old[rid].get(k),'now':r.get(k)} for k in r if r.get(k)!=old.get(rid,{}).get(k)}} for rid,r in new.items() if r!=old.get(rid)]
(root/'strategy-source-changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(changes,ensure_ascii=False))
