from pathlib import Path
import collections
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(r'.')
data = json.loads((ROOT / '.work/weekly-local-20261013/data.json').read_text(encoding='utf-8-sig'))
scope = [r for r in data['scope'] if r['w2'] == 'UI/开']
print(json.dumps({'w2_count': len(scope), 'priorities': dict(collections.Counter(r['priority'] for r in scope)), 'groups': dict(collections.Counter(r['level1'] for r in scope)), 'scope_names': [r['feature'] for r in scope]}, ensure_ascii=False))
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
paths = [
    ROOT / 'outputs/template-reaudit/受阻16条核实/SN318_W2_UI与交互测试用例_16条受阻核实_含人工二次复核.xlsx',
    ROOT / 'outputs/weekly-ui/SN318_W2_UI与交互测试用例_按工单用例风格重写.xlsx',
]
for path in paths:
    with zipfile.ZipFile(path) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            strings = [''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        workbook = ET.fromstring(z.read('xl/workbook.xml'))
        rels = {x.attrib['Id']: x.attrib['Target'] for x in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        sheets = []
        for sheet in workbook.find('s:sheets', ns):
            target = rels[sheet.attrib['{'+ns['r']+'}id']]
            target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            rows = []
            for row in ET.fromstring(z.read(target)).findall('s:sheetData/s:row', ns):
                vals = {}
                for c in row:
                    v = c.find('s:v', ns)
                    value = v.text if v is not None else ''
                    if c.attrib.get('t') == 's':
                        value = strings[int(value)]
                    elif c.attrib.get('t') == 'inlineStr':
                        value = ''.join(c.find('s:is', ns).itertext())
                    vals[c.attrib['r']] = value
                rows.append(vals)
            statuses = collections.Counter(v for row in rows[1:] for k,v in row.items() if k.startswith('H') and v in {'通过', '不通过', '受阻', '未执行'})
            case_rows = [r for r in rows[1:] if any(re.search(r'UI-TPL-\d+', v or '') for v in r.values())] if '通用模板' in sheet.attrib['name'] else []
            sheets.append({'name': sheet.attrib['name'], 'rows': len(rows), 'headers': rows[:1], 'case_count': len(case_rows), 'statuses': dict(statuses), 'manual_cells_filled': [k for r in case_rows for k,v in r.items() if k.startswith('J') and v]})
        print(json.dumps({'file': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'sheets': sheets}, ensure_ascii=False))
