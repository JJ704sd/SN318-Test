import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const work='./recipes/ui-w2-audit';
const out='./artifacts/ui-audit/W2';
const data=JSON.parse(await fs.readFile(`${work}/report-data.json`,'utf8'));
const wb=Workbook.create();
for(const name of ['修改清单','W2审查范围','Review与依据','截图证据'])wb.worksheets.add(name);
const colName=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
const palette={ink:'#243247',header:'#244D79',muted:'#53687D',input:'#FFF3D6'};
function makeSheet(name,title,note,headers,rows,widths,tableName){
  const s=wb.worksheets.getItem(name),last=colName(headers.length),end=rows.length+5;
  s.showGridLines=false;
  s.getRange(`A1:${last}${end}`).format={font:{name:'Microsoft YaHei',size:10,color:palette.ink},verticalAlignment:'top'};
  s.getRange('A2').values=[[title]];
  s.getRange('A2').format.font={name:'Microsoft YaHei',size:15,bold:true,color:palette.ink};
  s.getRange(`A2:${last}2`).format.rowHeight=29;
  s.getRange('A3').values=[[note]];
  s.getRange('A3').format.font={name:'Microsoft YaHei',size:10,color:palette.muted};
  s.getRange('A3').format.wrapText=false;s.getRange(`A3:${last}3`).format.rowHeight=25;
  s.getRange(`A5:${last}5`).values=[headers];
  s.getRange(`A6:${last}${end}`).values=rows;
  const t=s.tables.add(`A5:${last}${end}`,true,tableName);t.style='TableStyleMedium2';
  s.getRange(`A5:${last}5`).format={fill:palette.header,font:{name:'Microsoft YaHei',size:10,color:'#FFFFFF',bold:true},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:40,borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};
  s.getRange(`A6:${last}${end}`).format.wrapText=true;
  for(let c=0;c<headers.length;c++)s.getRange(`${colName(c+1)}1:${colName(c+1)}${end}`).format.columnWidth=widths[c];
  for(let i=0;i<rows.length;i++){
    const lines=Math.max(...rows[i].map((v,c)=>String(v??'').split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil([...line].reduce((n,x)=>n+(x.charCodeAt(0)>255?1.85:1),0)/Math.max(8,widths[c]-2))),0)));
    s.getRange(`A${i+6}:${last}${i+6}`).format.rowHeight=Math.max(52,lines*14+12);
  }
  s.freezePanes.freezeRows(5);s.freezePanes.freezeColumns(3);
  return s;
}
const images=new Map(),galleryRows=new Map();
let gr=data.evidence.length+11;
for(const e of data.evidence){
  const bytes=await fs.readFile(e.path);
  images.set(e.id,`data:${e.mime};base64,${bytes.toString('base64')}`);
  galleryRows.set(e.id,gr);
  gr+=Math.ceil((960*e.imageHeight/e.imageWidth)/24)+5;
}
const issueRows=data.items.map(f=>[f.id,f.kind,f.priority,f.packages.join('、')||'W2共用组件',f.page,f.title,f.actual,f.basis,f.fix,f.retest,f.evidence.length?`${f.evidence.join('、')}\n首图：截图证据!A${galleryRows.get(f.evidence[0])}`:'未实测；参见Review与依据',f.refs,f.case,f.role,null,'未执行',null]);
const main=makeSheet('修改清单','W2 前端UI规范审查与修改清单',
  '范围：2026-10-12至10-16。38项中3项部分走查，35项未获得入口；4条实测问题与7条设计待确认项分别记录，未提供部署Build。',
  ['编号','依据类型','处理建议','排期序号','页面/组件','问题或待决事项','实际表现/设计记录','UI规范依据','具体修改建议','复测标准','截图证据','Review/裁决记录','原UI case对照','建议处理角色','责任人（待填）','复测结果','复测Build/证据'],
  issueRows,[11,18,14,19,31,34,57,48,56,50,35,36,25,23,18,18,38],'W2FrontendChanges');
main.tabColor=palette.header;
main.getRange('A4:J4').values=[['实测问题',null,'设计待确认',null,'W2项数',null,'部分走查',null,'未获得入口',null]];
main.getRange('B4').formulas=[['=COUNTIFS(B6:B17,"实测问题")']];
main.getRange('D4').formulas=[['=COUNTIFS(B6:B17,"待确认设计项")']];
main.getRange('F4').formulas=[['=COUNTA(\'W2审查范围\'!A6:A43)']];
main.getRange('H4').formulas=[['=COUNTIFS(\'W2审查范围\'!H6:H43,"部分已走查")']];
main.getRange('J4').formulas=[['=COUNTIFS(\'W2审查范围\'!H6:H43,"未获得入口")']];
main.getRange('A4:J4').format.font.bold=true;main.getRange('A4:J4').format.rowHeight=26;
main.getRange('O6:Q17').format.fill=palette.input;
main.getRange('P6:P17').dataValidation={rule:{type:'list',values:['未执行','通过','失败','受阻']}};
main.getRange('B6:B17').conditionalFormats.addCustom('B6="实测问题"',{fill:'#FDE9E5',font:{color:'#A94537'}});
main.getRange('B6:B17').conditionalFormats.addCustom('B6="待确认设计项"',{fill:'#FFF0CF',font:{color:'#805C22'}});

