import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const work='./recipes/ui-actual-audit';
const out='./artifacts/ui-audit';
const data=JSON.parse(await fs.readFile(`${work}/report-data.json`,'utf8'));
const wb=Workbook.create();
const names=['修改清单','用例覆盖','页面范围','截图证据','审查依据'];
for(const name of names) wb.worksheets.add(name);
const color={ink:'#243247',header:'#244D79',muted:'#53687D',input:'#FFF3D6'};
const colName=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
const shanghaiDate=s=>{const v=s.match(/\d+/g).map(Number);return new Date(Date.UTC(v[0],v[1]-1,v[2],v[3]||0,v[4]||0,v[5]||0));};
function tableSheet(name,title,note,headers,rows,widths,tableName){
  const s=wb.worksheets.getItem(name),last=colName(headers.length),end=rows.length+5;
  s.showGridLines=false;
  s.getRange(`A1:${last}${end}`).format.font={name:'Microsoft YaHei',size:10,color:color.ink};
  s.getRange(`A1:${last}${end}`).format.verticalAlignment='top';
  s.getRange('A2').values=[[title]];s.getRange('A2').format.font={name:'Microsoft YaHei',size:15,bold:true,color:color.ink};
  s.getRange(`A2:${last}2`).format.rowHeight=29;
  s.getRange('A3').values=[[note]];s.getRange('A3').format.font={name:'Microsoft YaHei',size:10,color:color.muted};
  s.getRange('A3').format.wrapText=false;s.getRange(`A3:${last}3`).format.rowHeight=24;
  s.getRange(`A5:${last}5`).values=[headers];s.getRange(`A6:${last}${end}`).values=rows;
  const t=s.tables.add(`A5:${last}${end}`,true,tableName);t.style='TableStyleMedium2';
  s.getRange(`A5:${last}5`).format={fill:color.header,font:{name:'Microsoft YaHei',size:10,color:'#FFFFFF',bold:true},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:39,borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};
  s.getRange(`A6:${last}${end}`).format.wrapText=true;
  for(let i=0;i<headers.length;i++)s.getRange(`${colName(i+1)}1:${colName(i+1)}${end}`).format.columnWidth=widths[i];
  for(let i=0;i<rows.length;i++){
    const lines=Math.max(...rows[i].map((v,j)=>String(v??'').split('\n').reduce((a,t)=>a+Math.max(1,Math.ceil([...t].reduce((n,c)=>n+(c.charCodeAt(0)>255?1.85:1),0)/Math.max(8,widths[j]-2))),0)));
    s.getRange(`A${i+6}:${last}${i+6}`).format.rowHeight=Math.max(name==='审查依据'?35:52,lines*14+12);
  }
  s.freezePanes.freezeRows(5);s.freezePanes.freezeColumns(name==='审查依据'?2:3);
  return s;
}

const gallery=wb.worksheets.getItem('截图证据');gallery.showGridLines=false;
const imageData=new Map();
const galleryRows=new Map();
let nextGalleryRow=data.evidence.length+11;
for(const e of data.evidence){
  const bytes=await fs.readFile(e.path);imageData.set(e.id,`data:image/jpeg;base64,${bytes.toString('base64')}`);
  const height=960*e.imageHeight/e.imageWidth;
  galleryRows.set(e.id,nextGalleryRow);
  nextGalleryRow+=Math.ceil(height/24)+5;
}

const issueRows=data.findings.map(f=>[f.id,f.kind,f.priority,f.scope,f.title,f.actual,f.basis,f.fix,f.retest,f.caseIds.join('、'),f.evidenceIds.join('、'),f.role,f.prerequisite,null,f.status,'未执行',null]);
const main=tableSheet('修改清单','基础配置前端页面修改清单',
  '实际审查快照：18对象列表、8编辑表单、1新增表单及2类详情。未提供部署Build，以下观察不作为正式提测签署。',
  ['编号','条目类型','处理优先级建议','页面/场景','问题/待决标题','实际表现与量测','规范/用例依据','具体修改建议','复测验收标准','对应UI case','截图证据','建议处理角色','前置/边界','责任人（待填）','后续状态','复测结果','复测Build/证据'],
  issueRows,[11,17,17,33,31,52,47,53,47,25,31,25,41,19,21,18,40],'FrontendAuditItems');
