from pathlib import Path
from collections import Counter
from datetime import datetime,timezone,timedelta
import json,copy,math,hashlib,html,zipfile,posixpath,re,subprocess,shutil,xml.etree.ElementTree as E
ROOT=Path('.'); WORK=ROOT/'.work/w2-ui-run-20261014'; OUT=ROOT/'outputs/ui-audit-20261014/20261014-ui-audit'
plan=json.loads((WORK/'workbook-plan.json').read_text(encoding='utf-8')); record=json.loads((OUT/'审查记录.json').read_text(encoding='utf-8'))
source=OUT/'sources/执行基线原件.xlsx'; dest=Path(plan['destination']); artifact=WORK/'artifact-export.xlsx'
NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'; RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships'; Q=lambda t:'{'+NS+'}'+t
E.register_namespace('',NS);E.register_namespace('r',RNS)
def sheet_paths(z):
 targets={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 return {s.attrib['name']:(targets[s.attrib['{'+RNS+'}id']].lstrip('/') if targets[s.attrib['{'+RNS+'}id']].startswith('/') else posixpath.normpath('xl/'+targets[s.attrib['{'+RNS+'}id']])) for s in E.fromstring(z.read('xl/workbook.xml')).find(Q('sheets'))}
def strings(z):return E.fromstring(z.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in z.namelist() else []
def value(z,c):
 if c is None:return ''
 if c.attrib.get('t')=='inlineStr':return ''.join(c.find(Q('is')).itertext())
 n=c.find(Q('v'));v=n.text if n is not None else ''
 return ''.join(strings(z)[int(v)].itertext()) if c.attrib.get('t')=='s' else v
def letter(n):
 out=''
 while n:n,k=divmod(n-1,26);out=chr(65+k)+out
 return out
def num(s):
 n=0
 for c in s:n=n*26+ord(c)-64
 return n
def authored_inline(z,c):
 if c.attrib.get('t')=='inlineStr':return copy.deepcopy(c.find(Q('is')))
 node=E.Element(Q('is'))
 if c.attrib.get('t')=='s':
  for child in strings(z)[int(c.find(Q('v')).text)]:node.append(copy.deepcopy(child))
 else:E.SubElement(node,Q('t')).text=value(z,c)
 return node
expected={}
for b in plan['blocks']:
 first=b['range'].split(':')[0]; col=num(re.match('[A-Z]+',first).group()); row=int(re.search(r'\d+',first).group())
 for i,vs in enumerate(b['values']):
  for j,v in enumerate(vs):expected[(b['sheet'],letter(col+j)+str(row+i))]=v
replacements={}; height_changes=[]
with zipfile.ZipFile(source) as old,zipfile.ZipFile(artifact) as author:
 op,ap=sheet_paths(old),sheet_paths(author)
 styles=E.fromstring(old.read('xl/styles.xml'));xfs=styles.find(Q('cellXfs'));stylevariants={}
 def wrapped_style(style):
  if style in stylevariants:return stylevariants[style]
  item=copy.deepcopy(xfs[int(style)]);align=item.find(Q('alignment'))
  if align is None:align=E.SubElement(item,Q('alignment'))
  if align.attrib.get('wrapText')=='1' and align.attrib.get('vertical')=='top':stylevariants[style]=style;return style
  align.attrib.update(wrapText='1',vertical='top');item.attrib['applyAlignment']='1';id=str(len(xfs));xfs.append(item);stylevariants[style]=id;return id
 for name,path in op.items():
  base=E.fromstring(old.read(path)); authored=E.fromstring(author.read(ap[name])); data=base.find(Q('sheetData'))
  bcs={c.attrib['r']:c for c in base.iter(Q('c'))}; acs={c.attrib['r']:c for c in authored.iter(Q('c'))}; rows={int(r.attrib['r']):r for r in data}
  basecolmax=num(re.match('[A-Z]+',plan['original_dimensions'][name].split(':')[1]).group()); baserowmax=int(re.search(r'\d+',plan['original_dimensions'][name].split(':')[1]).group())
  headers=[b.get('header') for b in plan['blocks'] if b['sheet']==name and b.get('header')]; headerrows={int(re.search(r'\d+',x).group()) for x in headers}
  statusstyles={}
  if name=='通用模板UI与交互用例':
   for c in bcs.values():
    if c.attrib['r'].startswith('H'):statusstyles[value(old,c)]=c.attrib.get('s','0')
  for (sheet,addr),v in expected.items():
   if sheet!=name:continue
   assert addr in acs,(name,addr)
   assert value(author,acs[addr])==v,(name,addr)
   if addr in bcs and (value(old,bcs[addr]) or bcs[addr].find(Q('f')) is not None):raise AssertionError('Would overwrite original '+name+'!'+addr)
   rn=int(re.search(r'\d+',addr).group()); cn=num(re.match('[A-Z]+',addr).group())
   row=rows.get(rn)
   if row is None:row=E.SubElement(data,Q('row'),{'r':str(rn),'ht':'15','customHeight':'1'});rows[rn]=row
   c=copy.deepcopy(acs[addr]);
   for child in list(c):
    if child.tag in {Q('v'),Q('is'),Q('f')}:c.remove(child)
   c.attrib['t']='inlineStr';c.append(authored_inline(author,acs[addr]))
   if rn in headerrows:style=bcs.get('A17' if name=='范围与依据' else 'A1').attrib.get('s','0')
   elif name=='通用模板UI与交互用例':style=statusstyles.get(v,bcs.get('I2').attrib.get('s','0'))
   else:
    srccol=letter(min(cn,basecolmax));style=bcs.get(srccol+'2',bcs.get('A2',bcs['A1'])).attrib.get('s','0')
   c.attrib['s']=wrapped_style(style)
   if addr in bcs:row.remove(bcs[addr])
   row.append(c)
  # New columns only; source widths are preserved. Row heights may grow to fit new current results.
  columns=base.find(Q('cols'))
  if columns is None:columns=E.Element(Q('cols'));base.insert(list(base).index(data),columns)
  newwidths={k:v for b in plan['blocks'] if b['sheet']==name for k,v in b.get('widths',{}).items() if num(k)>basecolmax}
  for col,width in newwidths.items():E.SubElement(columns,Q('col'),{'min':str(num(col)),'max':str(num(col)),'width':str(width),'customWidth':'1'})
  for rn,row in rows.items():
   row[:]=sorted(row,key=lambda c:num(re.match('[A-Z]+',c.attrib['r']).group()))
   textcells=[(num(re.match('[A-Z]+',c.attrib['r']).group()),expected.get((name,c.attrib['r']),None)) for c in row if (name,c.attrib['r']) in expected]
   if not textcells:continue
   def effective_width(cn):
    return max(3,next((float(c.attrib.get('width','13'))*.88 for c in columns if int(c.attrib['min'])<=cn<=int(c.attrib['max'])),11))
   required=max(30,max(sum(max(1,math.ceil(sum(2 if ord(k)>127 else 1 for k in ln)/effective_width(cn))) for ln in str(v).split('\n')) for cn,v in textcells)*13+12)
   original=float(row.attrib.get('ht','15'));target=max(original,min(required,409))
   if rn<=baserowmax and target>original:height_changes.append({'sheet':name,'row':rn,'before':original,'after':target,'reason':'fit appended current result; original cell styles/values unchanged'})
   row.attrib.update(ht=str(target),customHeight='1')
  data[:]=sorted(data,key=lambda r:int(r.attrib['r']))
  for row in data:
   if 'spans' in row.attrib:row.attrib['spans']='1:'+str(max(num(re.match('[A-Z]+',c.attrib['r']).group()) for c in row))
  endrow=max(rows);endcol=max(num(re.match('[A-Z]+',c.attrib['r']).group()) for c in data.iter(Q('c')))
  base.find(Q('dimension')).attrib['ref']='A1:'+letter(endcol)+str(endrow)
  replacements[path]=E.tostring(base,encoding='utf-8',xml_declaration=True)
 xfs.attrib['count']=str(len(xfs));replacements['xl/styles.xml']=E.tostring(styles,encoding='utf-8',xml_declaration=True)
 # Keep native table IDs/styles/filters; extend only the two authored case grids.
 for path in old.namelist():
  if not(path.startswith('xl/tables/') and path.endswith('.xml')):continue
  t=E.fromstring(old.read(path));name=t.attrib.get('name')
  if name not in ['BusinessUICases','TemplateUICases']:continue
  sheet='业务UI与交互用例' if name=='BusinessUICases' else '通用模板UI与交互用例'; end=102 if name=='BusinessUICases' else 41
  t.attrib['ref']='A1:M'+str(end);t.find(Q('autoFilter')).attrib['ref']=t.attrib['ref'];cols=t.find(Q('tableColumns'))
  for col in range(len(cols)+1,14):E.SubElement(cols,Q('tableColumn'),{'id':str(col),'name':expected[(sheet,letter(col)+'1')]})
  cols.attrib['count']='13';replacements[path]=E.tostring(t,encoding='utf-8',xml_declaration=True)
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for info in old.infolist():z.writestr(copy.copy(info),replacements.get(info.filename,old.read(info.filename)))
 # Readback checks: all original cell elements and native features except planned grid extents remain intact.
 with zipfile.ZipFile(dest) as new:
  np=sheet_paths(new);originalcells=0
  for sheet,path in op.items():
   a=E.fromstring(old.read(path));b=E.fromstring(new.read(np[sheet]));bc={c.attrib['r']:c for c in b.iter(Q('c'))}
   for cell in a.iter(Q('c')):
    if (sheet,cell.attrib['r']) in expected:continue
    assert E.tostring(cell)==E.tostring(bc[cell.attrib['r']]),(sheet,cell.attrib['r']);originalcells+=1
   for feature in ['sheetViews','mergeCells','dataValidations','conditionalFormatting','sheetProtection','pageMargins','pageSetup','hyperlinks']:
    assert [E.tostring(n) for n in a.findall(Q(feature))]==[E.tostring(n) for n in b.findall(Q(feature))],(sheet,feature)
  for (sheet,addr),v in expected.items():assert value(new,next(c for c in E.fromstring(new.read(np[sheet])).iter(Q('c')) if c.attrib['r']==addr))==v,(sheet,addr)
  unchangedparts=[p for p in old.namelist() if p not in replacements]
  assert all(old.read(p)==new.read(p) for p in unchangedparts)
  for item in E.fromstring(old.read('xl/styles.xml')):
   newer=E.fromstring(new.read('xl/styles.xml')).find(item.tag)
   if item.tag==Q('cellXfs'):assert [E.tostring(x) for x in item]==[E.tostring(x) for x in list(newer)[:len(item)]]
   else:assert E.tostring(item)==E.tostring(newer)
  manual=[value(old,next(c for c in E.fromstring(old.read(op['通用模板UI与交互用例'])).iter(Q('c')) if c.attrib['r']=='J2'))]
  assert manual==['不通过']
  assert new.testzip() is None
repo=ROOT/'pcs-front'
def git(*args):return subprocess.check_output(['git','-c','safe.directory=./pcs-front','-C',str(repo),*args])
status=git('status','--porcelain=v1','-z'); untracked=[]
for s in git('ls-files','--others','--exclude-standard','-z').split(b'\0'):
 if s:
  p=s.decode('utf-8');f=repo/p
  if f.is_file():untracked.append({'path':p,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
fp=hashlib.sha256(status+git('diff','--binary')+git('diff','--cached','--binary')+json.dumps(untracked,sort_keys=True).encode()).hexdigest()
assert fp==record['environment']['worktree_fingerprint'],'Repository drift'
assert hashlib.sha256(source.read_bytes()).hexdigest()==record['sources']['historical_sha256']
assert hashlib.sha256(Path(record['sources']['historical_workbook']).read_bytes()).hexdigest()==record['sources']['historical_sha256'],'Original workbook changed during run'
validation={'ok':True,'checked_at':datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds'),'original_cells_preserved':originalcells,'original_values_formulas_cell_styles':'unchanged','manual_review_J2':'不通过 preserved exactly','human_new_fields':'empty; no AI human verdict','native_tables':6,'extended_tables':['BusinessUICases A1:M102','TemplateUICases A1:M41'],'other_package_parts':'byte-for-byte unchanged','row_height_growth':height_changes,'new_values_readback':len(expected),'counts':record['counts'],'step_counts':record['step_counts'],'repository_fingerprint_unchanged':fp,'source_sha256':record['sources']['historical_sha256'],'output_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'xlsx_formula_errors':'Artifact Tool authored/export scan 0 matches; no new formulas added','note':'File integrity/counts are not UI acceptance. Final native Excel application opening was not executed.'}
(OUT/'交付校验.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf-8')
# Invalid or transitional captures are retained as records but never promoted to execution proof.
limitations={'T20-drawer-bottom':'scrollTop为0，不是末尾实测；以T43为实际末尾','T16-tablet-horizontal':'scrollLeft为0，横滚步骤受阻','B11-rate-list':'实际采样在币种路由，不能作为汇率结果','B12-rate-edit':'过渡态/非稳定编辑，不作判定','B13-dictionary-click-nochange':'原注释不符合最终已切换URL，不登记导航缺陷','C06-modal-large':'过渡态；稳定证据C07','C14-preview-portrait':'无有效浮层量测；稳定证据C14a','C12-preview-small':'图片安全区使用extra.measurement，截图未同步浮层','C13-preview-landscape':'图片安全区使用extra.measurement，截图未同步浮层','C14a-preview-portrait-stable':'图片安全区使用extra.measurement，截图未同步浮层','C15-preview-tablet':'图片安全区使用extra.measurement，截图未同步浮层','B41-fee-empty':'DOM为空结果完成态，但截图仍为旧3条；空态判定只引用DOM'}
for ev in record['evidence']:
 if ev['id'] in limitations:ev['scope']+=' '+limitations[ev['id']]
assert all((OUT/e['path']).is_file() for e in record['evidence'])
ids={e['id'] for e in record['evidence']}
for c in record['cases']:
 for s in c['steps']:
  assert set(s['evidence_ids'])<=ids
  if s['result'] in ['通过','不通过']:assert s['evidence_ids'] and s['actual'] and s['expected']
 for p in c['package_ids']:assert c['id'] in next(x for x in record['packages'] if x['id']==p)['case_ids']
record['delivery_workbook']=dest.name;record['validation_file']='交付校验.json';record['evidence_capture_limitations']=limitations
(OUT/'审查记录.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
esc=lambda v:html.escape(str(v),quote=True)
historical_root=Path(record['sources']['historical_workbook']).parent
historical_bycase={};historical_index=[]
historical_files=[f for f in historical_root.rglob('*') if f.is_file() and f.suffix.lower() in {'.jpg','.png','.json'}]
for c in record['cases'][:40]:
 refs=set(re.findall(r'\b[ABESVR]\d{2,3}\b',c['historical_actual']))
 for prefix,first,last in re.findall(r'([ABESVR])(\d{2,3})[–—-]\1?(\d{2,3})',c['historical_actual']):
  refs.update(prefix+str(n).zfill(len(first)) for n in range(int(first),int(last)+1))
 historical_bycase[c['id']]=[]
 for f in historical_files:
  match=re.match(r'^([ABESVR]\d{2,3})(?:[^0-9]|$)',f.stem)
  if not match or match.group(1) not in refs:continue
  rel=f.relative_to(historical_root);target=OUT/'historical'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,target)
  item={'id':match.group(1),'path':target.relative_to(OUT).as_posix(),'date':'2026-10-13' if 'historical-20261013' in str(rel) else '2026-10-14 previous run','sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'kind':'historical; not executed this run'}
  historical_bycase[c['id']].append(item)
  if item not in historical_index:historical_index.append(item)
(OUT/'历史证据索引.json').write_text(json.dumps({'files':historical_index,'by_case':historical_bycase},ensure_ascii=False,indent=2),encoding='utf-8')
for original,name in [(ROOT/'pcs-front/docs/本地UI测试.md','local-ui-test.md'),(ROOT/'pcs-front/docs/template-reference/M1基础数据开发基线.md','M1-development-baseline.md')]:shutil.copy2(original,OUT/'sources'/name)
evid={e['id']:e for e in record['evidence']}
def links(es):return ' '.join(f'<a href="{esc(evid[e]["path"])}">{esc(e)} DOM/量测</a>' for e in es)
def casecard(c):
 body=''.join(f'<tr><td>{esc(s["id"])}</td><td>{esc(s["action"])}<details><summary>预期</summary>{esc(s["expected"])}</details></td><td class="{s["result"]}">{esc(s["result"])}</td><td>{esc(s["actual"])}'+(f'<p class="muted">缺条件：{esc(s["needed"])}</p>' if s['needed'] else '')+f'<p>{links(s["evidence_ids"])}</p></td></tr>' for s in c['steps'])
 hist=f'<details><summary>原执行与人工内容（原样保留；旧证据未作本轮执行）</summary><pre>原状态：{esc(c.get("historical_result",""))}\n{esc(c.get("historical_actual",""))}\n人工二次复核：{esc(c.get("manual_review",""))}</pre>'+''.join(f'<a href="{esc(e["path"])}">历史{e["id"]} ({esc(e["date"])} / {Path(e["path"]).suffix})</a> ' for e in historical_bycase[c['id']])+'</details>' if c['layer']=='template' else ''
 return f'<article id="{c["id"]}" data-layer="{c["layer"]}" data-status="{c["result"]}"><h3>{c["id"]} · {esc(c["name"])} <span class="{c["result"]}">{c["result"]}</span></h3><p>工作包：{esc(",".join(c["package_ids"]) or "通用模板/M1补充")}</p><table><thead><tr><th>步骤</th><th>操作与预期</th><th>判定</th><th>实际/证据/缺条件</th></tr></thead><tbody>{body}</tbody></table>{hist}</article>'
issuecards=''.join(f'<article id="{i["id"]}"><h3>{i["id"]} {esc(i["type"])} · {i["level"]} · {esc(i["page"])}</h3><p><b>依据：</b>{esc(i["norm"])}</p><p><b>实际：</b>{esc(i["actual"])}</p><p><b>复现：</b>{esc(i["repro"])}</p><p><b>建议：</b>{esc(i["recommendation"])}</p><p><b>验收：</b>{esc(i["acceptance"])}</p><p>{links(i["evidence_ids"])}</p><p class="muted">{esc(i["status"])}；责任人：{esc(i["owner"])}；缺条件：{esc(i["needed"] or "见逐步覆盖")}</p><p>关联：'+', '.join(f'<a href="#{x}">{x}</a>' for x in i['case_ids'])+'</p></article>' for i in record['issues'])
pkgrows=''.join('<tr>'+''.join('<td>'+esc(x)+'</td>' for x in [p['id'],p['name'],p['priority'],p['source_row'],p['delivery'],','.join(p['case_ids']),p['blocker'],p['next_action']])+'</tr>' for p in record['packages'])
evidrows=''.join(f'<tr><td>{e["id"]}</td><td>{esc(e["captured_at"])}</td><td>{esc(e["url"])}</td><td><a href="{e["path"]}">DOM/量测</a> '+(f'<a href="{e["screenshot"]}">截图</a>' if e['screenshot'] else '截图未取得')+'</td><td>'+esc(e['scope'])+'</td></tr>' for e in record['evidence'])
ct=record['counts']['template'];cb=record['counts']['business']
report=f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SN318 W2 UI规范审查与交互测试 · 2026-10-14</title><style>body{{margin:0;background:#f3f5f8;color:#1a2130;font:15px/1.65 system-ui,'Microsoft YaHei',sans-serif}}main{{max-width:1280px;margin:auto;padding:24px}}h1{{font-size:25px}}h2{{font-size:21px;margin-top:40px}}h3{{font-size:17px;margin:0 0 12px}}article,.summary{{padding:22px;border:1px solid #ddd;border-radius:12px;background:white;margin:16px 0}}table{{border-collapse:collapse;width:100%;font-size:14px;table-layout:fixed}}td,th{{padding:10px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top;overflow-wrap:anywhere}}th{{background:#edf3fa}}td:first-child{{width:55px}}a{{color:#046efc}}pre{{white-space:pre-wrap;overflow-wrap:anywhere}}.muted{{color:#616b79}}.不通过{{color:#c33635}}.受阻{{color:#976200}}.通过{{color:#168451}}button,input{{font:inherit;border:1px solid #ccc;border-radius:8px;padding:8px;margin:3px}}nav{{position:sticky;top:0;background:#f3f5f8;padding:8px;z-index:2}}img{{max-width:100%;border:1px solid #ddd}}details{{margin:8px 0}}.scroll{{overflow-x:auto}}.scroll table{{min-width:1000px}}.cases th:nth-child(1){{width:50px}}.cases th:nth-child(2){{width:28%}}.cases th:nth-child(3){{width:65px}}</style><main>
<h1>SN318 W2 UI规范审查与交互测试</h1><p>2026-10-14 · {esc(record['run_id'])} · 本地dev/Mock · demo角色</p><div class="summary"><p><b>模板40条：通过{ct.get('通过',0)}，不通过{ct.get('不通过',0)}，受阻{ct.get('受阻',0)}。</b>逐条审查原步骤，可执行分支补测；含未完成子条件的步骤受阻。历史13/12/15仍原样保留，本轮计数变化不是源码回归结论。</p><p><b>新增业务补测25条：通过{cb.get('通过',0)}，不通过{cb.get('不通过',0)}，受阻{cb.get('受阻',0)}。</b>覆盖18个M1列表、2个关联子表及5个定向检查。20个搜索空态失败引用同一共性问题R09；用例数不等于独立缺陷数。</p><p>修改/补齐清单16项：11项已证实差异、3项待裁决或说明确认、2组缺口。原76条W2业务候选仍未完整执行；仅费用项、币种与汇率、业务字典3个工作包有M1部分证据，其余35个未取得本轮专项入口。完整工作包通过数为0。</p><p>本批不修改前端源码，不证明真实接口、权限或财务业务规则。原H/I执行记录与模板J人工意见保持；新增人工字段留空。</p></div>
<nav><a href="#issues">修改清单</a> · <a href="#cases">用例</a> · <a href="#schedule">W2覆盖与后续</a> · <a href="#sources">来源</a> · <a href="#evidence">证据</a></nav>
<p><a href="{esc(dest.name)}">本次工作簿</a> · <a href="sources/执行基线原件.xlsx">原始执行基线</a> · <a href="审查记录.json">结构化记录</a> · <a href="交付校验.json">文件与环境校验</a></p>
<h2>主要现场差异</h2><p>Tablet表单仍双列，按钮圆角2px、标准页头97px、普通正文及链接色偏离现行规范；查询按钮在Spin期间仍未loading/禁用。业务空结果缺调整筛选引导，上传说明与实际触发方式不一致。见下方逐项验收标准。</p><figure><img src="evidence/T27-form-tablet.jpg" alt="Tablet表单双列和底栏现场截图"><figcaption>现场表单截图：两字段同一行。1024宽断点及坐标以T27 JSON量测为准；截图服务返回画布可能与CSS视口尺寸不同。</figcaption></figure>
<h2 id="issues">修改与补齐清单</h2>{issuecards}
<h2 id="cases">用例与子步骤</h2><p>模板子步骤：{esc(json.dumps(record['step_counts']['template'],ensure_ascii=False))}；业务子步骤：{esc(json.dumps(record['step_counts']['business'],ensure_ascii=False))}。复合步骤有缺分支时整体受阻，实际栏保留已经取得的观察；不把局部量测写成完整通过。</p><div><input id="search" placeholder="用例编号或关键词" oninput="filterCases()"><button onclick="setLayer('')">全部65</button><button onclick="setLayer('template')">模板40</button><button onclick="setLayer('business')">业务补测25</button><select id="status" onchange="filterCases()"><option value="">全部结果</option><option>不通过</option><option>受阻</option><option>通过</option></select></div><section class="cases">{''.join(casecard(c) for c in record['cases'])}</section>
<h2 id="schedule">W2排期覆盖和后续安排</h2><p>现行排期rev988：W2为10/12–10/16，38项“UI/开”（P0 24、P1 14），设计开发并行；24项“需”未纳入本次业务执行。10/14先交审查及清单。余下W2按实际提测入口：先P1共性交互整改与P0专项提测，再补批准策略/异常边界、复测。本报告未编造固定日工期、人员责任或未交付页面完成状态。</p><div class="scroll"><table><thead><tr><th>ID</th><th>工作包</th><th>优先级</th><th>排期原行</th><th>当前覆盖</th><th>关联补测</th><th>缺条件</th><th>下一步</th></tr></thead><tbody>{pkgrows}</tbody></table></div>
<h2 id="sources">依据与基线</h2><p><a href="https://example.invalid/source/05cc32fecc">通用设计规范V1.2</a> 正文rev5256；本次涉及29个嵌入表已只读刷新rev3138。<a href="sources/norm-live.json">正文快照</a>；<a href="sources/schedule-live.json">排期rev988</a>；<a href="sources/review-live.ndjson">Review指定视图rev680</a>（24条包含空行，稳定record_id）。Review颜色、设计适配状态和PRD来源标签不作页面执行结论。</p><p>产品PRD rev8350、基础PRD rev2；<a href="sources/product-prd-live-readable.md">产品PRD本次提取</a>。M1冻结基线和本地Mock说明用于界定交付入口、编码不可变及已生效汇率规则。费用类型/币种选择与汇率版本审批冲突已列待裁决，不以文档称已实现。</p><p>checkout dev / {esc(record['environment']['commit'])} / dirty {esc(record['environment']['worktree_fingerprint'])}；useMockAuth=true、useMockData=true。<a href="sources/environment-baseline.json">开始基线</a>与交付核验指纹相同，无前端源码改动。</p><h2 id="evidence">证据索引与采样限制</h2><p>DOM、量测和截图依次采样，不承诺同时。空结果截图有旧行、图片预览截图未包含浮层时，仅用明确的DOM/extra.measurement判定对应状态；截图保留并标注限制。T20滚动未到末尾（scrollTop0），T16横滚未完成（scrollLeft0）；B11/B12/C06/C14过渡记录不作通过证据。后续需补同步截图时不能把本轮图片改写成已取得。</p><div class="scroll"><table><thead><tr><th>ID</th><th>采样UTC时间</th><th>URL</th><th>文件</th><th>适用范围/限制</th></tr></thead><tbody>{evidrows}</tbody></table></div></main><script>let layer='';function setLayer(v){{layer=v;filterCases()}}function filterCases(){{let q=document.querySelector('#search').value.toLowerCase(),s=document.querySelector('#status').value;document.querySelectorAll('.cases article').forEach(a=>a.hidden=(layer&&a.dataset.layer!==layer)||(s&&a.dataset.status!==s)||(q&&!a.textContent.toLowerCase().includes(q)))}}</script></html>'''
report=report.replace('M1冻结基线和本地Mock说明','<a href="sources/M1-development-baseline.md">M1冻结基线</a>和<a href="sources/local-ui-test.md">本地Mock说明</a>')
report=report.replace('<h2 id="evidence">','<p><a href="历史证据索引.json">原记录引用的历史证据索引</a>，均注明原日期，未当作本次重新执行。</p><h2 id="evidence">')
(OUT/'审查报告.html').write_text(report,encoding='utf-8')
# Validate every local report target and case fragment, excluding external URLs.
for target in re.findall(r'(?:href|src)="([^"]+)"',report):
 target=html.unescape(target)
 if target.startswith('http'):continue
 if target.startswith('#'):assert f'id="{target[1:]}"' in report,target
 else:assert (OUT/target).is_file(),target
archive=OUT/'SN318_W2_UI审查_20261014_证据包.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in OUT.rglob('*'):
  if f.is_file() and f!=archive:z.write(f,f.relative_to(OUT).as_posix())
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(json.dumps({'xlsx':str(dest),'report':str(OUT/'审查报告.html'),'zip':str(archive),'preserved_cells':originalcells,'new_values':len(expected),'height_growth_rows':len(height_changes),'counts':record['counts'],'zip_MB':round(archive.stat().st_size/1024/1024,2),'git_fingerprint_unchanged':True},ensure_ascii=False))
