from pathlib import Path
from collections import Counter
import json, re, hashlib, gzip

ROOT = Path('./pcs-front')
OUT = Path('./artifacts/frontend-audit')
files = list((ROOT/'src').rglob('*'))
counts = Counter(p.suffix for p in files if p.is_file())
lock = json.loads((ROOT/'package-lock.json').read_text('utf-8'))
versions = {name: lock['packages']['node_modules/'+name]['version'] for name in ['vue','vite','vue-router','pinia','@baiyun/template-core','@arco-design/web-vue','fastify']}
proto = ROOT/'docs/other/SN318系统 · 产品、订单与合单配载交互原型_files/saved_resource.html'
proto_text = proto.read_text('utf-8')
def luminance(color):
    rgb = [int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear = [v/12.92 if v<=0.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    return sum(a*b for a,b in zip(linear,[.2126,.7152,.0722]))
def contrast(a,b):
    bright,dark = sorted([luminance(a),luminance(b)],reverse=True)
    return round((bright+.05)/(dark+.05),2)
assets=[]
for p in (ROOT/'dist/assets').glob('*'):
    if p.is_file():
        assets.append({'name':p.name,'bytes':p.stat().st_size,'gzipBytes':len(gzip.compress(p.read_bytes()))})
facts={
    'sourceFileCounts':dict(counts),
    'lockedVersions':versions,
    'prototypeLines':len(proto_text.splitlines()),
    'prototypeBytes':proto.stat().st_size,
    'prototypePageIds':list(dict.fromkeys(re.findall(r'id="(page-[^"]+)"',proto_text))),
    'secondaryTextWhiteContrast':contrast('#9da3ae','#ffffff'),
    'secondaryTextPageContrast':contrast('#9da3ae','#eff2f7'),
    'largestAssets':sorted(assets,key=lambda i:i['bytes'],reverse=True)[:8],
    'sourceHashes':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ['package.json','package-lock.json','public/config.js','src/router/routes.ts']}
}
(OUT/'source-facts.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps({k:v for k,v in facts.items() if k not in ('sourceHashes','prototypePageIds')},ensure_ascii=False,indent=2))

# Duplicate viewport probes kept reporting 1280x720. Keep one screenshot and the
# raw metrics; remove duplicate pictures with misleading requested-size names.
for name in ['login-1440.jpg','login-768.jpg','login-390.jpg','login-mobile-after-navigation.jpg']:
    path=OUT/'evidence'/name
    assert path.resolve().is_relative_to((OUT/'evidence').resolve())
    path.unlink(missing_ok=True)
