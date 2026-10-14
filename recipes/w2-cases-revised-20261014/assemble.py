from pathlib import Path
from collections import Counter
import json, copy, re, zipfile, posixpath, hashlib
import xml.etree.ElementTree as E

ROOT=Path('.'); WORK=ROOT/'.work/w2-cases-revised-20261014'
p=json.loads((WORK/'plan.json').read_text(encoding='utf-8'))
native_links=json.loads((WORK/'native-links.json').read_text(encoding='utf-8'))
SOURCE=Path(p['source']); DEST=Path(p['destination']); OUT=Path(p['out'])
NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL='http://schemas.openxmlformats.org/package/2006/relationships'
RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CT='http://schemas.openxmlformats.org/package/2006/content-types'
Q=lambda x:'{'+NS+'}'+x
E.register_namespace('',NS); E.register_namespace('r',RNS)
E.register_namespace('mc','http://schemas.openxmlformats.org/markup-compatibility/2006')
E.register_namespace('xr9','http://schemas.microsoft.com/office/spreadsheetml/2016/revision9')
E.register_namespace('x15ac','http://schemas.microsoft.com/office/spreadsheetml/2010/11/ac')

def serialize(element, default=NS):
    E.register_namespace('',default)
    result=E.tostring(element,encoding='utf-8',xml_declaration=True)
    E.register_namespace('',NS)
    return result

