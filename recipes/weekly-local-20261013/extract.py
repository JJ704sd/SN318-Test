import json
from pathlib import Path
root=Path(__file__).parent
for name in ['schedule','stage','boundary']:
    raw=json.loads((root/f'{name}.json').read_text(encoding='utf-8-sig'))
    cells=raw['ranges'][0]['cells']
    rows=[[c.get('value','') for c in row] for row in cells]
    (root/f'{name}-values.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    print('\nSOURCE',name,'has_more',raw.get('has_more'))
    if name=='schedule':
        for n,r in enumerate(rows[:4],1):print(n,json.dumps(r,ensure_ascii=False))
        carry=['']*4; scope=[]
        for n,r in enumerate(rows[4:],5):
            for j in [1,2,3]:
                if r[j]:carry[j]=r[j]
            if len(r)>9 and r[9] and str(r[0]).isdigit():
                item={'row':n,'seq':str(r[0]),'module':carry[1],'level1':carry[2],'level2':carry[3],'feature':r[4],'priority':r[5],'source':r[6],'note':r[7],'w2':r[9]}
                scope.append(item); print(json.dumps(item,ensure_ascii=False))
        (root/'scope.json').write_text(json.dumps(scope,ensure_ascii=False,indent=2),encoding='utf-8')
    else:
        for n,r in enumerate(rows,1):
            if any(r):print(n,' | '.join(str(x) for x in r if x))
print('\nREVIEWS')
for row in (root/'review.ndjson').read_text(encoding='utf-8-sig').splitlines():
    r=json.loads(row)
    print(json.dumps({k:v for k,v in r.items() if k not in ['截图','框架/规范依据/设计稿截图','备注']},ensure_ascii=False))
