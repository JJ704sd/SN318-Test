import hashlib,json,re,zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

FILES={
 'current':Path('./artifacts/ui-audit-20261014/20261014-ui-audit/SN318_W2_UI与交互_20261014_dev_b2efcdb_dirty-5c6bc530.xlsx'),
 'original':Path('./private-local-path')}
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','p':'http://schemas.openxmlformats.org/package/2006/relationships'}
RID='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'

def read(path):
 with zipfile.ZipFile(path) as z:
  shared=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   shared=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS)]
  wb=ET.fromstring(z.read('xl/workbook.xml'))
  rels={e.attrib['Id']:e.attrib['Target'] for e in ET.fromstring(z.read('xl/_rels/workbook.xml.rels')).findall('p:Relationship',NS)}
  sheets={}
  for s in wb.findall('s:sheets/s:sheet',NS):
   target=rels[s.attrib[RID]]
   xml=ET.fromstring(z.read(target.lstrip('/') if target.startswith('/') else 'xl/'+target))
   cells={}
   for c in xml.findall('s:sheetData/s:row/s:c',NS):
    v=c.find('s:v',NS);f=c.find('s:f',NS)
    if f is not None:value='='+f.text
    elif c.attrib.get('t')=='s':value=shared[int(v.text)] if v is not None else ''
    elif c.attrib.get('t')=='inlineStr':value=''.join(c.find('s:is',NS).itertext())
    else:value=v.text if v is not None else ''
    if value!='':cells[c.attrib['r']]=value
   sheets[s.attrib['name']]={'dimension':xml.find('s:dimension',NS).attrib['ref'],'cells':cells}
  return sheets

books={k:read(p) for k,p in FILES.items()}
result={}
for key,sheets in books.items():
 print('FILE',key,'sha256',hashlib.sha256(FILES[key].read_bytes()).hexdigest())
 print('SHEETS',key,{n:{'dimension':d['dimension'],'nonempty':len(d['cells'])} for n,d in sheets.items()})
 for name in ['通用模板UI与交互用例','业务UI与交互用例']:
  cells=sheets[name]['cells']
  ids={int(re.sub(r'\D','',r)):v for r,v in cells.items() if r.startswith('A') and re.match(r'^UI-[A-Z0-9-]+$',v)}
  print('HEADERS',key,name,{chr(65+i):cells.get(chr(65+i)+'1','') for i in range(13)})
  print('IDS',key,name,dict(Counter(v.split('-')[1] for v in ids.values())), 'firstlast',list(ids.items())[:2],list(ids.items())[-2:])
  for col in ['H','J','K']:
   statuses=Counter(cells.get(col+str(r),'') for r in ids)
   print('STATUS',key,name,col,dict(statuses))
  if name=='通用模板UI与交互用例':
   print('MANUAL',key,[(r,cells.get('J'+str(r))) for r in ids if cells.get('J'+str(r))])
   for row in [2,6,12,20,24,29,36]:
    print('CASE_SAMPLE',key,row,{c:cells.get(c+str(row),'')[:550] for c in ['A','B','H','I','J','K','L','M']})
 for name in ['修改清单','范围与依据']:
  c=sheets[name]['cells']
  if name=='修改清单':
   rows={int(re.sub(r'\D','',a)):v for a,v in c.items() if a.startswith('A')}
   print('ISSUE_IDS',key,rows)
  else:
   interesting=[(r,v[:160]) for r,v in c.items() if any(term in v for term in ['模板统计','部分证据','基线','通过9','受阻21','本轮执行','25条','38个','16条','不通过10'])]
   print('SCOPE',key,interesting[-20:])

old=books['original'];new=books['current']
changed=[];unchanged=0;added=0
for name,d in old.items():
 for address,value in d['cells'].items():
  if new[name]['cells'].get(address)!=value:changed.append({'sheet':name,'cell':address,'old':value,'new':new[name]['cells'].get(address)})
  else:unchanged+=1
 added+=sum(a not in d['cells'] for a in new[name]['cells'])
print('DIFF',json.dumps({'preserved_nonempty_cells':unchanged,'changed_old_cells':changed[:12],'added_nonempty_cells':added},ensure_ascii=False))

cells=new['通用模板UI与交互用例']['cells'];oldcells=old['通用模板UI与交互用例']['cells']
print('TEMPLATE_STATUS_CHANGES',json.dumps([{'id':cells.get('A'+str(r)),'history':oldcells.get('H'+str(r)),'current':cells.get('K'+str(r))} for r in range(2,42) if oldcells.get('H'+str(r))!=cells.get('K'+str(r))],ensure_ascii=False))
print('NEW_BUSINESS',json.dumps({'status':dict(Counter(new['业务UI与交互用例']['cells'].get('K'+str(r),'') for r in range(78,103))),'ids':[new['业务UI与交互用例']['cells'].get('A'+str(r)) for r in range(78,103)]},ensure_ascii=False))
