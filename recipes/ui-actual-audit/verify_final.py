import base64
import hashlib
import json
import re
import zipfile
from html.parser import HTMLParser
from pathlib import Path

import openpyxl

work = Path(__file__).parent
data = json.loads((work / 'report-data.json').read_text(encoding='utf-8'))
paths = json.loads((work / 'report-verification.json').read_text(encoding='utf-8'))
source = json.loads((work / 'source-hash.json').read_text(encoding='utf-8'))
xlsx = Path(paths['xlsxPath'])
html = Path(paths['htmlPath'])
assert hashlib.sha256(Path(source['path']).read_bytes()).hexdigest() == source['sha256']
assert {f['id'] for f in data['findings']} == {f'FE{i:02}' for i in range(1, 8)} | {f'DQ{i:02}' for i in range(1, 6)}
assert {r[0] for r in data['coverage']} == {f'UI{i:02}' for i in range(1, 50)}
assert len(data['pages']) == 18
assert len(data['evidence']) == 48
with zipfile.ZipFile(xlsx) as z:
    assert z.testzip() is None
wb = openpyxl.load_workbook(xlsx, data_only=True)
assert wb.sheetnames == ['修改清单', '用例覆盖', '页面范围', '截图证据', '审查依据']
assert [wb['修改清单'][a].value for a in ['B4', 'D4', 'F4', 'H4']] == [7, 5, 18, 48]
assert len(wb['截图证据']._images) == 48
all_values = [str(c.value) for s in wb for row in s for c in row if c.value is not None]
assert not any(c.data_type == 'e' for s in wb for row in s for c in row)
assert not any('not implemented' in v for v in all_values)
assert all(wb['修改清单'][f'P{r}'].value == '未执行' for r in range(6, 18))
assert all(wb['修改清单'][f'Q{r}'].value is None for r in range(6, 18))
text = html.read_text(encoding='utf-8')
assert 'associatedLabels=0' in text
assert '但未切换关系页签留证' in text

class ReportParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.links, self.images = [], [], []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a' and attrs.get('href', '').startswith('#'):
            self.links.append(attrs['href'][1:])
        if tag == 'img':
            self.images.append(attrs['src'])

parser = ReportParser()
parser.feed(text)
assert len(parser.ids) == len(set(parser.ids))
assert set(parser.links) <= set(parser.ids)
assert len(parser.images) == 48
for e, uri in zip(data['evidence'], parser.images):
    assert re.match(r'^data:image/jpeg;base64,', uri)
    assert base64.b64decode(uri.split(',', 1)[1]) == Path(e['path']).read_bytes()
assert 'el.open=true' in text
result = {
    'sourceWorkbookUnchanged': True,
    'issueCount': 7,
    'pendingCount': 5,
    'originalCaseCoverageRows': 49,
    'listObjects': 18,
    'embeddedWorkbookImages': 48,
    'htmlOriginalImageMatches': 48,
    'brokenHtmlEvidenceAnchors': 0,
    'workbookErrorCells': 0,
    'retestFields': 'all unexecuted',
    'xlsxBytes': xlsx.stat().st_size,
    'htmlBytes': html.stat().st_size,
}
(work / 'final-integrity-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
