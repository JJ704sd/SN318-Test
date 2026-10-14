from pathlib import Path
import json
import re

out = Path(r'.\outputs\ui-audit-20261014\20261014-ui-audit')
sources=out/'sources'
def read(name): return json.loads((sources/name).read_text(encoding='utf-8-sig'))
table_revisions={}
tables=[]
for path in sorted(sources.glob('norm-*.json')):
    value=read(path.name)
    table_revisions[path.stem]=value.get('revision')
    tables.append('\n## '+path.stem+' revision '+str(value.get('revision')))
    for region in value.get('ranges',[]):
        assert not region.get('truncated')
        for row in region['cells']:
            tables.append(' | '.join(str(c.get('value','')) for c in row))
(sources/'norm-tables-readable.txt').write_text('\n'.join(tables),encoding='utf-8')
schedule=read('schedule-live.json')
rows=[[c.get('value','') for c in row] for row in schedule['ranges'][0]['cells']]
print(json.dumps({'schedule_revision':schedule['revision'],'schedule_headers':rows[:4],'norm_revisions':dict(sorted(table_revisions.items()))},ensure_ascii=False))
for name in ['product-prd-live.json','base-prd-live.json']:
    value=read(name)['data']['document']
    content=value['content']
    (sources/(name.replace('.json','-readable.md'))).write_text(content,encoding='utf-8')
    excerpts=[]
    lines=content.splitlines()
    for i,line in enumerate(lines):
        if re.search('^#{1,6} .*?(费用项|币种|汇率|字典|Zone|分区|操作日志)',line):
            excerpts.append('\n'.join(lines[max(0,i-2):i+32]))
    print(json.dumps({'doc':name,'revision':value['revision_id'],'excerpts':excerpts[:10]},ensure_ascii=False))
