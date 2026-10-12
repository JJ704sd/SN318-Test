import json, re, difflib
from pathlib import Path
from html import unescape
from collections import Counter
import openpyxl

root = Path(__file__).parent
books = {p.stem:json.loads(p.read_text(encoding='utf-8-sig')) for p in root.glob('SN318*.json')}
latest = books['SN318_分批提测检查表_需求重核完善']
product = json.loads((root/'product-live.json').read_text(encoding='utf-8-sig'))
doc = product['data']['document']
content = doc['content']
text = re.sub(r'</(?:p|h[1-6]|tr|table)>', '\n', content)
text = re.sub(r'<img[^>]*>', '', text)
text = unescape(re.sub(r'<[^>]+>', '', text))
text = re.sub(r'\n\s*\n', '\n', text)
(root/'product-readable.txt').write_text(text,encoding='utf-8')
ui = [json.loads(l) for l in (root/'ui-live.ndjson').read_text(encoding='utf-8-sig').splitlines()]
case_map={r[27]:r for r in latest['UI检查'][5:] if r[27]}
print('PRD revision',doc.get('revision_id'),'UI rows',len(ui))
old=json.loads((root.parent/'sn318-research/product-requirements.json').read_text(encoding='utf-8-sig'))['data']['document']
norm=lambda s: re.sub(r'\s+',' ',re.sub(r' id="[^"]*"','',s))
a,b=norm(old['content']),norm(content)
print('PRD previous revision',old.get('revision_id'),'same normalized',a==b,'chars',len(a),len(b))
(root/'product-diff.txt').write_text('\n'.join(difflib.unified_diff(a.split('><'),b.split('><'),fromfile='previous',tofile='current',n=1)),encoding='utf-8')
for r in ui:
    old=case_map.get(r['record_id'])
    print(r['record_id'],r['页面/模块'],r['优先级'],r['确认状态'],r['框架适配判断'],'->',old[0] if old else 'NEW')
    if not old: print(json.dumps(r,ensure_ascii=False))
    elif old[16] != '、'.join(r['确认状态']): print('STATE CHANGE',old[16],r['确认状态'])
for name,data in books.items():
    print(name,[(k,len(v)-5) for k,v in data.items()])
    for s in ['冒烟用例','UI检查']:
        print(s,'results',Counter(r[6] for r in data[s][5:]),'applicability',Counter(r[3] for r in data[s][5:]))
for s in ['本批提测','需求对照']:
    (root/(s+'-readable.txt')).write_text('\n'.join(f'{i}: '+ ' | '.join(str(v or '') for v in r) for i,r in enumerate(latest[s],1)),encoding='utf-8')
for s in ['冒烟用例','UI检查']:
    (root/(s+'-readable.txt')).write_text('\n\n'.join(f'Row {i}: '+ ' | '.join(f'{latest[s][4][c]}={str(r[c] or "")}' for c in [0,1,2,4,9,10,11,15]+([16,17,22,27,28] if s=='UI检查' else [18])) for i,r in enumerate(latest[s][5:],6)),encoding='utf-8')
