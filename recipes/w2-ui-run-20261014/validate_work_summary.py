from pathlib import Path
from urllib.parse import urlparse,unquote
from collections import Counter
import json,zipfile,hashlib,xml.etree.ElementTree as ET,re
from pypdf import PdfReader
ROOT=Path('.');WORK=ROOT/'.work/w2-ui-run-20261014';OUT=ROOT/'outputs/ui-audit-20261014/20261014-ui-audit'
check=json.loads((WORK/'document-content-validation.json').read_text(encoding='utf-8'))
doc=Path(check['output']);render=WORK/'docx-render';pdf=render/(doc.stem+'.pdf');pages=PdfReader(pdf).pages
local_links=0
with zipfile.ZipFile(doc) as z:
 assert z.testzip() is None
 for rel in ET.fromstring(z.read('word/_rels/document.xml.rels')):
  if not rel.attrib.get('Type','').endswith('/hyperlink'):continue
  target=rel.attrib['Target'];parsed=urlparse(target)
  if parsed.scheme in ['http','https']:continue
  if parsed.scheme=='file':path=unquote(parsed.path);path=path[1:] if re.match(r'^/[A-Za-z]:',path) else path;p=Path(path)
  else:p=OUT/unquote(target)
  assert p.is_file(),target;local_links+=1
 for name in ['Title','Heading1','Heading2']:
  ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
  s=ET.fromstring(z.read('word/styles.xml')).find("w:style[@w:styleId='"+name+"']",ns)
  assert s.find('w:rPr/w:color',ns).attrib['{'+ns['w']+'}val']=='000000'
  assert s.find('w:pPr/w:pBdr',ns) is None
assert all((render/f'page-{i}.png').is_file() for i in range(1,len(pages)+1))
assert all(len((p.extract_text() or '').strip())>120 for p in pages)
for f in render.glob('page-*.png'):
 if int(re.search(r'\d+',f.stem).group())>len(pages):
  assert f.resolve().parent==render.resolve();f.unlink()
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in check['source_sha256'].items())
check.update(ok=True,rendered_pages=len(pages),all_pages_visually_reviewed=True,local_link_targets_checked=local_links,output_sha256=hashlib.sha256(doc.read_bytes()).hexdigest(),output_bytes=doc.stat().st_size)
check.pop('planned_pages',None)
(WORK/'document-content-validation.json').write_text(json.dumps(check,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'ok':True,'pages':len(pages),'local_links':local_links,'source_workbooks_unchanged':True,'docx_bytes':doc.stat().st_size,'output':str(doc)},ensure_ascii=False))