def sheet_paths(z):
    rel={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    return {s.attrib['name']:posixpath.normpath('xl/'+rel[s.attrib['{'+RNS+'}id']]) if not rel[s.attrib['{'+RNS+'}id']].startswith('/') else rel[s.attrib['{'+RNS+'}id']].lstrip('/') for s in E.fromstring(z.read('xl/workbook.xml')).find(Q('sheets'))}
def shared(z):
    return list(E.fromstring(z.read('xl/sharedStrings.xml'))) if 'xl/sharedStrings.xml' in z.namelist() else []
def value(c,ss):
    if c.attrib.get('t')=='inlineStr':return ''.join(c.find(Q('is')).itertext())
    v=c.find(Q('v'))
    return ''.join(ss[int(v.text)].itertext()) if c.attrib.get('t')=='s' else (v.text if v is not None else '')

# Carry the source package intact, append Artifact Tool authored views, and merge
# resource IDs. This avoids flattening source tables, formats, and human inputs.
with zipfile.ZipFile(SOURCE) as src, zipfile.ZipFile(WORK/'artifact-export.xlsx') as author:
    replacements={}; additions={}; old_paths=sheet_paths(src); new_paths=sheet_paths(author)
    ss=shared(author)
    styles=E.fromstring(src.read('xl/styles.xml')); ast=E.fromstring(author.read('xl/styles.xml'))
    offsets={}
    for part in ['fonts','fills','borders','cellStyleXfs','cellXfs','dxfs']:
        old=styles.find(Q(part)); new=ast.find(Q(part))
        offsets[part]=len(old) if old is not None else 0
    nf=styles.find(Q('numFmts')); anf=ast.find(Q('numFmts')); fmtmap={}
    used={int(x.attrib['numFmtId']) for x in nf} if nf is not None else set()
    if anf is not None:
        if nf is None:nf=E.Element(Q('numFmts'));styles.insert(0,nf)
        next_id=max(used|{163})+1
        for f in anf:
            x=copy.deepcopy(f);fmtmap[int(f.attrib['numFmtId'])]=next_id;x.attrib['numFmtId']=str(next_id);next_id+=1;nf.append(x)
        nf.attrib['count']=str(len(nf))
    for part in ['fonts','fills','borders','cellStyleXfs','cellXfs','dxfs']:
        old=styles.find(Q(part)); new=ast.find(Q(part))
        if new is None:continue
        if old is None:
            old=E.Element(Q(part)); before=next((i for i,x in enumerate(styles) if x.tag in [Q('tableStyles'),Q('extLst')]),len(styles));styles.insert(before,old)
        for child in new:
            x=copy.deepcopy(child)
            if part in ['cellStyleXfs','cellXfs']:
                for field,key in [('fontId','fonts'),('fillId','fills'),('borderId','borders')]:
                    if field in x.attrib:x.attrib[field]=str(int(x.attrib[field])+offsets[key])
                if 'xfId' in x.attrib:x.attrib['xfId']=str(int(x.attrib['xfId'])+offsets['cellStyleXfs'])
                if int(x.attrib.get('numFmtId','0')) in fmtmap:x.attrib['numFmtId']=str(fmtmap[int(x.attrib['numFmtId'])])
            if part=='dxfs':
                for n in x.iter(Q('numFmt')):
                    if int(n.attrib['numFmtId']) in fmtmap:n.attrib['numFmtId']=str(fmtmap[int(n.attrib['numFmtId'])])
            old.append(x)
        old.attrib['count']=str(len(old))
    replacements['xl/styles.xml']=E.tostring(styles,encoding='utf-8',xml_declaration=True)
    wb=E.fromstring(src.read('xl/workbook.xml')); rels=E.fromstring(src.read('xl/_rels/workbook.xml.rels')); types=E.fromstring(src.read('[Content_Types].xml'))
    sheets=wb.find(Q('sheets'))
    next_sheet=max(int(s.attrib['sheetId']) for s in sheets)+1
    next_rid=max(int(re.sub(r'\D','',r.attrib['Id']) or 0) for r in rels)+1
    table_num=max([int(re.search(r'table(\d+)\.xml',f)[1]) for f in src.namelist() if re.search(r'/tables/table\d+\.xml$',f)]+[0])+1
    new_elements=[]
    for n,name in enumerate(['当前用例与补测','整改跟进']):
        original_path=new_paths[name]
        path='xl/worksheets/sheet'+str(next_sheet+n)+'.xml'
        sheet=E.fromstring(author.read(original_path))
        for cell in sheet.iter(Q('c')):
            if 's' in cell.attrib:cell.attrib['s']=str(int(cell.attrib['s'])+offsets['cellXfs'])
            if cell.attrib.get('t')=='s':
                v=cell.find(Q('v'));si=copy.deepcopy(ss[int(v.text)]);cell.remove(v);si.tag=Q('is');cell.append(si);cell.attrib['t']='inlineStr'
        for node in sheet.iter():
            if 'dxfId' in node.attrib:node.attrib['dxfId']=str(int(node.attrib['dxfId'])+offsets['dxfs'])
        relpath=posixpath.dirname(original_path)+'/_rels/'+posixpath.basename(original_path)+'.rels'
        sr=E.Element('{'+REL+'}Relationships')
        if relpath in author.namelist():
            sr=E.fromstring(author.read(relpath))
            for relation in sr:
                assert relation.attrib['Type'].endswith('/table'),relation.attrib
                target=relation.attrib['Target']
                tpath=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.dirname(original_path)+'/'+target)
                t=E.fromstring(author.read(tpath));t.attrib['id']=str(table_num)
                tdest='xl/tables/table'+str(table_num)+'.xml';table_num+=1
                relation.attrib['Target']='../tables/'+posixpath.basename(tdest)
                for node in t.iter():
                    for field in ['headerRowDxfId','dataDxfId','totalsRowDxfId']:
                        if field in node.attrib:node.attrib[field]=str(int(node.attrib[field])+offsets['dxfs'])
                additions[tdest]=E.tostring(t,encoding='utf-8',xml_declaration=True)
                E.SubElement(types,'{'+CT+'}Override',{'PartName':'/'+tdest,'ContentType':'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml'})
        # Artifact Tool has no documented native hyperlink API. Preserve the
        # authored labels and add native links as the missing export capability.
        hyperlinks=E.Element(Q('hyperlinks'))
        link_rid=max([int(re.sub(r'\D','',r.attrib['Id']) or 0) for r in sr]+[0])+1
        for link in [l for l in native_links if l['sheet']==name]:
            attrs={'ref':link['address'],'display':link['label']}
            if link['target'].startswith('#'):
                attrs['location']=link['target'][1:]
            else:
                rid='rId'+str(link_rid);link_rid+=1;attrs['{'+RNS+'}id']=rid
                E.SubElement(sr,'{'+REL+'}Relationship',{'Id':rid,'Type':RNS+'/hyperlink','Target':link['target'],'TargetMode':'External'})
            E.SubElement(hyperlinks,Q('hyperlink'),attrs)
        before=next((i for i,x in enumerate(sheet) if x.tag in [Q('printOptions'),Q('pageMargins'),Q('pageSetup'),Q('headerFooter'),Q('rowBreaks'),Q('colBreaks'),Q('drawing'),Q('tableParts'),Q('extLst')]),len(sheet))
        sheet.insert(before,hyperlinks)
        additions[posixpath.dirname(path)+'/_rels/'+posixpath.basename(path)+'.rels']=serialize(sr,REL)
        additions[path]=E.tostring(sheet,encoding='utf-8',xml_declaration=True)
        rid='rId'+str(next_rid+n)
        new_elements.append(E.Element(Q('sheet'),{'name':name,'sheetId':str(next_sheet+n),'{'+RNS+'}id':rid}))
        E.SubElement(rels,'{'+REL+'}Relationship',{'Id':rid,'Type':RNS+'/worksheet','Target':'worksheets/'+posixpath.basename(path)})
        E.SubElement(types,'{'+CT+'}Override',{'PartName':'/'+path,'ContentType':'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'})
    for n,x in enumerate(new_elements):sheets.insert(n,x)
    # Preserve the namespace referenced only by mc:Choice/@Requires.
    wb.set('xmlns:x15','http://schemas.microsoft.com/office/spreadsheetml/2010/11/main')
    views=wb.find(Q('bookViews'))
    if views is not None:
        for v in views:v.attrib['activeTab']='0';v.attrib['firstSheet']='0'
    calc=wb.find(Q('calcPr'))
    if calc is not None:calc.attrib.update(fullCalcOnLoad='1',forceFullCalc='1')
    replacements['xl/workbook.xml']=E.tostring(wb,encoding='utf-8',xml_declaration=True)
    replacements['xl/_rels/workbook.xml.rels']=serialize(rels,REL)
    replacements['[Content_Types].xml']=serialize(types,CT)
    if 'docProps/app.xml' in src.namelist():
        app=E.fromstring(src.read('docProps/app.xml'));apns='http://schemas.openxmlformats.org/officeDocument/2006/extended-properties';vt='http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes'
        heading=app.find('{'+apns+'}HeadingPairs')
        if heading is not None:
            vector=heading.find('{'+vt+'}vector')
            if vector is not None:
                for n,v in enumerate(list(vector)[:-1]):
                    text=v.find('{'+vt+'}lpstr')
                    if text is not None and text.text=='Worksheets':list(vector)[n+1].find('{'+vt+'}i4').text=str(len(sheets))
        titles=app.find('{'+apns+'}TitlesOfParts')
        if titles is not None:
            vector=titles.find('{'+vt+'}vector')
            if vector is not None:
                for n,name in enumerate(['当前用例与补测','整改跟进']):
                    t=E.Element('{'+vt+'}lpstr');t.text=name;vector.insert(n,t)
                vector.attrib['size']=str(len(vector))
        replacements['docProps/app.xml']=E.tostring(app,encoding='utf-8',xml_declaration=True)
    with zipfile.ZipFile(DEST,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for info in src.infolist():z.writestr(copy.copy(info),replacements.get(info.filename,src.read(info.filename)))
        for path,data in additions.items():z.writestr(path,data)
    with zipfile.ZipFile(DEST) as z:
        assert z.testzip() is None
        final_paths=sheet_paths(z)
        for name,path in old_paths.items():assert z.read(path)==src.read(path),(name,'history sheet altered')
        for path in src.namelist():
            if path not in replacements:assert src.read(path)==z.read(path),path
        data=E.fromstring(z.read(final_paths['当前用例与补测']));cs={c.attrib['r']:c for c in data.iter(Q('c'))}
        summary=[int(float(value(cs[addr],[]))) for addr in ['A6','B6','C6','D6','A9','B9','C9','D9']]
        assert summary==[141,31,4,23,4,70,40,6],summary
        assert [value(cs['D'+str(c['row'])],[]) for c in p['cases']]==[c['result'] for c in p['cases']]
        assert [value(cs['J'+str(c['row'])],[]) for c in p['cases']]==[c['manual'] for c in p['cases']]
        assert all(value(cs[col+str(c['row'])],[]) in ['',None] for c in p['cases'] for col in 'KLM')
        errors=[c.attrib['r'] for c in data.iter(Q('c')) if c.attrib.get('t')=='e']
        assert not errors,errors
        all_ids={c['id'] for c in p['cases']}
        assert all(set(i['case_ids']).issubset(all_ids) for i in p['issues'])
        anchors={(e['run'],e['id']) for e in p['evidence']}
        links=0
        for name in ['当前用例与补测','整改跟进']:
            xml=E.fromstring(z.read(final_paths[name]))
            rp=posixpath.dirname(final_paths[name])+'/_rels/'+posixpath.basename(final_paths[name])+'.rels'
            rel={r.attrib['Id']:r.attrib for r in E.fromstring(z.read(rp))}
            for link in xml.iter(Q('hyperlink')):
                if 'location' in link.attrib:
                    target=link.attrib['location']
                    assert re.fullmatch(r"'当前用例与补测'!A\d+",target),target
                    assert 'A'+re.search(r'\d+$',target)[0] in cs,target
                    links+=1
                    continue
                target=rel[link.attrib['{'+RNS+'}id']]['Target']
                assert rel[link.attrib['{'+RNS+'}id']]['TargetMode']=='External'
                if target.startswith('#'):
                    raise AssertionError(target)
                elif '#' in target:
                    file,anchor=target.split('#',1);run,eid=anchor.split('-',1)
                    assert (OUT/file).is_file() and (run,eid) in anchors,target
                else:assert (OUT/target).is_file(),target
                links+=1
        for c in p['cases']:
            results=[s['result'] for s in c['steps']]
            aggregate='不通过' if '不通过' in results else '受阻' if '受阻' in results else '未执行' if all(v=='未执行' for v in results) else '通过' if all(v=='通过' for v in results) else None
            assert aggregate==c['result'],(c['id'],results,c['result'])
        for ev in p['evidence']:
            for f in ev['files']:
                assert hashlib.sha256((OUT/f['path']).read_bytes()).hexdigest()==f['sha256']
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==p['source_sha256']
pre_case=next(c for c in p['cases'] if c['id']=='UI-W2-56-1')
p['precondition_preview']='D'+str(pre_case['first_step_row'])+':H'+str(pre_case['first_step_row']+3)
(WORK/'plan.json').write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding='utf-8')
validation={'source_sha256_unchanged':p['source_sha256'],'output_sha256':hashlib.sha256(DEST.read_bytes()).hexdigest(),'history_four_sheets_byte_identical':True,'original_package_parts_preserved_except_workbook_index_and_style_extensions':True,'manual_original_preserved_and_new_fields_blank':True,'counts':p['counts'],'summary_cached_values':summary,'hyperlinks_checked':links,'evidence_files_hashed':sum(len(e['files']) for e in p['evidence']),'case_step_aggregation_passed':True,'formula_errors':errors,'normalization_notes':p['normalization_notes'],'native_excel_open_and_recalculation':'not performed','new_ui_execution':False}
(OUT/'文件校验.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(validation,ensure_ascii=False))
