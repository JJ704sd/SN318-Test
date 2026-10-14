from pathlib import Path
from collections import Counter
import zipfile,xml.etree.ElementTree as E,posixpath,json,re,hashlib
paths=[Path('./artifacts/template-reaudit/受阻16条核实/SN318_W2_UI与交互测试用例_16条受阻核实_含人工二次复核.xlsx'),Path('./artifacts/ui-audit-20261014/20261014-ui-audit/SN318_W2_UI与交互_20261014_dev_b2efcdb_dirty-5c6bc530.xlsx')]
ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'; q=lambda t:'{'+ns+'}'+t
books=[]
for p in paths:
 with zipfile.ZipFile(p) as z:
  strings=[''.join(n.itertext()) for n in E.fromstring(z.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in z.namelist() else []
  targets={n.attrib['Id']:n.attrib['Target'] for n in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  sheets={}
  for s in E.fromstring(z.read('xl/workbook.xml')).find(q('sheets')):
   rel=targets[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
   xml=E.fromstring(z.read(rel.lstrip('/') if rel.startswith('/') else posixpath.normpath('xl/'+rel)))
   cells={}
   for c in xml.iter(q('c')):
    v=c.find(q('v'));value=v.text if v is not None else ''
    if c.attrib.get('t')=='s':value=strings[int(value)]
    elif c.attrib.get('t')=='inlineStr':value=''.join(c.find(q('is')).itertext())
    cells[c.attrib['r']]=value
   sheets[s.attrib['name']]={'dimension':xml.find(q('dimension')).attrib['ref'],'cells':cells}
  books.append(sheets)
  print(json.dumps({'book':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sheets':{k:v['dimension'] for k,v in sheets.items()},'headers':{k:[v['cells'].get(chr(65+i)+'1','') for i in range(13)] for k,v in sheets.items()}},ensure_ascii=False))
for i,b in enumerate(books):
 t=b['通用模板UI与交互用例']['cells'];bu=b['业务UI与交互用例']['cells'];m=b['修改清单']['cells']
 print(json.dumps({'book':i+1,'template_original_H':dict(Counter(t.get('H'+str(r),'') for r in range(2,42))),'template_current_K':dict(Counter(t.get('K'+str(r),'') for r in range(2,42))) if i else None,'manual_J':[(r,t.get('J'+str(r))) for r in range(2,42) if t.get('J'+str(r))],'business_original_H':dict(Counter(bu.get('H'+str(r),'') for r in range(2,78))),'business_new_K':dict(Counter(bu.get('K'+str(r),'') for r in range(78,103))) if i else None,'old_mod_ids':[(r,m.get('A'+str(r)),m.get('B'+str(r)),m.get('K'+str(r))) for r in range(2,34)],'new_mod_header':[m.get(chr(65+j)+'35','') for j in range(15)] if i else None},ensure_ascii=False))
preserved=sum(len(v['cells']) for v in books[0].values());diff=[]
for name,s in books[0].items():
 for addr,value in s['cells'].items():
  if books[1][name]['cells'].get(addr,'')!=value:diff.append((name,addr,value,books[1][name]['cells'].get(addr,'')))
print(json.dumps({'original_cells_compared':preserved,'original_value_changes':diff},ensure_ascii=False))
sc=books[1]['范围与依据']['cells']
print(json.dumps({'current_summary':[[sc.get(chr(65+j)+str(r),'') for j in range(8)] for r in range(184,197)]},ensure_ascii=False))
