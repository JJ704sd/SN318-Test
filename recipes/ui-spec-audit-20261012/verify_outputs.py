import json,zipfile,hashlib,math,re
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image
W=Path(r'.\.work\ui-spec-audit-20261012')
O=Path(r'.\outputs\frontend-audit\ui-spec-audit')
data=json.loads((W/'audit-data.json').read_text(encoding='utf-8'))
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
file=O/'SN318_前端UI规范审查与修改清单.xlsx'
errors=[]
with zipfile.ZipFile(file) as z:
    assert z.testzip() is None
    strings=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    sheetnames=[x.attrib['name'] for x in wb.findall('s:sheets/s:sheet',ns)]
    sheets={name:ET.fromstring(z.read(f'xl/worksheets/sheet{i+1}.xml')) for i,name in enumerate(sheetnames)}
    def cells(name):
        result={}
        for c in sheets[name].findall('.//s:c',ns):
            v=c.find('s:v',ns)
            value=v.text if v is not None and v.text is not None else ''
            if c.attrib.get('t')=='s':value=strings[int(value)]
            if c.attrib.get('t')=='inlineStr':value=''.join(c.find('s:is',ns).itertext())
            if c.attrib.get('t')=='e':errors.append((name,c.attrib['r'],value))
            result[c.attrib['r']]=value
        return result
    def col(i):
        r=''
        while i>=0:r=chr(65+i%26)+r;i=i//26-1
        return r
    expected_main=[[a[k] for k in ['id','priority','module','verdict','observed','target','retest','review','norm','location','roles','decision','evidence','owner','status','result','version']] for a in data['actions']]
    expected_review=[]
    for r in data['review']:
        f=r['fields'];expected_review.append([r['ref'],f['record_id'],f['页面/模块'],f['优先级'],f['框架适配判断'],f['确认状态'],f['当前处理角色'],f['Review 类型'],f['当前原型问题'],f['Review 建议'],f['后续处理建议'],f['备注'],r['actions'],r['evidence']])
    for name,expected in [('修改清单',expected_main),('Review对照',expected_review)]:
        actual=cells(name)
        for i,row in enumerate(expected,7):
            for j,value in enumerate(row):assert actual.get(f'{col(j)}{i}','')==str(value),f'{name}!{col(j)}{i} mismatch'
    main=cells('修改清单')
    assert sum(main.get(f'A{i}','').startswith('UI') for i in range(7,37))==30
    assert all(main[f'O{i}']=='待安排' and main[f'P{i}']=='未执行' for i in range(7,37))
    summary=cells('审查概览')
    for cell,value in [('A6',30),('D6',7),('G6',30),('J6',48)]:assert float(summary[cell])==value
    assert len(sheets['修改清单'].findall('s:dataValidations/s:dataValidation',ns))==2
    assert len([n for n in z.namelist() if re.match(r'xl/media/image\d*\.',n)])==8
    assert len([n for n in z.namelist() if re.match(r'xl/tables/table\d+\.xml',n)])==4
    assert not errors
    assert not any('externalLinks/' in n for n in z.namelist())
    # Conservatively estimate wrapped Chinese/Latin lines, including explicit source line breaks.
    layout_warnings=[]
    for name,widths in [('修改清单',[60,82,140,140,310,360,340,125,210,340,130,270,130,120,130,130,140]),('Review对照',[72,170,135,88,135,100,110,120,310,400,220,230,150,140])]:
        actual=cells(name)
        heights={int(r.attrib['r']):float(r.attrib.get('ht',20))*4/3 for r in sheets[name].findall('s:sheetData/s:row',ns)}
        for i in range(7,37 if name=='修改清单' else 31):
            for j,width in enumerate(widths):
                value=actual.get(f'{col(j)}{i}','')
                lines=sum(max(1,math.ceil(sum(1 if ord(c)>255 else .6 for c in line)/(width/14-2))) for line in value.split('\n'))
                if lines*18+12>heights.get(i,0):layout_warnings.append((name,f'{col(j)}{i}',lines,heights.get(i)))
for e in data['evidence']:
    p=O/e['relativePath'];assert p.exists()
    assert hashlib.sha256(p.read_bytes()).hexdigest()==e['sha256']
    im=Image.open(p);assert [im.width,im.height]==[e['width'],e['height']]
    im.verify()
text=(O/'SN318_UI审查报告.html').read_text(encoding='utf-8')
for a in data['actions']:assert a['id'] in text
for e in data['evidence']:assert e['relativePath'] in text
assert not re.search(r'(_authToken|device_code|access_token|refresh_token)',text,re.I)
result=dict(workbook=str(file),bytes=file.stat().st_size,sheets=sheetnames,actions=30,reviewRecords=24,checks=28,evidence=48,embeddedImages=8,formulaErrors=errors,summaryCaches={k:summary[k] for k in ['A6','D6','G6','J6']},dataValidations=2,sourceValuesRetained=True,allEvidenceHashesVerified=True,layoutWarnings=layout_warnings)
(W/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