const scope=makeSheet('W2审查范围','W2 38个工作包的页面覆盖',
  'W2=排期J列“UI/开”。部分已走查不等于整项通过；参考Zone、货物类型字典、运输方式字典不代替价格维护Zone、可接货型及计费方式。',
  ['排期序号','原表行号','一级目录','二级目录','工作包','源优先级','来源类型','本轮覆盖','实际观察','下一步UI核查点','规范/Review依据','截图','未覆盖/必要条件','源排期人员（产品/开发/测试）'],
  data.scopeRows,[12,12,23,27,41,13,20,19,52,62,49,31,67,42],'W2Coverage');
scope.getRange('A6:B43').format.horizontalAlignment='right';
scope.getRange('H6:H43').conditionalFormats.addCustom('H6="未获得入口"',{fill:'#FFF0CF',font:{color:'#805C22'}});
const review=makeSheet('Review与依据','UI Review原记录及审查来源',
  `UI Review rev${data.revisions.review}完整读取24条；原确认状态保留。“设计完毕”不表示已实现或验收通过；原型问题不等同本轮实测缺陷。`,
  ['资料编号','record_id','页面/模块','源优先级','源五色判断','源确认状态','原型问题原文','Review建议原文','后续处理建议原文','源处理角色','使用边界'],
  data.reviews,[12,31,23,13,24,18,66,80,58,25,44],'W2ReviewSource');
const sourcesStart=35;
review.getRange('F34').values=[['审查来源']];
review.getRange('F34').format.font={name:'Microsoft YaHei',size:12,bold:true,color:palette.ink};
review.getRange(`F${sourcesStart}:I${sourcesStart}`).values=[['来源','标题/对象','版本与用途','入口']];
review.getRange(`F${sourcesStart}:I${sourcesStart}`).format={fill:palette.header,font:{name:'Microsoft YaHei',size:10,color:'#FFFFFF',bold:true},wrapText:true,rowHeight:32};
review.getRange(`F${sourcesStart+1}:I${sourcesStart+data.sources.length}`).values=data.sources;
review.getRange(`F${sourcesStart+1}:I${sourcesStart+data.sources.length}`).format={font:{name:'Microsoft YaHei',size:10,color:palette.ink},wrapText:true,verticalAlignment:'top',rowHeight:80};
review.getRange('A43:H43').format.rowHeight=45;
review.getRange('A43').values=[['注意：新增“历史版本抽屉”Review记录适用于服务单元；服务组合历史版本（排期9）仍需本模块批准稿，不能据此写成已交付。']];

