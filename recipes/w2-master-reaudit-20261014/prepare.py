import hashlib,json,re,subprocess,zipfile
from datetime import datetime,timezone,timedelta
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path('.');WORK=ROOT/'.work/w2-master-reaudit-20261014';OUT=ROOT/'outputs/ui-audit-20261014/20261014-master-data-reaudit'
repo=ROOT/'pcs-front';source=ROOT/'outputs/ui-audit-20261014/20261014-ui-audit/SN318_W2_UI与交互_20261014_dev_b2efcdb_dirty-5c6bc530.xlsx'
git=lambda *args:subprocess.check_output(['git','-c','safe.directory=./pcs-front','-C',str(repo),*args])
status=git('status','--porcelain=v1','-z');diff=git('diff','--binary');staged=git('diff','--cached','--binary')
untracked=[]
for raw in git('ls-files','--others','--exclude-standard','-z').split(b'\0'):
 if raw:
  path=raw.decode('utf-8');p=repo/path
  if p.is_file():untracked.append({'path':path,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
fingerprint=hashlib.sha256(status+diff+staged+json.dumps(untracked,sort_keys=True).encode()).hexdigest()
config=json.loads((repo/'public/config.js').read_text(encoding='utf-8-sig'))
baseline={'started_at':datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds'),'repository':str(repo),'branch':git('branch','--show-current').decode().strip(),'commit':git('rev-parse','HEAD').decode().strip(),'dirty':bool(status),'worktree_fingerprint':fingerprint,'mode':'dev','mock':{k:config['dev'].get(k) for k in ['useMockAuth','useMockData']},'role':'demo','timezone':'Asia/Shanghai','base_url':'http://127.0.0.1:5173','untracked_hashes':untracked}
for folder in ['evidence','sources']:(OUT/folder).mkdir(parents=True,exist_ok=True)
(OUT/'sources/environment-baseline.json').write_text(json.dumps(baseline,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'sources/执行基线原件.xlsx').write_bytes(source.read_bytes())
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read(z,file,strings):
 cells={}
 for c in ET.fromstring(z.read(file)).findall('s:sheetData/s:row/s:c',ns):
  v=c.find('s:v',ns);f=c.find('s:f',ns)
  value='='+f.text if f is not None else strings[int(v.text)] if c.attrib.get('t')=='s' and v is not None else ''.join(c.find('s:is',ns).itertext()) if c.attrib.get('t')=='inlineStr' else v.text if v is not None else ''
  cells[c.attrib['r']]=value
 return cells
with zipfile.ZipFile(source) as z:
 strings=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)] if 'xl/sharedStrings.xml' in z.namelist() else []
 sheets={n:read(z,f'xl/worksheets/sheet{i}.xml',strings) for i,n in enumerate(['业务UI与交互用例','通用模板UI与交互用例','范围与依据','修改清单'],1)}
cases=[]
for row in range(2,103):
 c=sheets['业务UI与交互用例'];remarks=c.get('G'+str(row),'')
 if row>=78 or any(x in c.get('B'+str(row),'') for x in ['费用项','币种与汇率','业务字典']):
  case={key:c.get(col+str(row),'') for key,col in [('name','A'),('module','B'),('preconditions','C'),('actions','D'),('expected','E'),('priority','F'),('notes','G'),('historical_result','H'),('previous_result','K'),('previous_actual','L')]}
  found=re.search(r'UI-[A-Z0-9]+-\d+(?:-\d+)?',remarks)
  case.update({'id':found.group() if found else f'ROW-{row}','row':row})
  cases.append(case)
run=json.loads((source.parent/'审查记录.json').read_text(encoding='utf-8'))
selected=[c for c in run['cases'] if c['id'].startswith('UI-M1')]
inputs={'source_workbook':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'environment':baseline,'cases':cases,'previous_steps':selected,'manual_values':{a:v for a,v in sheets['通用模板UI与交互用例'].items() if a.startswith('J') and v},'old_sheet_values':sheets,'previous_issues':run['issues']}
(WORK/'inputs.json').write_text(json.dumps(inputs,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'baseline':baseline|{'untracked_hashes':len(untracked)},'cases':[(c['id'],c['row'],c['name']) for c in cases],'manual_values':inputs['manual_values']},ensure_ascii=False))
for c in cases:
 if c['row']<78 or c['row']>=98:print(json.dumps({k:c[k] for k in ['id','row','name','preconditions','actions','expected']},ensure_ascii=False))
