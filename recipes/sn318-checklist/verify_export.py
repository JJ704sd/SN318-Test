from pathlib import Path
from collections import Counter
from datetime import datetime, timedelta
import json
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

path = Path(r'.\outputs\checklist\SN318_分批提测检查表.xlsx')
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(path) as z:
    assert z.testzip() is None
    ss = ET.fromstring(z.read('xl/sharedStrings.xml'))
    strings = [''.join(si.itertext()) for si in ss.findall('s:si', ns)]
    design=json.loads(Path(r'.\.work\sn318-checklist\design_rationale.json').read_text(encoding='utf-8'))
    corrections={item['id']:item for item in design['caseCorrections']}
    assert not any('fixture' in s for s in strings), 'Synthetic verification values leaked into deliverable'
    root = ET.fromstring(z.read('xl/workbook.xml'))
    names = [s.attrib['name'] for s in root.findall('s:sheets/s:sheet', ns)]
    assert names == ['本批提测', '冒烟用例', 'UI检查']
    sheets = [ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml')) for i in range(1, 4)]
    def cell_value(sheet, address):
        cell = sheet.find(f'.//s:c[@r="{address}"]', ns)
        if cell is None:
            return None
        v = cell.find('s:v', ns)
        if v is None:
            inline = cell.find('s:is', ns)
            return ''.join(inline.itertext()) if inline is not None else None
        if cell.attrib.get('t') == 's':
            return strings[int(v.text)]
        return v.text
    assert cell_value(sheets[0], 'B4') == '请补齐本批信息并核对交付覆盖与基线'
    assert cell_value(sheets[0], 'B33') == '待评审'
    assert cell_value(sheets[0], 'F35') == '待人工评审'
    assert cell_value(sheets[0], 'B8') in (None, '')
    assert cell_value(sheets[0], 'B22') == '0'
    assert cell_value(sheets[0], 'F22') == '0'
    assert cell_value(sheets[0], 'B20') == '5'
    assert cell_value(sheets[0], 'B26') == '26'
    assert cell_value(sheets[0], 'F26') == '34'
    assert cell_value(sheets[0], 'H26') == '31'
    assert cell_value(sheets[0], 'H20') == '0'
    assert cell_value(sheets[0], 'H30') == '5'
    assert cell_value(sheets[0], 'F31') == '21'
    assert cell_value(sheets[0], 'B17') == '待确认'
    assert sheets[0].find('.//s:c[@r="B18"]/s:f', ns) is not None
    for s, end, mapping, basis in [(sheets[1], 67, 'Q','R'), (sheets[2], 39,'U','V')]:
        for r in range(6, end + 1):
            assert cell_value(s, f'G{r}') == '未执行'
            assert cell_value(s, f'H{r}') in (None, '')
            assert cell_value(s, f'M{r}') in (None, '')
            assert cell_value(s, f'{mapping}{r}') in (None, '')
            assert cell_value(s, f'{basis}{r}') in (None, '')
            assert cell_value(s, f'O{r}') in (None, '')
            assert s.find(f'.//s:c[@r="I{r}"]/s:f', ns) is not None
        pane = s.find('s:sheetViews/s:sheetView/s:pane', ns)
        assert pane is not None and pane.attrib.get('xSplit') == '3' and pane.attrib.get('ySplit') == '5', pane.attrib if pane is not None else None
    original_statuses = [cell_value(sheets[2], f'Q{r}') for r in range(6, 24)]
    assert original_statuses == ['修改中'] * 2 + ['待确认'] * 16
    assert cell_value(sheets[2], 'R8') == '组合复用'
    priorities = Counter(cell_value(sheets[2], f'P{r}') for r in range(6, 24))
    assert priorities == Counter({'P0': 6, 'P1': 7, 'P2': 5})
    assert cell_value(sheets[2], 'S9') == 'UI、产品'
    assert cell_value(sheets[2], 'S13') == '产品、开发'
    assert cell_value(sheets[2], 'S23') == '开发、产品'
    layers = Counter(cell_value(sheets[1], f'P{r}') for r in range(6, 68))
    assert layers == Counter({'冒烟':31, '专项回归':31})
    assert '四位小数' in cell_value(sheets[2], 'K27')
    assert 'DEC10' in cell_value(sheets[2], 'L27')
    assert '待生效' in cell_value(sheets[0], 'B50') and '草稿' in cell_value(sheets[0], 'B50')
    table_paths = [name for name in z.namelist() if name.startswith('xl/tables/table') and name.endswith('.xml')]
    assert len(table_paths) == 3
    tables = [ET.fromstring(z.read(name)) for name in table_paths]
    assert set(t.attrib['ref'] for t in tables) == {'A5:U67', 'A5:AE39', 'A39:H61'}
    for t in tables:
        assert t.find('s:autoFilter', ns) is not None
    validations = sum(len(s.findall('s:dataValidations/s:dataValidation', ns)) for s in sheets)
    assert validations >= 12
    formulas = [c.find('s:f', ns).text for s in sheets for c in s.findall('.//s:c', ns) if c.find('s:f', ns) is not None]
    error_cells = [(i+1, c.attrib['r'], cell_value(s, c.attrib['r'])) for i,s in enumerate(sheets) for c in s.findall('.//s:c', ns) if c.attrib.get('t') == 'e']
    assert not error_cells, error_cells
    generation_cell = sheets[0].find('.//s:c[@r="F16"]', ns)
    generation_type = generation_cell.attrib.get('t', 'n')
    assert generation_type in ('d', 'n'), 'Generation date must be a typed date or numeric Excel serial'
    generation_value = cell_value(sheets[0], 'F16')
    if generation_type == 'd':
        generation_date = datetime.fromisoformat(generation_value.replace('Z', '+00:00')).date().isoformat()
    else:
        generation_date = (datetime(1899, 12, 30) + timedelta(days=float(generation_value))).date().isoformat()
    assert generation_date == '2026-10-10'
    assert cell_value(sheets[0], 'H59') == '待确认'
    assert cell_value(sheets[0], 'H60') == '库内待选择'
    assert cell_value(sheets[0], 'F30') == '1'
    assert 'DEC21' in cell_value(sheets[1], 'L31')
    assert '每条明细独立' in cell_value(sheets[1], 'K65')
    assert '以当前日期判断' in cell_value(sheets[1], 'K61')
    assert '左对齐' in cell_value(sheets[2], 'K25') and '#D1E4FB' in cell_value(sheets[2], 'K25')
    assert '1.4' in cell_value(sheets[2], 'K24')
    assert '40px' in cell_value(sheets[2], 'K38') and '44px' in cell_value(sheets[2], 'K38')
    assert 'aria-selected' in cell_value(sheets[2], 'K39')
    for r in range(40,62):
        assert sheets[0].find(f'.//s:c[@r="H{r}"]/s:f', ns) is not None
    source_snapshot = json.loads(Path(r'.\.work\sn318-checklist\review_source_snapshot.json').read_text(encoding='utf-8'))
    row_for_id = {cell_value(sheets[2],f'A{r}'): r for r in range(6,24)}
    assert len(row_for_id) == 18 and len(source_snapshot['records']) == 18
    for source in source_snapshot['records']:
        r = row_for_id[source['caseId']]
        actual = [cell_value(sheets[2], f'{column}{r}') for column in ['P','Q','R','S','X','Y','Z','AA','AB']]
        expected = [source[key] for key in ['priority','state','adaptation','roles','types','issue','suggestion','next','recordId']]
        assert actual == expected, f"Export lost source detail: {source['caseId']}"
        assert source['recordId'] in cell_value(sheets[2],f'L{r}')
        assert cell_value(sheets[2],f'AC{r}'), f"Missing revision trace: {source['caseId']}"
    assert cell_value(sheets[0], 'A61') == 'DEC22'
    assert 'DEC22' in cell_value(sheets[2], 'J8')
    assert '恢复默认工具栏' in cell_value(sheets[2], 'K18')
    assert '无需拉伸' in cell_value(sheets[2], 'K14')
    assert '进入编辑' not in cell_value(sheets[2], 'J23')
    workflow_verification = json.loads(Path(r'.\.work\sn318-checklist\verification.json').read_text(encoding='utf-8'))
    assert len(workflow_verification['assertions']) == 58
    assert len(workflow_verification['reviewCoverageAudit']) == 18
    # This change is a Review-detail correction. Preserve the 60 functional cases and all 16 generic UI checks.
    with ZipFile(r'.\.work\sn318-checklist\before-review-details.xlsx') as before:
        before_ss=ET.fromstring(before.read('xl/sharedStrings.xml'))
        before_strings=[''.join(si.itertext()) for si in before_ss.findall('s:si',ns)]
        def before_cell(sheet,address):
            c=sheet.find(f'.//s:c[@r="{address}"]',ns)
            if c is None: return None
            v=c.find('s:v',ns)
            if v is None:
                inline=c.find('s:is',ns)
                return ''.join(inline.itertext()) if inline is not None else None
            return before_strings[int(v.text)] if c.attrib.get('t')=='s' else v.text
        before_smoke=ET.fromstring(before.read('xl/worksheets/sheet2.xml'))
        before_ui=ET.fromstring(before.read('xl/worksheets/sheet3.xml'))
        for r in range(6,66):
            for column in 'ABCDEFGHJKLMNOPQRS':
                case_id=cell_value(sheets[1],f'A{r}')
                expected=corrections[case_id][column] if case_id in corrections and column in ('J','K') else before_cell(before_smoke,f'{column}{r}')
                assert cell_value(sheets[1],f'{column}{r}') == expected, f"Unrelated functional change: {column}{r}"
        for r in range(24,40):
            for column in ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T','U','V','W']:
                assert cell_value(sheets[2],f'{column}{r}') == before_cell(before_ui,f'{column}{r}'), f"Unrelated generic UI change: {column}{r}"
    design=json.loads(Path(r'.\.work\sn318-checklist\design_rationale.json').read_text(encoding='utf-8'))
    for sheet,key,first,last_column,last_row in [(sheets[1],'smoke','T','U',67),(sheets[2],'ui','AD','AE',39)]:
        assert cell_value(sheet,f'{first}5') == '设计思路／测试方法（建议）'
        assert cell_value(sheet,f'{last_column}5') == '数据选择／核对证据（建议）'
        rationale_by_id={r[0]:r[1:] for r in design[key]}
        assert len(rationale_by_id)==last_row-5
        for r in range(6,last_row+1):
            case_id=cell_value(sheet,f'A{r}')
            assert [cell_value(sheet,f'{first}{r}'),cell_value(sheet,f'{last_column}{r}')] == rationale_by_id[case_id], f'Missing rationale: {case_id}'
    assert '测试建议' in cell_value(sheets[0],'A82')
    assert all(cell_value(sheets[0],f'A{r}') and cell_value(sheets[0],f'B{r}') for r in range(85,91))
    assert [[cell_value(sheets[0],f'{col}{r}') for col in 'ABCDEFGH'] for r in range(95,106)] == design['moduleMatrix']
    assert cell_value(sheets[0],'A108') == design['source']['verificationScope']
    assert cell_value(sheets[0],'A109') == design['source']['boundary']
    assert '确认覆盖率' in cell_value(sheets[0],'B90') and '分母为0' in cell_value(sheets[0],'B90')
    assert '所有适用必需分支' in cell_value(sheets[0],'B89')
    assert '20.1KG' in cell_value(sheets[1],'K57') and '21KG' in cell_value(sheets[1],'K57')
    assert '2001' in cell_value(sheets[1],'K34')
    assert '待生效' in cell_value(sheets[1],'K26') and '不一概预设生效中' in cell_value(sheets[1],'K26')
    for entry,r in zip(design['newCases'],(66,67)):
        assert cell_value(sheets[1],f'A{r}') == entry['id']
        assert cell_value(sheets[1],f'J{r}') == f"前置：{entry['data']}\n操作：{entry['action']}"
        assert cell_value(sheets[1],f'K{r}') == entry['expected']
        assert cell_value(sheets[1],f'L{r}') == entry['source']
        assert cell_value(sheets[1],f'D{r}') == '待选择'
        assert cell_value(sheets[1],f'F{r}') == '待确认'
        formula=sheets[1].find(f'.//s:c[@r="I{r}"]/s:f',ns).text
        assert all(f'{col}{r}' in formula for col in ('D','F','G','H','M','O','Q','R'))
        assert 'COUNTIFS' not in formula, 'New checks inherited an unrelated decision'
    # Independent decimal arithmetic confirms the non-integer input exposes a missed rounding step.
    from decimal import Decimal, ROUND_CEILING
    volume_weight=Decimal(67)*30*60/6000
    assert volume_weight == Decimal('20.1') and volume_weight.to_integral_value(rounding=ROUND_CEILING) == Decimal(21)
    # The rationale edit must preserve all existing cases, Review excerpts, inputs, decisions and formulas.
    with ZipFile(r'.\.work\sn318-checklist\before-design-rationale.xlsx') as original:
        original_ss=ET.fromstring(original.read('xl/sharedStrings.xml'))
        original_strings=[''.join(si.itertext()) for si in original_ss.findall('s:si',ns)]
        preserved_cells=0
        adjusted_formulas=0
        corrected_cells=0
        for index,limit in enumerate([81,65,39],1):
            original_sheet=ET.fromstring(original.read(f'xl/worksheets/sheet{index}.xml'))
            for cell in original_sheet.findall('.//s:c',ns):
                address=cell.attrib['r']
                row=int(''.join(c for c in address if c.isdigit()))
                if row>limit: continue
                current=sheets[index-1].find(f'.//s:c[@r="{address}"]',ns)
                f=cell.find('s:f',ns)
                if f is not None:
                    assert current is not None and current.find('s:f',ns) is not None
                    expected_formula=re.sub(r"('冒烟用例'![^,()+]*\$)65\b",lambda m:m.group(1)+'67',f.text) if index==1 else f.text
                    assert current.find('s:f',ns).text == expected_formula, f'Formula changed: sheet{index}!{address}'
                    adjusted_formulas+=int(expected_formula!=f.text)
                else:
                    v=cell.find('s:v',ns)
                    inline=cell.find('s:is',ns)
                    old_value=(original_strings[int(v.text)] if cell.attrib.get('t')=='s' else v.text) if v is not None else (''.join(inline.itertext()) if inline is not None else None)
                    case_id=cell_value(sheets[index-1],f'A{row}') if index==2 else None
                    column=''.join(c for c in address if c.isalpha())
                    expected_value=corrections[case_id][column] if case_id in corrections and column in ('J','K') else old_value
                    corrected_cells+=int(expected_value!=old_value)
                    assert cell_value(sheets[index-1],address) == expected_value, f'Existing value changed: sheet{index}!{address}'
                preserved_cells+=1
            current_validations={ET.tostring(v) for v in sheets[index-1].findall('s:dataValidations/s:dataValidation',ns)}
            assert all(ET.tostring(v) in current_validations for v in original_sheet.findall('s:dataValidations/s:dataValidation',ns)), f'Existing validation changed: sheet{index}'
            original_pane=original_sheet.find('s:sheetViews/s:sheetView/s:pane',ns)
            current_pane=sheets[index-1].find('s:sheetViews/s:sheetView/s:pane',ns)
            assert (original_pane.attrib if original_pane is not None else None) == (current_pane.attrib if current_pane is not None else None)
    audit=json.loads(Path(r'.\.work\sn318-checklist\design_rationale_verification.json').read_text(encoding='utf-8'))
    assert len(audit['rationaleGateAssertions']) == 19
    assert corrected_cells == 6
    report = {'file': str(path), 'size': path.stat().st_size, 'sheets': names, 'tables': len(tables), 'data_validation_ranges': validations, 'initial_results': '96 checks unexecuted', 'functional_layers':dict(layers), 'source_review_priorities': dict(priorities), 'generation_date': generation_date, 'workflow_fixture_assertions_from_prior_formula_audit':len(workflow_verification['assertions']),'new_case_gate_fixture_assertions':19,'review_source_records_verified':18,'rationale_entries_verified':96,'module_design_themes':11,'design_guide_steps':6,'existing_cells_checked':preserved_cells,'intentional_case_cells_corrected':corrected_cells,'formula_ranges_extended_for_new_cases':adjusted_formulas,'case_preservation':'3 functional cases corrected, 2 regression checks added; other original cases and all execution records preserved','rounding_arithmetic':'20.1kg rounds upward to 21kg under the explicit test configuration','native_excel_recalculation': 'not performed'}
    Path(r'.\.work\sn318-checklist\export_verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