const gallery=wb.worksheets.getItem('截图证据');gallery.showGridLines=false;
gallery.getRange(`A1:L${gr}`).format={font:{name:'Microsoft YaHei',size:10,color:palette.ink},verticalAlignment:'top',rowHeight:24};
for(let c=1;c<=12;c++)gallery.getRange(`${colName(c)}1:${colName(c)}${gr}`).format.columnWidth=c===1?12:15;
gallery.getRange('A2').values=[['本轮原始截图证据']];gallery.getRange('A2').format.font={name:'Microsoft YaHei',size:15,bold:true,color:palette.ink};
gallery.getRange('A3').values=[['22张本轮截图；时区上海。CSS视口与原图尺寸分别记录；可见区域截图不用于判断未被截入的页面内容。']];
gallery.getRange('A5:I5').values=[['证据ID','页面/场景','取证时间（上海）','CSS视口','原图尺寸','W2序号','页面URL','图片位置','证据边界']];
const index=data.evidence.map(e=>[e.id,e.label,new Date(`${e.capturedAt.replace(' ','T')}Z`),e.viewport,e.imageSize,e.packages.join('、'),e.url,`A${galleryRows.get(e.id)}`,'本轮可见区域截图；未提交业务数据变更']);
gallery.getRange(`A6:I${data.evidence.length+5}`).values=index;
gallery.getRange('A5:I5').format={fill:palette.header,font:{name:'Microsoft YaHei',size:10,color:'#FFFFFF',bold:true},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:40};
const widths=[12,46,24,25,22,17,97,19,47];
for(let i=0;i<widths.length;i++)gallery.getRange(`${colName(i+1)}1:${colName(i+1)}${data.evidence.length+5}`).format.columnWidth=widths[i];
gallery.getRange(`A6:I${data.evidence.length+5}`).format.wrapText=true;
gallery.getRange(`A6:I${data.evidence.length+5}`).format.rowHeight=58;
gallery.getRange(`C6:C${data.evidence.length+5}`).setNumberFormat('yyyy-mm-dd hh:mm:ss');
for(const e of data.evidence){
  const r=galleryRows.get(e.id),h=960*e.imageHeight/e.imageWidth;
  gallery.getRange(`A${r}:I${r}`).format.rowHeight=30;
  gallery.getRange(`A${r}`).values=[[`${e.id}  ${e.label}（W2序号${e.packages.join('、')}）`]];
  gallery.getRange(`A${r}`).format.font.bold=true;
  gallery.getRange(`A${r+1}`).values=[[`${e.capturedAt} 上海时间  |  CSS视口${e.viewport}  |  原图${e.imageSize}`]];
  gallery.images.add({dataUrl:images.get(e.id),anchor:{from:{row:r+2,col:0},extent:{widthPx:960,heightPx:h}}});
}
gallery.freezePanes.freezeRows(5);
wb.recalculate();
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'final formula error scan'});
await fs.writeFile(`${work}/formula-scan.ndjson`,errors.ndjson,'utf8');
const stats=await wb.inspect({kind:'table',range:'修改清单!A4:J4',include:'values,formulas',tableMaxRows:1,tableMaxCols:10});
await fs.writeFile(`${work}/summary-inspection.ndjson`,stats.ndjson,'utf8');
for(const [sheetName,range,file] of [
  ['修改清单','D5:J9','issues-preview.png'],
  ['修改清单','D10:J13','design-preview.png'],
  ['修改清单','D14:J17','conditions-preview.png'],
  ['W2审查范围','A5:J11','scope-preview.png'],
  ['W2审查范围','A33:J43','scope-tail-preview.png'],
  ['Review与依据','B5:H11','review-preview.png'],
  ['Review与依据','F34:I41','sources-preview.png'],
  ['截图证据','A5:F12','evidence-preview.png'],
  ['截图证据',`A${galleryRows.get('W03')}:F${galleryRows.get('W03')+28}`,'image-preview.png'],
]){
  if(process.argv.includes('--content-repair') && file!=='issues-preview.png')continue;
  const blob=await wb.render({sheetName,range,scale:1});
  await fs.writeFile(`${work}/${file}`,new Uint8Array(await blob.arrayBuffer()));
}
const xlsxPath=`${out}/SN318_W2前端UI规范审查_修改清单.xlsx`;
const exported=await SpreadsheetFile.exportXlsx(wb);await exported.save(xlsxPath);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const evidenceLinks=ids=>ids.length?ids.map(id=>`<a href="#${id}">${id}</a>`).join(' · '):'尚未获得业务页面截图；设计依据见来源';
const cards=data.items.map(f=>`<article id="${f.id}" class="${f.kind==='实测问题'?'issue':'pending'}"><p class="meta">${esc(f.id)} · ${esc(f.kind)} · 排期序号 ${esc(f.packages.join('、')||'W2共用组件')}</p><h2>${esc(f.title)}</h2><p>${esc(f.page)}</p><dl><dt>观察与来源</dt><dd>${esc(f.actual)}</dd><dt>规范依据</dt><dd>${esc(f.basis)}</dd><dt>修改建议</dt><dd>${esc(f.fix)}</dd><dt>复测标准</dt><dd>${esc(f.retest)}</dd><dt>证据</dt><dd>${evidenceLinks(f.evidence)}</dd><dt>记录</dt><dd>${esc(f.refs)}；${esc(f.case)}</dd></dl></article>`).join('');
const scopeRows=data.scope.map(p=>`<tr><td>${esc(p.seq)}</td><td>${esc(p.level1+' / '+p.level2)}</td><td>${esc(p.feature)}</td><td>${esc(p.status)}</td><td>${esc(p.actual)}</td><td>${esc(p.checks)}</td><td>${esc(p.remaining)}</td></tr>`).join('');
const photos=data.evidence.map(e=>`<details id="${e.id}"><summary>${esc(e.id+' · '+e.label)}</summary><p class="meta">${esc(e.capturedAt)} 上海时间 · CSS视口${esc(e.viewport)} · 原图${esc(e.imageSize)}</p><p class="url">${esc(e.url)}</p><img src="${images.get(e.id)}" alt="${esc(e.label)}" loading="lazy"></details>`).join('');
const sourceHtml=data.sources.map(s=>`<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td><td>${esc(s[2])}</td><td>${s[3].startsWith('https://')?`<a href="${esc(s[3])}">查看来源</a>`:'原已提供工作簿，仅作UI编号对照'}</td></tr>`).join('');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SN318 W2 前端UI规范审查</title><style>body{margin:0;background:#f2f5f8;color:#243247;font:15px/1.7 'Microsoft YaHei',sans-serif}main{max-width:1180px;margin:32px auto;padding:0 24px}h1{font-size:28px}h2{font-size:21px;margin:12px 0}.lead{font-size:18px}.meta,.url{color:#5b6b7d;font-size:13px}.url{overflow-wrap:anywhere}nav{display:flex;gap:20px;flex-wrap:wrap;margin:22px 0}a{color:#046efc;text-decoration:none}article,details,.context{background:white;border:1px solid #dbe3ec;border-radius:12px;padding:24px;margin:20px 0}article.issue{border-left:4px solid #c76554}article.pending{border-left:4px solid #c5a356}dl{display:grid;grid-template-columns:96px 1fr;gap:12px 18px}dt{font-weight:500}dd{margin:0}summary{cursor:pointer;font-weight:500}img{display:block;width:100%;height:auto;border:1px solid #e1e7ee;margin-top:16px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:11px;vertical-align:top;border-bottom:1px solid #dbe3ec;text-align:left}th{background:#244d79;color:white}.table-wrap{overflow:auto}@media(max-width:700px){main{padding:0 12px}dl{grid-template-columns:1fr;gap:4px}dd{margin-bottom:12px}}</style></head><body><main><h1>W2 前端UI规范审查与修改清单</h1><p class="lead">4条实测问题、7条设计待确认项，另记录1项访问条件。</p><p>按排期W2（2026-10-12至10-16）“UI/开”38个工作包执行；3项部分走查，35项未获得入口。22张截图均为本轮取证。</p><p class="meta">${esc(data.start)}—${esc(data.end)} 上海时间 · 排期rev988 · UI规范rev5256 · UI Review rev680（24条）</p><div class="context"><strong>覆盖边界</strong><p>当前PCS M1全量授权账号导航仅系统配置/基础配置。查看8个对象列表、5类编辑表单及1个新增表单；未提交保存、启停、删除、上传或AI调用。没有部署Build号，多页/跨页、可控异常和其他角色未覆盖。</p><p>服务管理、价格维护和操作日志等页面未获得入口；这不等于页面未实现。基础配置参考Zone不代替价格维护Zone；货物类型字典不代替可接货型，运输方式字典不代替计费方式。</p></div><nav><a href="#changes">修改清单</a><a href="#coverage">38项覆盖</a><a href="#sources">规范与来源</a><a href="#photos">22张截图</a></nav><section id="changes">${cards}</section><section id="coverage"><h2>W2工作包覆盖</h2><div class="table-wrap"><table><thead><tr><th>排期序号</th><th>模块</th><th>工作包</th><th>本轮覆盖</th><th>实际观察</th><th>UI核查点</th><th>未覆盖/条件</th></tr></thead><tbody>${scopeRows}</tbody></table></div></section><section id="sources"><h2>审查依据</h2><p>工作簿保留24条UI Review原记录和源确认状态。“设计完毕”不表示已实现或验收通过。新增历史版本抽屉方案属于服务单元，不直接替代服务组合的承载设计。</p><table><thead><tr><th>来源</th><th>对象</th><th>版本与用途</th><th>入口</th></tr></thead><tbody>${sourceHtml}</tbody></table></section><section id="photos"><h2>本轮原始截图</h2><p>点击标题展开；图片已内嵌，可脱离截图目录查看。</p>${photos}</section></main><script>function reveal(){var e=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(e&&e.tagName==='DETAILS')e.open=true;}window.addEventListener('hashchange',reveal);document.addEventListener('click',function(ev){var a=ev.target.closest('a[href^="#"]');if(a){var e=document.getElementById(a.getAttribute('href').slice(1));if(e&&e.tagName==='DETAILS')e.open=true;}});reveal();</script></body></html>`;
const htmlPath=`${out}/SN318_W2前端UI审查_图文报告.html`;
await fs.writeFile(htmlPath,html,'utf8');
await fs.writeFile(`${work}/report-verification.json`,JSON.stringify({xlsxPath,htmlPath,counts:data.counts,galleryRows:Object.fromEntries(galleryRows),formulaScan:errors.ndjson},null,2));
console.log(JSON.stringify({xlsxPath,htmlPath,counts:data.counts,formulaScan:errors.ndjson},null,2));
