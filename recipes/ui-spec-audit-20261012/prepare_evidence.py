from pathlib import Path
from html.parser import HTMLParser
from PIL import Image,ImageDraw,ImageFont
import json,shutil,hashlib

ROOT=Path('.');WORK=ROOT/'.work/ui-spec-audit-20261012'
OUT=ROOT/'outputs/frontend-audit/ui-spec-audit'
(OUT/'evidence').mkdir(parents=True,exist_ok=True)
source=json.loads((WORK/'review-source.json').read_text('utf-8'))
evidence=[]
for item in source:
    meta_path=WORK/'attachments'/item['ref']/'download.json'
    if not meta_path.is_file():continue
    meta=json.loads(meta_path.read_text('utf-8-sig'))
    assert meta.get('ok'),meta
    for n,x in enumerate(meta['data']['downloaded'],1):
        kind='原型截图' if x['field_id']=='fldCE1gw2Y' else '规范或设计稿'
        image_path=Path(x['saved_path']);assert image_path.is_file()
        name=f'{item["ref"]}_{"prototype" if kind=="原型截图" else "design"}_{n:02d}.png'
        target=OUT/'evidence'/name;shutil.copy2(image_path,target)
        with Image.open(target) as im:size=im.size
        evidence.append({'id':f'EV{len(evidence)+1:02d}','reviewRef':item['ref'],'recordId':item['record']['record_id'],'kind':kind,'module':'、'.join(item['record']['页面/模块']),'path':str(target),'relativePath':'evidence/'+name,'width':size[0],'height':size[1],'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
for label,name in [('本会话线上空态','current-search-empty.jpg'),('本会话线上字段名称','current-country-form.jpg'),('本地登录页','local-login.jpg'),('本地产品编排','prototype-builder-1440.jpg')]:
    src=ROOT/'outputs/frontend-audit/evidence'/name
    dst=OUT/'evidence'/name;shutil.copy2(src,dst)
    with Image.open(dst) as im:size=im.size
    evidence.append({'id':f'EV{len(evidence)+1:02d}','reviewRef':'补充','recordId':'','kind':label,'module':label,'path':str(dst),'relativePath':'evidence/'+name,'width':size[0],'height':size[1],'sha256':hashlib.sha256(dst.read_bytes()).hexdigest()})
(WORK/'evidence-index.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),'utf-8')
font_path='C:/Windows/Fonts/msyh.ttc'
font=ImageFont.truetype(font_path,18)
review_images=[e for e in evidence if e['reviewRef']!='补充']
for start in range(0,len(review_images),12):
    batch=review_images[start:start+12];canvas=Image.new('RGB',(1320,6*330),'#f0f3f7');draw=ImageDraw.Draw(canvas)
    for pos,e in enumerate(batch):
        x=(pos%2)*660;y=(pos//2)*330
        draw.text((x+12,y+5),f'{e["id"]} {e["reviewRef"]} {e["module"]} · {e["kind"]}',font=font,fill='#142840')
        with Image.open(e['path']) as im:
            im=im.convert('RGB');im.thumbnail((636,290));canvas.paste(im,(x+12,y+36))
    canvas.save(WORK/f'contact-{start//12+1}.jpg',quality=92)
print('Evidence',len(evidence),'Review attachments',len(review_images))

class SectionParser(HTMLParser):
    def __init__(self):super().__init__();self.heading=None;self.section='';self.tables=[]
    def handle_starttag(self,tag,attrs):
        if tag in ['h1','h2','h3']:self.heading={'tag':tag,'text':''}
        if tag=='sheet':self.tables.append({'section':self.section,**dict(attrs)})
    def handle_data(self,text):
        if self.heading:self.heading['text']+=text
    def handle_endtag(self,tag):
        if self.heading and self.heading['tag']==tag:self.section=self.heading['text'];self.heading=None
doc=json.loads((WORK/'norm-live.json').read_text('utf-8-sig'))['data']['document']
p=SectionParser();p.feed(doc['content'])
prefixes=['3.1.','3.2.','3.3.','3.4.','3.7.','4.2.','5.8.','5.11.','6.1.','6.4.','7.2.','9.2.']
selected=[t for t in p.tables if any(t['section'].strip().startswith(k) for k in prefixes)]
(WORK/'norm-selected-tables.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),'utf-8')
(WORK/'norm-tables').mkdir(exist_ok=True)
for i in range(3):
    commands=[]
    for n,t in enumerate(selected,1):
        if (n-1)%3!=i:continue
        commands.append(f'lark-cli sheets +cells-get --as user --spreadsheet-token {t["token"]} --sheet-id {t["sheet-id"]} --range A1:J60 --include value --output-path .work/ui-spec-audit-20261012/norm-tables/N{n:02d}.json --json')
    (WORK/f'norm-download-{i}.ps1').write_text('\n'.join(commands),'utf-8')
print('Selected norm tables',len(selected))
