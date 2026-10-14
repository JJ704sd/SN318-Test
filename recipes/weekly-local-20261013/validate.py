import json, zipfile, re, hashlib
from pathlib import Path
from xml.etree import ElementTree as ET
from html.parser import HTMLParser
from collections import Counter

W=Path(__file__).parent
O=Path('./artifacts/weekly-ui')
d=json.loads((W/'data.json').read_text('utf-8'))
p=O/'SN318_W2_UI与交互用例及修改清单.xlsx'
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
report={}
with zipfile.ZipFile(p) as z:
    assert z.testzip() is None
    ss=ET.fromstring(z.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in z.namelist() else None
    strings=[''.join(x.itertext()) for x in ss] if ss is not None else []
    names=[x.attrib['name'] for x in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',n)]
    assert names==['本周任务','模板检查','业务UI用例','修改与待决','规范检查','Review来源'],names
    counts=[62,30,76,13,16,24]
    values=[]
    sheetchecks=[]
    for i,name in enumerate(names,1):
        root=ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml'))
        cells={}
        for c in root.findall('.//s:sheetData/s:row/s:c',n):
            v=c.find('s:v',n)
            if c.get('t')=='s': val=strings[int(v.text)]
            elif c.get('t')=='inlineStr':val=''.join(c.find('s:is',n).itertext())
            else:val=v.text if v is not None else ''
            assert c.get('t')!='e',(name,c.attrib,val)
            cells[c.get('r')]=val
        records=[cells.get('A'+str(r),'') for r in range(9,9+counts[i-1])]
        assert len(records)==counts[i-1] and all(records),(name,records)
        pane=root.find('s:sheetViews/s:sheetView/s:pane',n)
        assert pane is not None and pane.get('xSplit')=='2' and pane.get('ySplit')=='8',(name,ET.tostring(pane))
        maxheight=max(float(r.get('ht','0')) for r in root.findall('s:sheetData/s:row',n))
        assert maxheight<=409.5,(name,maxheight)
        assert len(root.findall('s:tableParts/s:tablePart',n))==1
        validations=len(root.findall('s:dataValidations/s:dataValidation',n))
        if i<=4:assert validations>=1
        sheetchecks.append({'sheet':name,'records':len(records),'freeze':'C9','max_row_height_points':maxheight,'dropdowns':validations})
        values.append(cells)
    assert [values[0][x] for x in ['B4','D4','F4','H4']]==['38','24','76','13']
    assert all(values[2]['M'+str(r)]=='未执行' for r in range(9,85))
    assert Counter(values[1]['E'+str(r)] for r in range(9,39))==d['meta']['template_counts']
    assert set(values[2]['A'+str(r)] for r in range(9,85))=={x['id'] for x in d['business']}
    assert [values[5]['B'+str(r)] for r in range(9,33)]==[x['record_id'] for x in d['reviews']]
    tabs=[ET.fromstring(z.read(f)) for f in z.namelist() if re.fullmatch(r'xl/tables/table\d+\.xml',f)]
    assert len(tabs)==6
    assert all(t.find('s:autoFilter',n) is not None for t in tabs)
    report['workbook']={'zip_integrity':'pass','sheets':sheetchecks,'summary_values':[38,24,76,13],'formula_errors':0,'all_76_business_cases_unexecuted':True,'stable_record_ids_match':True}
assert {x['seq'] for x in d['business']}=={x['seq'] for x in d['scope'] if x['w2']=='UI/开'}
assert all(v==2 for v in Counter(x['seq'] for x in d['business']).values())
assert len(d['issues'])==13
assert len(list((O/'evidence').glob('*.jpg')))==22
assert len(list((O/'evidence').glob('*.json')))==7
for x in d['templates']+d['issues']:
    for code in re.findall(r'E\d{2}-[\w-]+',x['evidence']):assert (O/'evidence'/(code+'.jpg')).is_file(),code
class Parser(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.refs=[];self.cards=Counter()
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag in ['img','a']:self.refs.append(a.get('src',a.get('href','')))
        for cls in a.get('class','').split():self.cards[cls]+=1
h=O/'SN318_W2_UI审查报告.html'
parser=Parser();parser.feed(h.read_text('utf-8'))
assert len(parser.ids)==len(set(parser.ids))
for ref in parser.refs:
    if ref.startswith('#'):assert ref[1:] in parser.ids,ref
    elif not ':' in ref:assert (O/ref).is_file(),ref
assert parser.cards['searchable']==13+30+76
report['html']={'local_links':'pass','unique_ids':'pass','searchable_items':119,'screenshots':22,'observation_json':7}
report['files']=[{'name':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in [p,h]]
(W/'delivery-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
