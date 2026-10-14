from datetime import datetime, timezone, timedelta
from pathlib import Path
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(r'.')
WORK = ROOT / '.work/w2-ui-run-20261014'
OUT = ROOT / 'outputs/ui-audit-20261014/20261014-ui-audit'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'evidence').mkdir(exist_ok=True)
(OUT / 'sources').mkdir(exist_ok=True)
repo = ROOT / 'pcs-front'

def git(*args):
    return subprocess.check_output(['git', '-c', 'safe.directory=./pcs-front', '-C', str(repo), *args])

status = git('status', '--porcelain=v1', '-z')
unstaged = git('diff', '--binary')
staged = git('diff', '--cached', '--binary')
untracked = []
for value in git('ls-files', '--others', '--exclude-standard', '-z').split(b'\0'):
    if value:
        path = value.decode('utf-8')
        target = repo / path
        if target.is_file():
            untracked.append({'path': path, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
fingerprint = hashlib.sha256(status + unstaged + staged + json.dumps(untracked, sort_keys=True).encode()).hexdigest()
config = json.loads((repo / 'public/config.js').read_text(encoding='utf-8-sig'))
baseline = {'started_at': datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds'), 'repository': str(repo), 'branch': git('branch','--show-current').decode().strip(), 'commit': git('rev-parse','HEAD').decode().strip(), 'dirty': bool(status), 'worktree_fingerprint': fingerprint, 'untracked_hashes': untracked, 'mode': 'dev', 'dev_mock_flags': {k: config['dev'].get(k) for k in ['useMockAuth', 'useMockData']}, 'timezone': 'Asia/Shanghai'}
(OUT / 'sources/environment-baseline.json').write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
source = ROOT / 'outputs/template-reaudit/受阻16条核实/SN318_W2_UI与交互测试用例_16条受阻核实_含人工二次复核.xlsx'
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as z:
    strings=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        strings=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    def rows(sheet):
        result=[]
        for row in ET.fromstring(z.read(sheet)).findall('s:sheetData/s:row',ns):
            values={}
            for c in row:
                node=c.find('s:v',ns)
                value=node.text if node is not None else ''
                if c.attrib.get('t')=='s': value=strings[int(value)]
                elif c.attrib.get('t')=='inlineStr': value=''.join(c.find('s:is',ns).itertext())
                values[re.sub(r'\d+','',c.attrib['r'])]=value
            result.append(values)
        return result
    template=rows('xl/worksheets/sheet2.xml')[1:]
    business=rows('xl/worksheets/sheet1.xml')[1:]
cases=[]
for idx,row in enumerate(template,2):
    found=re.search(r'UI-TPL-\d+',row.get('G',''))
    assert found
    cases.append({'id':found.group(),'source_row':idx, **{k:row.get(c,'') for k,c in [('name','A'),('module','B'),('preconditions','C'),('actions','D'),('expected','E'),('priority','F'),('notes','G'),('historical_result','H'),('historical_actual','I'),('manual_review','J')]}})
inputs={'source_workbook':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'template':cases,'business':business}
(WORK / 'input-cases.json').write_text(json.dumps(inputs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'out':str(OUT),'environment':baseline | {'untracked_hashes':len(untracked)},'source_sha256':inputs['source_sha256'],'manual_filled':[c['id'] for c in cases if c['manual_review']],'template_count':len(cases),'business_count':len(business)},ensure_ascii=False))
