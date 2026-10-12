from pathlib import Path
from collections import Counter
from decimal import Decimal, ROUND_CEILING
from datetime import datetime, timedelta
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import hashlib
import json
import re

base = Path(__file__).parent
out = Path(r'.\outputs\checklist\SN318_分批提测检查表_需求重核完善.xlsx')
original = out.with_name('SN318_分批提测检查表_边界异常复核.xlsx')
before = base / 'before-requirement-reaudit.xlsx'
design = json.loads((base / 'design_rationale.json').read_text(encoding='utf-8'))
audit = json.loads((base / 'design_rationale_verification.json').read_text(encoding='utf-8'))
ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def read_xlsx(path):
    with ZipFile(path) as z:
        assert z.testzip() is None
        ss = [''.join(c.itertext()) for c in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', ns)]
        names = [s.attrib['name'] for s in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet', ns)]
        roots = [ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml')) for i in range(1,len(names)+1)]
        tables = [ET.fromstring(z.read(p)) for p in z.namelist() if re.fullmatch(r'xl/tables/table\d+\.xml',p)]
        cells = []
        for root in roots:
            values = {}
            for c in root.findall('.//s:c', ns):
                v, inline, f = c.find('s:v',ns), c.find('s:is',ns), c.find('s:f',ns)
                value = (ss[int(v.text)] if c.attrib.get('t')=='s' else v.text) if v is not None else (''.join(inline.itertext()) if inline is not None else None)
                values[c.attrib['r']] = {'value':value, 'formula':f.text if f is not None else None, 'type':c.attrib.get('t')}
            cells.append(values)
        return names, roots, cells, tables, ss

names, roots, cells, tables, strings = read_xlsx(out)
old_names, old_roots, old_cells, old_tables, old_strings = read_xlsx(before)
assert names == old_names == ['本批提测','冒烟用例','UI检查','需求对照']
assert hashlib.sha256(original.read_bytes()).digest() == hashlib.sha256(before.read_bytes()).digest(), 'Original changed during audit: merge latest user inputs before delivery'
assert not any('fixture-' in s for s in strings)
assert not [(i+1,a,c['value']) for i,s in enumerate(cells) for a,c in s.items() if c['type']=='e']

def value(sheet, addr):
    return cells[sheet-1].get(addr,{}).get('value')

assert value(1,'B4')=='请补齐本批信息并核对交付覆盖与基线'
assert value(1,'B33')=='待评审' and value(1,'F35')=='待人工评审'
assert value(1,'B20')=='5' and value(1,'H20')=='0'
assert value(1,'B22')=='0' and value(1,'F22')=='0'
assert value(1,'B26')=='26' and value(1,'F26')=='34' and value(1,'H26')=='51'
assert value(1,'H30')=='5' and value(1,'F31')=='21' and value(1,'F30')=='1'
assert value(1,'B8') in (None,'') and value(1,'B17')=='待确认'

ids = {}
for index,last,map_col,basis_col in [(2,87,'Q','R'),(3,39,'U','V')]:
    ids[index] = {value(index,f'A{r}'):r for r in range(6,last+1)}
    assert len(ids[index])==last-5
    for r in range(6,last+1):
        assert value(index,f'G{r}')=='未执行'
        assert value(index,f'F{r}')=='待确认'
        for col in ['H','M','N','O',map_col,basis_col]:
            assert value(index,f'{col}{r}') in (None,''), (index,r,col)
        assert cells[index-1][f'I{r}']['formula']
assert set(ids[2])=={f'SM{n:02}' for n in range(1,83)}
assert set(ids[3])=={f'UI{n:02}' for n in range(1,35)}
layers = Counter(value(2,f'P{r}') for r in range(6,88))
assert layers==Counter({'冒烟':31,'专项回归':51})

corrections = {c['id']:c for c in design['caseCorrections']}
decision_corrections = {c['id']:c for c in design['decisionCorrections']}
dec_rows = {value(1,f'A{r}'):r for r in range(40,62)}
def extend(f):
    return re.sub(r"('冒烟用例'![^,()+]*\$)67\b",lambda m:m.group(1)+'87',f)

allowed_main_values = {'A83':design['summaryText'],'A108':design['source']['verificationScope'],
                      'A109':design['source']['boundary'],'A110':design['auditNote']}
for i,row in enumerate(design['guide'],85):
    allowed_main_values[f'A{i}']=f'{i-84}. {row[0]}'
    allowed_main_values[f'B{i}']=row[1]
for i,row in enumerate(design['moduleMatrix'],95):
    for j,col in enumerate('ABCDEFGH'):
        allowed_main_values[f'{col}{i}'] = row[j]
for c in decision_corrections.values():
    for col in ['B','C']:
        if col in c: allowed_main_values[f'{col}{dec_rows[c["id"]]}']=c[col]
old_checked, changed_values, range_updates, decision_updates = 0,0,0,0
for index,old in enumerate(old_cells,1):
    for addr,cell in old.items():
        now=cells[index-1].get(addr,{'value':None,'formula':None})
        col=re.sub(r'\d','',addr); row=int(re.sub(r'\D','',addr))
        if cell['formula']:
            expected = extend(cell['formula']) if index==1 else cell['formula']
            range_updates += int(expected!=cell['formula'])
            # This revision changes prose only: every formula must remain byte-identical.
            assert expected == cell['formula']
            assert now['formula']==expected,(index,addr,'formula changed unexpectedly')
        else:
            expected=cell['value']
            if index==1 and addr in allowed_main_values:
                expected=allowed_main_values[addr]
            elif index==2 and row>=6:
                cid=value(2,f'A{row}')
                if cid in corrections and col in ['J','K']:
                    expected=corrections[cid][col]
                entry=next((e for e in design['newCases'] if e['id']==cid),None)
                if entry and col in ['J','K','L']:
                    expected={'J':f'前置：{entry["data"]}\n操作：{entry["action"]}','K':entry['expected'],'L':entry['source']}[col]
                if col in ['T','U']:
                    rationale = next(r for r in design['smoke'] if r[0]==cid)
                    expected=rationale[1 if col=='T' else 2]
            elif index==4 and row>=6 and col in 'ABCDEFGH':
                expected=design['traceability'][row-6]['ABCDEFGH'.index(col)]
            assert now['value']==expected,(index,addr,'value changed unexpectedly',cell['value'],now['value'])
            changed_values+=int(expected!=cell['value'])
        old_checked+=1
    old_dv={ET.tostring(v) for v in old_roots[index-1].findall('s:dataValidations/s:dataValidation',ns)}
    new_dv={ET.tostring(v) for v in roots[index-1].findall('s:dataValidations/s:dataValidation',ns)}
    assert old_dv<=new_dv,('existing validation lost',index)
    old_pane=old_roots[index-1].find('s:sheetViews/s:sheetView/s:pane',ns)
    new_pane=roots[index-1].find('s:sheetViews/s:sheetView/s:pane',ns)
    assert (old_pane.attrib if old_pane is not None else None)==(new_pane.attrib if new_pane is not None else None)
    # Layout widths for the existing sheets stay intact; affected text rows may grow.
    assert [(c.attrib['min'],c.attrib['max'],c.attrib.get('width')) for c in old_roots[index-1].findall('s:cols/s:col',ns)]==[(c.attrib['min'],c.attrib['max'],c.attrib.get('width')) for c in roots[index-1].findall('s:cols/s:col',ns)]

for key,index,a,b in [('smoke',2,'T','U'),('ui',3,'AD','AE')]:
    for cid,method,evidence in design[key]:
        r=ids[index][cid]
        assert value(index,f'{a}{r}')==method and value(index,f'{b}{r}')==evidence
for entry in design['newCases']:
    r=ids[2][entry['id']]
    assert value(2,f'J{r}')==f'前置：{entry["data"]}\n操作：{entry["action"]}'
    assert value(2,f'K{r}')==entry['expected'] and value(2,f'L{r}')==entry['source']
    if entry['id'] in design['auditAddedIds']:
        assert value(2,f'D{r}')=='待选择' and value(2,f'E{r}')=='否'
        assert value(2,f'S{r}')==entry['basis']
        formula=cells[1][f'I{r}']['formula']
        assert all(f'{col}{r}' in formula for col in ['D','F','G','H','M','O','Q','R'])
        for dec in entry['decisions']:
            assert f"'本批提测'!$H${dec_rows[dec]}" in formula, ('Missing new decision guard',entry['id'],dec)
assert audit['addedDuringThisRun']==[]
assert audit['correctedCasesThisAudit']==design['reauditCorrectedIds']
assert len(audit['rationaleGateAssertions'])==5
assert audit['totalCases']==116 and audit['clauseGroups']==102
assert len({r[1] for r in design['smoke'] if r[0] in design['reauditRationaleIds']})==20
assert len({r[2] for r in design['smoke'] if r[0] in design['reauditRationaleIds']})==20

assert len(tables)==4
assert {t.attrib['ref'] for t in tables}=={'A5:U87','A5:AE39','A39:H61','A5:H107'}
assert all(t.find('s:autoFilter',ns) is not None for t in tables)
assert [[value(4,f'{col}{r}') for col in 'ABCDEFGH'] for r in range(6,108)]==design['traceability']
assert len({value(4,f'A{r}') for r in range(6,108)})==102
def expanded_ids(text):
    for m in re.finditer(r'(SM|UI)(\d+)(?:[—–-](?:SM|UI)?(\d+))?',text):
        for num in range(int(m[2]),int(m[3] or m[2])+1):
            yield f'{m[1]}{num:02}'
for row in design['traceability']:
    assert all(cid in set(ids[2])|set(ids[3]) for cid in expanded_ids(row[2])),row
    assert row[7].startswith('https://example.invalid/source/25c26e85d7')

snapshot=json.loads((base/'review_source_snapshot.json').read_text(encoding='utf-8'))
for src in snapshot['records']:
    r=ids[3][src['caseId']]
    assert [value(3,f'{col}{r}') for col in ['P','Q','R','S','X','Y','Z','AA','AB']]==[src[k] for k in ['priority','state','adaptation','roles','types','issue','suggestion','next','recordId']]
assert len(snapshot['records'])==18
assert Counter(value(3,f'P{r}') for r in range(6,24))==Counter({'P0':6,'P1':7,'P2':5})

# Independent numerical checks of explicit examples; no inferred business formula.
raw=Decimal(67)*30*60/6000
assert raw==Decimal('20.1') and raw.to_integral_value(rounding=ROUND_CEILING)==21
assert Decimal(8)*10+50==130 and Decimal(10)*10==100
assert min(5000,6000,7000)==5000
days=set(range(1,8)) & set(range(1,6)) & set(range(4,8))
assert days=={4,5} and max(9,9,10)==10 and min(18,16,18)==16
t=datetime(2026,10,10,12)
eps=timedelta(minutes=1)
assert [t>end for end in [t-eps,t,t+eps]]==[True,False,False]
assert [start>t for start in [t-eps,t,t+eps]]==[False,False,True]
assert '部分尺寸' in value(2,'K83') and '须确认' in value(2,'K83')
assert '区间端点' in value(2,'K77') and '批准' in value(2,'K77')
assert '评论未决' in value(2,'K53') and 'DEC19' in value(2,'K53')
assert '§七第15项' in value(2,'K34') and 'DEC15' in value(2,'K34')
assert '131 CNY' in value(2,'K30')
assert '总燃油11' in value(2,'K49')
assert '所有状态' in value(2,'K55') and '仅已发布' in value(2,'K55')
assert '选择后停用' in value(2,'K56')
assert '燃油未命中明确按0并提示、继续计算' in value(2,'K84')
assert '缺有效成本卡明确中止' in value(2,'K84')
assert '399.60' in value(2,'U75')
assert Decimal('100')+Decimal('20')+Decimal('100')*Decimal('.10')+Decimal('20')*Decimal('.05')==Decimal('131')
assert Decimal('400')/20==20 and Decimal('400')/5==80
assert Decimal('4.44')*90==Decimal('399.60')
report={'file':str(out),'size':out.stat().st_size,'sheets':names,'tables':len(tables),
        'functional_checks':82,'ui_checks':34,'total_checks':116,'initial_results':'116 checks unexecuted',
        'functional_layers':dict(layers),'clause_groups':102,'corrected_this_audit':8,'added_this_audit':0,'rationale_cases_rewritten':20,
        'fixture_assertions':len(audit['rationaleGateAssertions']),'original_cells_checked':old_checked,
        'intentional_text_changes':changed_values,'main_range_formulas_extended':range_updates,
        'decision_dependency_formulas_updated':decision_updates,'data_validations':sum(len(r.findall('s:dataValidations/s:dataValidation',ns)) for r in roots),
        'review_source_records_preserved':18,'original_file_unchanged':True,
        'arithmetic_examples_verified':['20.1kg upward21kg in explicit fixture','A130/B100 complete costs','minimum ratio5000','Thu-Fri10-16 intersection','strict start/delete time comparisons','100+20+10+1=131 CNY','400/20=20 and 400/5=80; displayed4.44 times90=399.60'],
        'native_excel_recalculation':'not performed','business_environment_tests':'not performed'}
(base/'export_verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
