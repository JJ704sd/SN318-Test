import hashlib
import json
import re
from pathlib import Path
from pypdf import PdfReader

root = Path('./artifacts/ui-audit-20261014/weekly-plan-20261014')
manifest = json.loads((root/'sources/编制与校验记录.json').read_text(encoding='utf-8'))
content = json.loads((root/'sources/工作清单内容.json').read_text(encoding='utf-8'))
md = Path(manifest['outputs']['.md']['path']).read_text(encoding='utf-8')
pdf = PdfReader(manifest['outputs']['.pdf']['path'])
normalize = lambda s: re.sub(r'\s+','',s)
pdftext = normalize(''.join(page.extract_text() for page in pdf.pages))
assert len(pdf.pages)==1
expected = [content['title'],content['meta'],content['note']]
for sec in content['sections']:
    expected += [sec['heading']]+sec.get('items',[])
    if 'table' in sec:
        for row in [sec['table']['headers']]+sec['table']['rows']:
            expected.extend(row)
for text in expected:
    assert text in md, f'Missing MD text: {text}'
    assert normalize(text) in pdftext, f'Missing PDF text: {text}'
hash_checks = {}
for source in manifest['sources']:
    if source['sha256']:
        # Python's read shares the workbook when it is open in Excel.
        actual = hashlib.sha256(Path(source['path']).read_bytes()).hexdigest()
        assert actual == source['sha256'], source['id']
        hash_checks[source['id']] = True
for item in manifest['outputs'].values():
    assert hashlib.sha256(Path(item['path']).read_bytes()).hexdigest() == item['sha256']
annotations = [a.get_object() for page in pdf.pages for a in page.get('/Annots',[])]
links = [a['/A']['/URI'] for a in annotations if a.get('/A') and a['/A'].get('/URI')]
assert len(links)==1
assert any('U1ugs7S8ohzltJtSVYxcBrnvnLf' in link for link in links)
fonts=[]
for page in pdf.pages:
    for ref in page['/Resources']['/Font'].values():
        font=ref.get_object()
        if font.get('/FontDescriptor'):
            descriptor=font['/FontDescriptor'].get_object()
            assert '/FontFile2' in descriptor or '/FontFile3' in descriptor
            fonts.append(str(font['/BaseFont']))
guide=Path(manifest['usage_guide']['path'])
assert hashlib.sha256(guide.read_bytes()).hexdigest()==manifest['usage_guide']['sha256']
local_links=re.findall(r'\]\(<([^>]+)>\)',guide.read_text(encoding='utf-8'))
assert all(Path(path).is_file() for path in local_links)
history=root/'历史版本/精简前_3页版'
old=json.loads((history/'sources/编制与校验记录.json').read_text(encoding='utf-8'))
for item in old['outputs'].values():
    file=history/Path(item['path']).name
    assert hashlib.sha256(file.read_bytes()).hexdigest()==item['sha256']
assert len(PdfReader(str(history/Path(old['outputs']['.pdf']['path']).name)).pages)==3
result = {'pages':len(pdf.pages),'pdf_md_shared_texts_checked':len(expected),'local_sources_unchanged':hash_checks,
          'pdf_links':len(links),'usage_guide_links_checked':len(local_links),'previous_version_preserved':True,
          'embedded_fonts':sorted(set(fonts)),'visual_qa':'Pending final page inspection'}
(root/'sources/最终交付校验.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