main.tabColor=color.header;
main.getRange('A4:H4').values=[['实测问题',null,'待确认事项',null,'对象列表',data.counts.listObjects,'有效截图',data.counts.screenshots]];
main.getRange('B4').formulas=[['=COUNTIF(B6:B17,"实测问题")']];
main.getRange('D4').formulas=[['=COUNTIF(B6:B17,"待确认事项")']];
main.getRange('A4:H4').format.font.bold=true;main.getRange('A4:H4').format.rowHeight=25;
for(const c of ['B4','D4','F4','H4'])main.getRange(c).format.horizontalAlignment='center';
main.getRange('N6:Q17').format.fill=color.input;
main.getRange('O6:O17').dataValidation={rule:{type:'list',values:['待开发修正','修改中','待复测','待UI/产品确认','已完成复测','不纳入本批']}};
main.getRange('P6:P17').dataValidation={rule:{type:'list',values:['未执行','通过','失败','受阻']}};
main.getRange('B6:B17').conditionalFormats.addCustom('B6="实测问题"',{fill:'#FDE9E5',font:{color:'#A94537'}});
main.getRange('B6:B17').conditionalFormats.addCustom('B6="待确认事项"',{fill:'#FFF0CF',font:{color:'#805C22'}});
for(let i=0;i<data.findings.length;i++){
  const f=data.findings[i];
  main.getRange(`K${i+6}`).values=[[`${f.evidenceIds.join('、')}\n首图位置：截图证据!A${galleryRows.get(f.evidenceIds[0])}`]];
}

tableSheet('用例覆盖','49条UI case：本次覆盖与未覆盖',
  '按原用例编号续接；部分已核不等于整个case通过。服务单元、AI等未用基础配置对象代验。',
  ['UI case','原模块/页面','原检查点','本次观察结论','已执行/观察内容','截图ID','关联修改项','未覆盖状态/条件','原框架适配判断'],
  data.coverage,[12,25,34,27,59,32,26,58,27],'UiCoverage');

const pageRows=data.pages.map((r,i)=>[`PL${String(i+1).padStart(2,'0')}`,'列表',r[0],r[1],`${r[2]}×${r[3]}`,r[4],r[6],`字段：${r[5]}；当前实际记录已查看。`,'未测试各对象全部状态、CRUD和多页数据。']);
for(let i=0;i<data.forms.length;i++){
  const f=data.forms[i],ids=f[1].split('、'),e=data.evidence.find(e=>e.id===ids[0]);
  pageRows.push([`FR${String(i+1).padStart(2,'0')}`,f[0].includes('详情')?'详情':f[0].includes('新增')?'新增表单':'编辑表单',f[0],e.url,'见对应截图元数据',null,f[1],f[2],'仅验证已记录动作；其他状态见用例覆盖。']);
}
const pages=tableSheet('页面范围','页面实例与实际操作范围',
  '18条列表实例＋11条表单/详情实例；一个对象的观察不能替代其他对象的全部case。列表现有1—2条，不满足多页测试。',
  ['范围ID','类型','对象/场景','URL','CSS视口','列表记录数','截图ID','已做动作/内容','未覆盖范围'],
  pageRows,[12,17,27,62,25,17,33,60,52],'PageScope');
pages.getRange('F6:F34').setNumberFormat('0');

const galleryIndex=data.evidence.map(e=>[e.id,e.label,shanghaiDate(e.capturedAt),e.viewport,e.imageSize,e.url,`截图证据!A${galleryRows.get(e.id)}`,e.scopeNote]);
tableSheet('截图证据','截图证据索引与原图',
  '48张浏览器原始截图；目录给出原图单元格地址。CSS视口与截图像素尺寸分别记录，图文报告可直接点击证据编号。',
  ['截图ID','截图内容','采集时间·上海','CSS视口','图片尺寸','实际URL','原图位置','截取范围说明'],
  galleryIndex,[18,52,27,27,24,67,27,50],'ScreenshotIndex');
