import json
from html.parser import HTMLParser
from pathlib import Path
work=Path(__file__).parent
doc=json.loads((work.parent/'weekly-local-20261013'/'norm-reaudit-live.json').read_text('utf-8-sig'))['data']['document']
class Parser(HTMLParser):
    def __init__(self):super().__init__();self.items=[];self.section='';self.heading=False
    def handle_starttag(self,tag,attrs):
        if tag in ('h1','h2','h3','h4'):self.section='';self.heading=True
        if tag=='source':self.items.append({'section':self.section,**dict(attrs)})
    def handle_data(self,text):
        if self.heading:self.section+=text
    def handle_endtag(self,tag):
        if tag in ('h1','h2','h3','h4'):self.heading=False
p=Parser();p.feed(doc['content'])
(work/'norm-figures.json').write_text(json.dumps(p.items,ensure_ascii=False,indent=2),'utf-8')
for x in p.items: print(x.get('section'),x.get('name'),x.get('token'),x.get('size'))
