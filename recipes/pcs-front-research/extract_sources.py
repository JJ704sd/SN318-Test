from pathlib import Path
from html.parser import HTMLParser
import json
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path('.')
OUT = ROOT / '.work/pcs-front-research'
OUT.mkdir(parents=True, exist_ok=True)

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1
        if tag in ('p', 'h1', 'h2', 'h3', 'tr', 'summary', 'section'):
            self.parts.append('\n')
    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

report = json.loads((ROOT / '.work/ui-actual-audit/report-data.json').read_text('utf-8-sig'))
print('Report keys:', list(report))
for key, val in report.items():
    print(key, len(val) if isinstance(val, (dict, list)) else str(val)[:200])
for item in report.get('findings', []):
    print(json.dumps({k: item.get(k) for k in ('id','kind','priority','title','actual','fix','evidenceIds')}, ensure_ascii=False))

observations = json.loads((ROOT / '.work/sn318-site-review/site_observations.json').read_text('utf-8-sig'))
parser = TextParser()
html_file = ROOT / 'outputs/ui-audit/SN318_基础配置UI走查_图文报告.html'
parser.feed(html_file.read_text('utf-8-sig'))
(OUT / 'historical-report-text.txt').write_text(''.join(parser.parts), 'utf-8')
(OUT / 'baseline.json').write_text(json.dumps({'report':report,'observations':observations}, ensure_ascii=False, indent=2), 'utf-8')

ns = {'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
book = ROOT / 'outputs/ui-audit/SN318_基础配置前端UI走查_修改清单及截图证据.xlsx'
with zipfile.ZipFile(book) as z:
    strings=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', ns):
            strings.append(''.join(t.text or '' for t in si.findall('.//m:t', ns)))
    relationships = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    targets={r.attrib['Id']:r.attrib['Target'] for r in relationships}
    sheets=[]
    for sh in ET.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',ns):
        target=targets[sh.attrib['{'+ns['r']+'}id']]
        target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
        rows=[]
        for row in ET.fromstring(z.read(target)).findall('m:sheetData/m:row',ns):
            values=[]
            for cell in row.findall('m:c',ns):
                val=cell.find('m:v',ns)
                val=val.text if val is not None else ''
                if cell.attrib.get('t')=='s':
                    val=strings[int(val)]
                elif cell.attrib.get('t')=='inlineStr':
                    val=''.join(t.text or '' for t in cell.findall('.//m:t',ns))
                if val:
                    values.append({'cell':cell.attrib['r'],'value':val})
            if values:
                rows.append(values)
        sheets.append({'name':sh.attrib['name'],'rows':rows})
        print('Workbook sheet:',sh.attrib['name'],'nonempty rows:',len(rows),'first row:',json.dumps(rows[0] if rows else [],ensure_ascii=False))
    (OUT / 'workbook-extract.json').write_text(json.dumps(sheets, ensure_ascii=False, indent=2),'utf-8')