gallery.getRange(`C6:C${data.evidence.length+5}`).setNumberFormat('yyyy-mm-dd hh:mm:ss');
for(const e of data.evidence){
  const r=galleryRows.get(e.id),h=960*e.imageHeight/e.imageWidth,n=Math.ceil(h/24);
  gallery.getRange(`A${r}:L${r+n+4}`).format.font={name:'Microsoft YaHei',size:10,color:color.ink};
  gallery.getRange(`A${r}:L${r+n+4}`).format.rowHeightPx=24;
  gallery.getRange(`A${r}`).values=[[`${e.id}  ${e.label}`]];
  gallery.getRange(`A${r}`).format.font={name:'Microsoft YaHei',size:13,bold:true,color:color.ink};
  gallery.getRange(`A${r+1}`).values=[[e.url]];gallery.getRange(`A${r+1}`).format.font.color=color.muted;
  gallery.getRange(`A${r+2}`).values=[[`${e.capturedAt} 上海时间｜CSS视口 ${e.viewport}｜原图 ${e.imageSize}`]];
  gallery.images.add({dataUrl:imageData.get(e.id),anchor:{from:{row:r+2,col:0},extent:{widthPx:960,heightPx:h}}});
}

const envRows=[
 ['审查','目标页面',data.sources.target,'当前登录会话；界面显示PCS M1全量授权，不代表已验证权限控制。'],
 ['审查','时间范围',`${data.start} 至 ${data.end}（Asia/Shanghai）`,'截图实际采集时间，列表截图采用文件写入时间补记。'],
 ['审查','部署Build','未展示/未提供','本报告是当前页面观察；未改原表正式测试结果，不作为发布/提测通过签署。'],
 ['审查','页面资源指纹',data.fingerprint.assetPaths.join('\n'),'资源路径用于追溯，不等同于服务端部署Build或Git提交。'],
 ['审查','环境/量测','Codex In-app Browser；1440×1000、1440×800、1280×800 CSS视口；DPR约0.9。','浏览器缩放未独立读取；规范尺寸以computed style及CSS坐标量测。初期截图可见区域高度896，800px批次补完整可见视口。'],
 ['审查','方法','页面/截图＋DOM computed style/ARIA/label关联＋只读交互。','没有从当前实现反推业务验收规则；没有自动认定整页拟合百分比。'],
 ['范围','已查实例','18对象列表、8编辑表单、1新增表单、航线区域/Zone两类详情。','原49条UI case均记录覆盖边界；不是49条完整用例已通过。'],
 ['范围','业务数据动作','未点击保存、删除、启停、批量或上传。临时字段输入已取消。','国家名称和货物说明取消后重开恢复原值；未用UI回显证明完整数据库/接口验收。'],
 ['范围','未覆盖','多页/跨页、授权矩阵、可控慢网/失败、提交防重、完整CRUD、完整读屏与非桌面端。','现有列表仅1—2条；写入/异常需批准场景和专用数据。'],
 ['判定','实测问题','7条已观察问题，每条有原图、条款、量测/动作和修改建议。','类型不等于原Review优先级；处理优先级仅为本报告建议。'],
 ['判定','待确认事项','5条：分类采用、关联展示、规范冲突、标题层级、启动加载层级。','保留事实与建议，取得本批口径后再判是否属于整改/例外。'],
 ['判定','五色映射','原case保留框架适配判断：红/蓝/黄/绿/白灰代表适配方式。','五色与实测通过/失败及缺陷级别分别记录。'],
 ['依据','通用设计规范V1.2',`revision_id=${data.revisions.uiNorm}\n${data.sources.uiNorm}`,'本次文档及关键内嵌表已只读刷新。表头色/页头/触达矛盾见DQ03。'],
 ['依据','公共用例基准库V1.2',`revision_id=${data.revisions.publicBaseline}\n${data.sources.publicBaseline}`,'重点3.1/3.2/5.1—5.5；条件性能力按交付裁剪。'],
 ['依据','UI Review当前视图',`rev=${data.revisions.review}\n${data.sources.review}`,'23条来源；来源状态不等于实测结论。新增服务单元重复候选不扩大本次URL范围。'],
 ['依据','用户指定原用例',data.sourceWorkbook.path.split(/[\\/]/).at(-1),'原文件未改动；UI01—UI49编号、字段范围与裁剪边界作为本报告输入。'],
 ['依据','上一份测试建议','SN318_UI规范审查_测试建议与修改清单.xlsx','FE01关联INT03/10，FE05关联INT08，FE07关联INT05/08；补充建议不是产品新契约。'],
 ['复测','完成后记录','填写修改项责任人、复测Build、实际步骤、结果和新证据。','源正式用例的本批采用/关键项/Build等门槛仍独立，不由本报告直接写成通过。'],
];
tableSheet('审查依据','审查环境、依据与判定边界',
  '先用本报告定位偏差和待决事项；正式验收仍需本批Build、批准基线及全部适用状态的证据。',
  ['类别','项目','实际记录/来源','说明/边界'],envRows,[13,30,91,82],'AuditBasis');

