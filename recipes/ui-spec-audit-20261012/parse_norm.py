from pathlib import Path
from html.parser import HTMLParser
import json

WORK=Path('./recipes/ui-spec-audit-20261012')
doc=json.loads((WORK/'norm-live.json').read_text('utf-8-sig'))['data']['document']
class Parser(HTMLParser):
    def __init__(self):
        super().__init__();self.parts=[];self.sheets=[];self.images=[];self.headings=[];self.current=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ['h1','h2','h3','h4']:
            self.current={'tag':tag,'id':a.get('id'),'text':''};self.parts.append('\n')
        if tag=='sheet':self.sheets.append(a)
        if tag in ['image','img']:self.images.append(a)
        if tag in ['p','tr','li']:self.parts.append('\n')
    def handle_endtag(self,tag):
        if self.current and tag==self.current['tag']:
            self.headings.append(self.current);self.current=None;self.parts.append('\n')
        if tag in ['p','tr','li']:self.parts.append('\n')
    def handle_data(self,data):
        self.parts.append(data)
        if self.current:self.current['text']+=data
p=Parser();p.feed(doc['content'])
text=''.join(p.parts)
(WORK/'norm-text.txt').write_text(text,'utf-8')
meta={'document_id':doc['document_id'],'revision_id':doc['revision_id'],'headings':p.headings,'sheets':p.sheets,'images':p.images}
(WORK/'norm-index.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),'utf-8')
print('Norm revision',doc['revision_id'],'Sheets',len(p.sheets),'Images',len(p.images))
for h in p.headings:print(h['text'],h['id'])
for term in ['5.17','行内编辑','Tabs','贴边','圆角']:
 pos=text.find(term)
 print('EXCERPT',term,repr(text[max(0,pos-50):pos+1200]))
