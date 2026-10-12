import base64
import collections
import hashlib
import json
import zipfile
from html.parser import HTMLParser
from pathlib import Path

import openpyxl

work = Path(__file__).parent
data = json.loads((work / 'report-data.json').read_text(encoding='utf-8'))
paths = json.loads((work / 'report-verification.json').read_text(encoding='utf-8'))
xlsx, html = Path(paths['xlsxPath']), Path(paths['htmlPath'])
with zipfile.ZipFile(xlsx) as z:
    assert z.testzip() is None
wb = openpyxl.load_workbook(xlsx, data_only=True)
assert wb.sheetnames == ['修改清单','W2审查范围','Review与依据','截图证据']
assert [wb['修改清单'][c].value for c in ['B4','D4','F4','H4','J4']] == [4,7,38,3,35]
assert len(wb['截图证据']._images) == 22
assert not [(s.title,c.coordinate) for s in wb for row in s for c in row if c.data_type == 'e']
assert all(wb['修改清单'][f'P{r}'].value == '未执行' and wb['修改清单'][f'Q{r}'].value is None for r in range(6,18))
assert {wb['W2审查范围'][f'A{r}'].value for r in range(6,44)} == {int(p['seq']) for p in data['scope']}
assert collections.Counter(wb['W2审查范围'][f'H{r}'].value for r in range(6,44)) == {'部分已走查':3,'未获得入口':35}
assert {wb['Review与依据'][f'B{r}'].value for r in range(6,30)} == {r[1] for r in data['reviews']}
assert [wb['Review与依据'][f'F{r}'].value for r in range(6,30)] == [r[5] for r in data['reviews']]
assert wb['截图证据']['C6'].value.year == 2026
source = json.loads(Path('./recipes/ui-actual-audit/source-hash.json').read_text(encoding='utf-8'))
assert hashlib.sha256(Path(source['path']).read_bytes()).hexdigest() == source['sha256']
metrics = {m['id']:m for m in json.loads((work/'metrics.json').read_text(encoding='utf-8'))}
assert metrics['M01-fee-list']['actions'][0] == {'gap':'4px','align':'center'}
for key,idx in [('M03-currency-list',3),('M05-rate-list',2)]:
    assert all(r['cells'][idx]['inners'][0]['align'] == 'left' for r in metrics[key]['tableRows'])
for key in ['M02-fee-form','M04-currency-form','M06-rate-form','M07-airline-form']:
    assert all(i['id']=='' and i['labels']==0 and i['ariaLabel'] is None and i['ariaLabelledby'] is None for f in metrics[key]['formItems'] for i in f['inputs'])

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids,self.links,self.images=[],[],[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='a' and a.get('href','').startswith('#'):self.links.append(a['href'][1:])
        if tag=='img':self.images.append(a['src'])

text = html.read_text(encoding='utf-8')
p=Parser();p.feed(text)
assert len(p.ids)==len(set(p.ids))
assert set(p.links)<=set(p.ids)
assert len(p.images)==22
for e,src in zip(data['evidence'],p.images):
    assert src.startswith(f"data:{e['mime']};base64,")
    assert base64.b64decode(src.split(',',1)[1])==Path(e['path']).read_bytes()
assert '35项未获得入口' in text and '3项部分走查' in text
assert '不等于页面未实现' in text
assert '排期表02-阶段共识第13项' in text
result={'workbookIntegrity':'verified','scopePackages':38,'partialPackages':3,'noEntryPackages':35,'measuredIssues':4,'designPending':7,'accessItems':1,'embeddedScreenshots':22,'reviewRecords':24,'htmlImageByteMatches':22,'brokenHtmlAnchors':0,'sourceWorkbookUnchanged':True,'retest':'all unexecuted','htmlBrowserPreview':'blocked by URL protocol policy; static validation completed','xlsxBytes':xlsx.stat().st_size,'htmlBytes':html.stat().st_size}
(work/'final-integrity-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