wb.recalculate();
assert.equal(main.getRange('B4').values[0][0],7);assert.equal(main.getRange('D4').values[0][0],5);
const firstLink=main.getRange('K6').values[0][0];
assert.equal(firstLink,`E20、E24、E30、E31\n首图位置：截图证据!A${galleryRows.get('E20')}`);
const scan=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:50},maxChars:1800});
await fs.writeFile(`${work}/formula-scan.ndjson`,scan.ndjson);
const previewJobs=process.argv.includes('--content-repair')?[['修改清单','D13:I15','pending-preview.png']]:[
 ['修改清单','A2:H8','issues-preview.png'],['修改清单','I5:Q8','issue-tail-preview.png'],
 ['用例覆盖','A2:H10','coverage-preview.png'],['页面范围','A2:I10','scope-preview.png'],
 ['截图证据','A2:G9','evidence-index-preview.png'],['截图证据',`A${galleryRows.get('E01')}:L${galleryRows.get('E01')+30}`,'image-preview.png'],
 ['审查依据','A2:D10','basis-preview.png'],
];
for(const [sheetName,range,file] of previewJobs){const blob=await wb.render({sheetName,range,scale:1.1,format:'png'});await fs.writeFile(`${work}/${file}`,new Uint8Array(await blob.arrayBuffer()));}
const xlsxPath=`${out}/SN318_基础配置前端UI走查_修改清单及截图证据.xlsx`;
await (await SpreadsheetFile.exportXlsx(wb)).save(xlsxPath);

