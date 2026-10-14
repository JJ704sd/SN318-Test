from pathlib import Path
import json,copy,math,re,zipfile,posixpath,hashlib,subprocess
import xml.etree.ElementTree as E

ROOT=Path('.');WORK=ROOT/'.work/w2-master-reaudit-20261014';OUT=ROOT/'outputs/ui-audit-20261014/20261014-master-data-reaudit'
plan=json.loads((WORK/'workbook-plan.json').read_text(encoding='utf-8'));record=json.loads(Path(plan['record']).read_text(encoding='utf-8'))
source=Path(plan['source']);dest=Path(plan['destination']);artifact=WORK/'artifact-export.xlsx'
NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';Q=lambda x:'{'+NS+'}'+x
E.register_namespace('',NS);E.register_namespace('r',RNS)
def paths(z):
 rel={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 return {s.attrib['name']:rel[s.attrib['{'+RNS+'}id']].lstrip('/') if rel[s.attrib['{'+RNS+'}id']].startswith('/') else posixpath.normpath('xl/'+rel[s.attrib['{'+RNS+'}id']]) for s in E.fromstring(z.read('xl/workbook.xml')).find(Q('sheets'))}
def strings(z):return list(E.fromstring(z.read('xl/sharedStrings.xml'))) if 'xl/sharedStrings.xml' in z.namelist() else []
def val(c,ss):
 if c is None:return ''
 if c.attrib.get('t')=='inlineStr':return ''.join(c.find(Q('is')).itertext())
 n=c.find(Q('v'));v=n.text if n is not None else ''
 return ''.join(ss[int(v)].itertext()) if c.attrib.get('t')=='s' else v
def col(s):
 n=0
 for x in re.match('[A-Z]+',s).group():n=n*26+ord(x)-64
 return n
def letter(n):
 r=''
 while n:n,k=divmod(n-1,26);r=chr(65+k)+r
 return r
expected={};formulas={(f['sheet'],f['cell']):f for f in plan['formulas']}
for block in plan['blocks']:
 a=block['range'].split(':')[0];c=col(a);r=int(re.search(r'\d+',a).group())
 for i,row in enumerate(block['values']):
  for j,value in enumerate(row):expected[(block['sheet'],letter(c+j)+str(r+i))]=value

replacements={};growth=[]
with zipfile.ZipFile(source) as old,zipfile.ZipFile(artifact) as authored:
 op,ap=paths(old),paths(authored);os,ass=strings(old),strings(authored)
 styles=E.fromstring(old.read('xl/styles.xml'));xfs=styles.find(Q('cellXfs'));cache={}
 def wrap(style):
  if style in cache:return cache[style]
  xf=copy.deepcopy(xfs[int(style)]);a=xf.find(Q('alignment'))
  if a is None:a=E.SubElement(xf,Q('alignment'))
  a.attrib.update(wrapText='1',vertical='top');xf.attrib['applyAlignment']='1';new=str(len(xfs));xfs.append(xf);cache[style]=new;return new
 template=E.fromstring(old.read(op['通用模板UI与交互用例']));statusstyles={val(c,os):c.attrib.get('s','0') for c in template.iter(Q('c')) if re.match(r'^H\d+$',c.attrib['r'])}
 for name,path in op.items():
  wanted={addr:v for (n,addr),v in expected.items() if n==name}
  if not wanted:continue
  base=E.fromstring(old.read(path));auth=E.fromstring(authored.read(ap[name]));data=base.find(Q('sheetData'))
  bcs={c.attrib['r']:c for c in base.iter(Q('c'))};acs={c.attrib['r']:c for c in auth.iter(Q('c'))};rows={int(r.attrib['r']):r for r in data}
  end=base.find(Q('dimension')).attrib['ref'].split(':')[-1];maxcol=col(end);maxrow=int(re.search(r'\d+',end).group())
  headerrows={int(re.search(r'\d+',b['header']).group()) for b in plan['blocks'] if b['sheet']==name and b.get('header')}
  widths={k:v for b in plan['blocks'] if b['sheet']==name for k,v in b.get('widths',{}).items()}
  columns=base.find(Q('cols'))
  if columns is None:columns=E.Element(Q('cols'));base.insert(list(base).index(data),columns)
  for lettercol,width in widths.items():
   if col(lettercol)>maxcol:E.SubElement(columns,Q('col'),{'min':str(col(lettercol)),'max':str(col(lettercol)),'width':str(width),'customWidth':'1'})
  for addr,v in wanted.items():
   assert addr in acs,(name,addr)
   assert addr not in bcs or not val(bcs[addr],os),(name,addr,'overwrite')
   rn=int(re.search(r'\d+',addr).group());cn=col(addr);row=rows.get(rn)
   if row is None:row=E.SubElement(data,Q('row'),{'r':str(rn)});rows[rn]=row
   c=copy.deepcopy(acs[addr]);f=formulas.get((name,addr))
   if f:
    assert c.find(Q('f')).text==f['formula'].lstrip('=')
    assert float(val(c,ass))==f['expected'],(addr,val(c,ass),f['expected'])
   else:
    assert val(c,ass)==str(v),(name,addr,val(c,ass),v)
    for node in list(c):
     if node.tag in [Q('v'),Q('is'),Q('f')]:c.remove(node)
    c.attrib['t']='inlineStr';i=E.SubElement(c,Q('is'));t=E.SubElement(i,Q('t'));t.text=str(v)
    if str(v).strip()!=str(v):t.attrib['{http://www.w3.org/XML/1998/namespace}space']='preserve'
   headercell=bcs.get('A184',bcs.get('A1',next(iter(bcs.values())))) if name=='范围与依据' else bcs.get('A35',bcs['A1']) if name=='修改清单' else bcs['A1']
   style=headercell.attrib.get('s','0') if rn in headerrows else statusstyles.get(str(v),bcs.get('I2',bcs.get('B2',bcs['A1'])).attrib.get('s','0'))
   c.attrib['s']=wrap(style)
   if addr in bcs:row.remove(bcs[addr])
   row.append(c)
  for rn,row in rows.items():
   row[:]=sorted(row,key=lambda c:col(c.attrib['r']))
   cells=[c for c in row if c.attrib['r'] in wanted]
   if not cells:continue
   def width(cn):return max(5,next((float(c.attrib.get('width','13'))*.88 for c in columns if int(c.attrib['min'])<=cn<=int(c.attrib['max'])),11))
   lines=max(sum(max(1,math.ceil(sum(2 if ord(x)>127 else 1 for x in text)/width(col(c.attrib['r'])))) for text in val(c,ass if c.find(Q('f')) is not None else []).split('\n')) for c in cells)
   oldheight=float(row.attrib.get('ht','15'));target=max(oldheight,min(lines*13+12,409))
   row.attrib.update(ht=str(target),customHeight='1')
   if rn<=maxrow and target>oldheight:growth.append({'sheet':name,'row':rn,'before':oldheight,'after':target})
  data[:]=sorted(data,key=lambda r:int(r.attrib['r']))
  for row in data:
   if 'spans' in row.attrib:row.attrib['spans']='1:'+str(max(col(c.attrib['r']) for c in row))
  lastcol=max(col(c.attrib['r']) for c in data.iter(Q('c')));base.find(Q('dimension')).attrib['ref']='A1:'+letter(lastcol)+str(max(rows))
  # The status dropdown was authored with Artifact Tool. Preserve existing
  # validations and append only its new N2:N102 rule.
  if name=='业务UI与交互用例':
   ad=auth.find(Q('dataValidations'))
   newrules=[copy.deepcopy(v) for v in ([] if ad is None else ad) if v.attrib.get('sqref')=='N2:N102']
   assert len(newrules)==1
   bd=base.find(Q('dataValidations'))
   if bd is None:
    bd=E.Element(Q('dataValidations'));after=next((i for i,n in enumerate(base) if n.tag in [Q('hyperlinks'),Q('printOptions'),Q('pageMargins'),Q('pageSetup'),Q('headerFooter'),Q('tableParts')]),len(base));base.insert(after,bd)
   bd.extend(newrules);bd.attrib['count']=str(len(bd))
  replacements[path]=E.tostring(base,encoding='utf-8',xml_declaration=True)
 xfs.attrib['count']=str(len(xfs));replacements['xl/styles.xml']=E.tostring(styles,encoding='utf-8',xml_declaration=True)
 for path in old.namelist():
  if path.startswith('xl/tables/') and path.endswith('.xml'):
   t=E.fromstring(old.read(path))
   if t.attrib.get('name')!='BusinessUICases':continue
   t.attrib['ref']='A1:Q102';t.find(Q('autoFilter')).attrib['ref']='A1:Q102';cols=t.find(Q('tableColumns'))
   for n in range(len(cols)+1,18):E.SubElement(cols,Q('tableColumn'),{'id':str(n),'name':expected[('业务UI与交互用例',letter(n)+'1')]})
   cols.attrib['count']='17';replacements[path]=E.tostring(t,encoding='utf-8',xml_declaration=True)
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for info in old.infolist():z.writestr(copy.copy(info),replacements.get(info.filename,old.read(info.filename)))
 preserved=0
 with zipfile.ZipFile(dest) as new:
  np=paths(new);ns=strings(new)
  for name,path in op.items():
   a=E.fromstring(old.read(path));b=E.fromstring(new.read(np[name]));bcs={c.attrib['r']:c for c in b.iter(Q('c'))}
   for c in a.iter(Q('c')):
    assert E.tostring(c)==E.tostring(bcs[c.attrib['r']]),(name,c.attrib['r']);preserved+=1
   for feature in ['sheetViews','mergeCells','conditionalFormatting','sheetProtection','pageMargins','pageSetup','hyperlinks']:
    assert [E.tostring(x) for x in a.findall(Q(feature))]==[E.tostring(x) for x in b.findall(Q(feature))],(name,feature)
   av=a.find(Q('dataValidations'));bv=b.find(Q('dataValidations'))
   if av is not None:assert [E.tostring(x) for x in av]==[E.tostring(x) for x in list(bv)[:len(av)]]
   for (sheet,addr),v in expected.items():
    if sheet!=name:continue
    f=formulas.get((name,addr))
    assert bcs[addr].find(Q('f')).text==f['formula'].lstrip('=') and float(val(bcs[addr],ns))==f['expected'] if f else val(bcs[addr],ns)==str(v),(name,addr)
  assert all(old.read(p)==new.read(p) for p in old.namelist() if p not in replacements)
  assert new.testzip() is None
assert hashlib.sha256(Path(record['source_workbook']).read_bytes()).hexdigest()==record['source_sha256'],'Source workbook changed during run'
git=lambda *args:subprocess.check_output(['git','-c','safe.directory=./pcs-front','-C',str(ROOT/'pcs-front'),*args])
untracked=[]
for raw in git('ls-files','--others','--exclude-standard','-z').split(b'\0'):
 if raw:
  path=raw.decode('utf-8');p=ROOT/'pcs-front'/path
  if p.is_file():untracked.append({'path':path,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
fp=hashlib.sha256(git('status','--porcelain=v1','-z')+git('diff','--binary')+git('diff','--cached','--binary')+json.dumps(untracked,sort_keys=True).encode()).hexdigest()
assert fp==record['environment']['worktree_fingerprint'],'Repository changed during run'
result={'original_cells_preserved':preserved,'original_values_formulas_styles':'all preserved','manual_J2_J3_preserved':True,'native_table_extended':'BusinessUICases A1:Q102','new_status_dropdown':'N2:N102','formula_caches_verified':{f['cell']:f['expected'] for f in plan['formulas']},'unrelated_package_parts_preserved':True,'source_and_repository_unchanged':True,'row_height_growth':growth,'output_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'counts':record['counts']}
(OUT/'文件校验.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='row_height_growth'},ensure_ascii=False))
