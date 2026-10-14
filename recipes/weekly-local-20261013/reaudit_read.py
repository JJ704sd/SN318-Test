import json, sys
from pathlib import Path
work=Path(__file__).parent
mode=sys.argv[1]
if mode in ('business','templates'):
    data=json.loads((work/'rewritten-cases.json').read_text('utf-8'))
    lo=int(sys.argv[2]); hi=int(sys.argv[3])
    for x in data[mode][lo:hi]:
        print('\n'+x['id']+' | '+x['title']+' | '+x['gate'])
        print('前置：'+x['precondition'].replace('\n',' / '))
        print('步骤：'+x['steps'].replace('\n',' / '))
        print('预期：'+x['expected'].replace('\n',' / '))
        print('依据：'+x['notes'].split('【规范依据】')[-1].split('\n')[0])
elif mode=='reference':
    d=json.loads((work/'reference-analysis.json').read_text('utf-8'))
    for x in d[0]['rows'][-18:]:
        vals=x['values'][:7]
        for i,v in enumerate(vals):
            if i==2: v='[前置内容省略]'
            print(i+1,str(v))
elif mode=='scope':
    d=json.loads((work/'rewritten-cases.json').read_text('utf-8'))
    for x in d['scope']:
        print(x['seq'],x['level2'],x['feature'],x['source'],x['w2'],x['gate'])
elif mode=='sheets':
    d=json.loads((work/'norm-sheets.json').read_text('utf-8'))
    for x in d:print(x['section'],x['sheet-id'])
elif mode=='source_check':
    a=json.loads((work/'norm.json').read_text('utf-8-sig'))['data']['document']
    b=json.loads((work/'norm-reaudit-live.json').read_text('utf-8-sig'))['data']['document']
    print('规范正文revision',b['revision_id'],'正文与原快照相同',a['content']==b['content'],'含5.17', '5.17' in b['content'])
    for name in ['stage-values','boundary-values']:
        print('\n'+name)
        rows=json.loads((work/(name+'.json')).read_text('utf-8-sig'))
        for i,r in enumerate(rows):
            if any(r):print(i+1,' | '.join(str(x) for x in r if x))
elif mode=='tail_business':
    d=json.loads((work/'rewritten-cases.json').read_text('utf-8'))
    for x in d['business'][-4:]:
        print(x['id'],x['title'],x['precondition'],x['steps'],x['expected'],sep='\n')
elif mode=='norm_section':
    import re
    from html.parser import HTMLParser
    class Text(HTMLParser):
        def __init__(self):super().__init__();self.parts=[]
        def handle_data(self,d):self.parts.append(d)
        def handle_starttag(self,t,a):
            if t in ['p','li','tr','h1','h2','h3','h4','br']:self.parts.append('\n')
            if t in ['td','th']:self.parts.append(' | ')
    d=json.loads((work/'norm-reaudit-live.json').read_text('utf-8-sig'))['data']['document']['content']
    start=re.search(r'<h[1-4][^>]*>(?:<b>)?'+re.escape(sys.argv[2]),d)
    if not start:raise ValueError(sys.argv[2])
    end=d.find('<h',start.end())
    p=Text();p.feed(d[start.start():end if end>=0 else len(d)])
    print(''.join(p.parts))
elif mode=='new_tables':
    for f in sorted((work/'norm-tables').glob('*-reaudit.json')):
        d=json.loads(f.read_text('utf-8-sig'))
        assert not d['has_more']
        print('\n'+f.stem+' | revision '+str(d['revision']))
        for r in d['ranges']:
            assert not r.get('truncated')
            for row in r['cells']:print(' | '.join(str(c.get('value','')) for c in row))
