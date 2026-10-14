import json
from html.parser import HTMLParser
from pathlib import Path
p=Path(__file__).parent
d=json.loads((p/'norm.json').read_text(encoding='utf-8-sig'))['data']['document']
class P(HTMLParser):
    def __init__(self):super().__init__();self.text=[];self.sheets=[];self.heading='';self.h=False
    def handle_starttag(self,t,a):
        if t in ['h1','h2','h3','h4']:self.h=True;self.heading='';self.text.append('\n')
        if t in ['p','li','tr']:self.text.append('\n')
        if t=='sheet':self.sheets.append({'section':self.heading,**dict(a)})
    def handle_endtag(self,t):
        if t in ['h1','h2','h3','h4']:self.h=False;self.text.append('\n')
    def handle_data(self,x):
        self.text.append(x)
        if self.h:self.heading+=x
v=P();v.feed(d['content']);text=''.join(v.text)
(p/'norm-text.txt').write_text(text,encoding='utf-8')
(p/'norm-sheets.json').write_text(json.dumps(v.sheets,ensure_ascii=False,indent=2),encoding='utf-8')
old=json.loads(Path('./recipes/ui-spec-audit-20261012/norm-live.json').read_text(encoding='utf-8-sig'))['data']['document']
print('revision',d['revision_id'],'unchanged_xml',d['content']==old['content'],'sheets',len(v.sheets))
for term in ['未保存','焦点','键盘','遮挡','加载','4.5','5.6','5.7','5.17','768','1280','分页']:
    start=0;count=0
    while (i:=text.find(term,start))>=0 and count<3:
        print('\nEXCERPT',term,text[max(0,i-120):i+420]);start=i+len(term);count+=1
print('\nSHEETS')
for s in v.sheets:print(s)