const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const imgLinks=ids=>ids.map(id=>`<a href="#${id}">${id}</a>`).join('、');
const cards=data.findings.map(f=>`<article id="${f.id}" class="${f.kind==='实测问题'?'issue':'pending'}"><div class="meta">${f.id} · ${escape(f.kind)} · ${escape(f.priority)} · ${escape(f.role)}</div><h2>${escape(f.title)}</h2><p class="scope">${escape(f.scope)}</p><dl><dt>实际表现</dt><dd>${escape(f.actual)}</dd><dt>规范依据</dt><dd>${escape(f.basis)} <a href="${f.sourceUrl}">查看来源</a></dd><dt>修改建议</dt><dd>${escape(f.fix)}</dd><dt>复测标准</dt><dd>${escape(f.retest)}</dd><dt>对应与证据</dt><dd>${escape(f.caseIds.join('、'))}；${imgLinks(f.evidenceIds)}</dd>${f.prerequisite!=='—'?`<dt>边界/待确认</dt><dd>${escape(f.prerequisite)}</dd>`:''}</dl></article>`).join('');
const photos=data.evidence.map(e=>`<details id="${e.id}"><summary>${e.id} · ${escape(e.label)}</summary><p class="meta">${escape(e.capturedAt)} 上海时间 · CSS视口 ${escape(e.viewport)} · 原图 ${escape(e.imageSize)}</p><p class="url">${escape(e.url)}</p><img src="${imageData.get(e.id)}" alt="${escape(e.id+' '+e.label)}" loading="lazy"><p class="meta">${escape(e.scopeNote)}</p></details>`).join('');
const coverageHtml=data.coverage.map(r=>`<tr>${r.slice(0,5).map(x=>`<td>${escape(x)}</td>`).join('')}<td>${escape(r[7])}</td></tr>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SN318 基础配置前端UI走查</title><style>body{margin:0;background:#f2f5f8;color:#243247;font:15px/1.7 'Microsoft YaHei',sans-serif}main{max-width:1180px;margin:36px auto;padding:0 24px}h1{font-size:28px;line-height:1.4}h2{font-size:21px;margin:12px 0}p{margin:10px 0}.lead{font-size:18px}.meta,.scope,.url{color:#5b6b7d;font-size:13px}.url{overflow-wrap:anywhere}nav{display:flex;gap:16px;flex-wrap:wrap;margin:22px 0}a{color:#046efc;text-decoration:none}article,details,.context{background:white;border:1px solid #dbe3ec;border-radius:12px;padding:24px;margin:20px 0}article.issue{border-left:4px solid #c76554}article.pending{border-left:4px solid #c5a356}dl{display:grid;grid-template-columns:94px 1fr;gap:12px 20px}dt{font-weight:500}dd{margin:0}summary{cursor:pointer;font-weight:500}img{display:block;width:100%;height:auto;border:1px solid #e1e7ee;margin-top:16px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:11px;vertical-align:top;border-bottom:1px solid #dbe3ec;text-align:left}th{background:#244d79;color:white}.table-wrap{overflow:auto} @media(max-width:700px){main{padding:0 12px}dl{grid-template-columns:1fr;gap:4px}dd{margin-bottom:12px}}</style><main><h1>基础配置前端UI走查</h1><p class="lead">已观察到7条问题，另有5条事项需要UI/产品确认。</p><p>查看18个对象列表、8个编辑表单、1个新增表单及2类详情，保留48张原始截图。原用例表未改动；本次未提交业务数据变更。</p><p class="meta">${escape(data.start)}—${escape(data.end)}（上海时间） · UI规范rev5256 · 公共库rev95 · Review rev650</p><div class="context"><strong>本次边界</strong><p>未提供部署Build，当前页面资源路径为 ${escape(data.fingerprint.assetPaths.join(', '))}。本报告用于定位当前观察，不作为正式提测通过签署。多页/跨页、可控异常、提交防重及完整CRUD未覆盖；49条用例定义分别记录覆盖与缺口。</p></div><nav><a href="#changes">修改清单</a><a href="#coverage">用例覆盖</a><a href="#photos">截图证据</a><a href="${data.sources.uiNorm}">UI规范</a><a href="${data.sources.publicBaseline}">公共用例库</a></nav><section id="changes">${cards}</section><section id="coverage"><h2>用例覆盖与未覆盖</h2><p>“部分已核”不等于整条case通过。服务单元/AI等没有用基础配置对象替代。</p><div class="table-wrap"><table><thead><tr><th>case</th><th>原模块</th><th>检查点</th><th>观察结论</th><th>已观察</th><th>未覆盖/条件</th></tr></thead><tbody>${coverageHtml}</tbody></table></div></section><section id="photos"><h2>原始截图证据</h2><p>点击标题展开原图；图片已内嵌，本HTML不依赖截图目录。</p>${photos}</section></main></html>`;
const htmlPath=`${out}/SN318_基础配置UI走查_图文报告.html`;
const detailScript=`<script>function revealEvidence(){var el=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(el&&el.tagName==='DETAILS'){el.open=true;}}window.addEventListener('hashchange',revealEvidence);document.addEventListener('click',function(ev){var a=ev.target.closest('a[href^="#"]');if(a){var el=document.getElementById(a.getAttribute('href').slice(1));if(el&&el.tagName==='DETAILS')el.open=true;}});revealEvidence();</script>`;
await fs.writeFile(htmlPath,html.replace('</html>',detailScript+'</html>'),'utf8');
await fs.writeFile(`${work}/report-verification.json`,JSON.stringify({xlsxPath,htmlPath,counts:data.counts,links:[firstLink],formulaScan:scan.ndjson,galleryRows:Object.fromEntries(galleryRows)},null,2));
console.log(JSON.stringify({xlsxPath,htmlPath,counts:data.counts,formulaScan:scan.ndjson},null,2));
