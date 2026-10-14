import fs from 'node:fs/promises';
import path from 'node:path';
import { Workbook, SpreadsheetFile, FileBlob } from '@oai/artifact-tool';

const work='./recipes/weekly-local-20261013';
const output='./artifacts/weekly-ui';
const d=JSON.parse(await fs.readFile(path.join(work,'rewritten-cases.json'),'utf8'));
if(process.argv.includes('--preview-arrangement')||process.argv.includes('--apply-arrangement')){
 const revisionWork='./recipes/template-ui-execution-20261013';
 const u=JSON.parse(await fs.readFile(path.join(revisionWork,'arrangement-revision.json'),'utf8'));
 const book=await SpreadsheetFile.importXlsx(await FileBlob.load(u.originalWorkbook));
 const previewOnly=process.argv.includes('--preview-arrangement');
 if(!previewOnly){
  const business=book.worksheets.getItem('业务UI与交互用例');
  for(const c of u.businessUpdates){
   business.getRange(`C${c.row}`).values=[[c.precondition]];
   business.getRange(`G${c.row}`).values=[[c.notes]];
   const values=business.getRange(`A${c.row}:I${c.row}`).values[0];
   const height=heightFor(values,[240,235,335,410,440,80,425,100,335]);
   if(height>546)throw new Error(`Business row ${c.row} height overflow ${height}`);
   business.getRange(`A${c.row}:I${c.row}`).format.rowHeightPx=height;
  }
  const scope=book.worksheets.getItem('范围与依据');
  for(const [address,value] of Object.entries(u.scopeUpdates)){
   scope.getRange(address).values=[[value]];
   scope.getRange(`A${address.slice(1)}:H${address.slice(1)}`).format.rowHeightPx=66;
  }
  for(const status of u.scopeStatuses)scope.getRange(`H${status.row}`).values=[[status.value]];
  book.recalculate();
  const checks=[];
  for(const range of ['范围与依据!A3:H14','业务UI与交互用例!C2:I3','业务UI与交互用例!C76:I77']){
   checks.push((await book.inspect({kind:'table',range,include:'values',tableMaxRows:12,tableMaxCols:9,maxChars:2500})).ndjson);
  }
  checks.push((await book.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
  await fs.writeFile(path.join(revisionWork,'arrangement-inspect.json'),JSON.stringify(checks,null,2));
 }
 const views=previewOnly?[['业务UI与交互用例','C1:I3'],['范围与依据','A1:H14']]:[['业务UI与交互用例','C1:I3'],['范围与依据','A1:H14'],['业务UI与交互用例','C76:I77'],['范围与依据','A17:H20']];
 for(let i=0;i<views.length;i++){
  const [sheetName,range]=views[i];
  const blob=await book.render({sheetName,range,scale:1.1,format:'png'});
  await fs.writeFile(path.join(revisionWork,`arrangement-${previewOnly?'before':'after'}-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
 }
 if(!previewOnly)await(await SpreadsheetFile.exportXlsx(book)).save(u.targetWorkbook);
 console.log(JSON.stringify({previewOnly,output:u.targetWorkbook,businessRows:76,templateExecutionPreserved:true}));
 process.exit(0);
}
if(process.argv.includes('--apply-execution')){
 const executionWork='./recipes/template-ui-execution-20261013';
 const u=JSON.parse(await fs.readFile(path.join(executionWork,'execution-update.json'),'utf8'));
 const target=path.join(output,'SN318_W2_UI与交互测试用例_按工单用例风格重写.xlsx');
 const book=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(executionWork,'workbook-before-execution.xlsx')));
 const template=book.worksheets.getItem('通用模板UI与交互用例');
 const h=(values,widths)=>Math.max(76,...values.map((v,i)=>{
  const n=Math.max(4,(widths[i]-18)/14.8);
  const lines=String(v??'').split('\n').reduce((a,line)=>a+Math.max(1,Math.ceil(Array.from(line).reduce((q,c)=>q+(c.charCodeAt(0)>255?1:0.55),0)/n)),0);
  return lines*19+18;
 }));
 template.getRange('I1:I41').format.columnWidthPx=580;
 u.cases.forEach((c,i)=>{
  const row=i+2;
  if(c.updatedTitle)template.getRange(`A${row}`).values=[[c.updatedTitle]];
  if(c.updatedPrecondition)template.getRange(`C${row}`).values=[[c.updatedPrecondition]];
  if(c.updatedSteps)template.getRange(`D${row}`).values=[[c.updatedSteps]];
  if(c.updatedExpected)template.getRange(`E${row}`).values=[[c.updatedExpected]];
  template.getRange(`G${row}:I${row}`).values=[[c.updatedNotes,c.status,c.actualText]];
  const values=template.getRange(`A${row}:I${row}`).values[0];
  const height=h(values,[240,235,335,410,440,80,425,100,580]);
  if(height>546)throw new Error(`Execution row ${row} exceeds Excel height ${height}`);
  template.getRange(`A${row}:I${row}`).format.rowHeightPx=height;
 });
 const scope=book.worksheets.getItem('范围与依据');
 const cc=u.summary.caseCounts,sc=u.summary.stepCounts,kinds=u.summary.checklistKinds;
 const caseText=`通过${cc['通过']}条、不通过${cc['不通过']}条、受阻${cc['受阻']}条`;
 const stepText=`通过${sc['通过']}、不通过${sc['不通过']}、受阻${sc['受阻']}`;
 scope.getRange('A5').values=[[`2026-10-13模板40条：${caseText}。129个子步骤：${stepText}。全面复核40条及原20条受阻，当前正文124张引用表；基于原证据重判，未新增页面执行。业务76条未执行。`]];
 scope.getRange('A5:H5').format.rowHeightPx=58;
 scope.getRange('A14').values=[['来源复核：排期rev988、Review rev680；通用设计规范V1.2正文rev5256、内嵌表格rev3138。完整获取185张表，仅采用当前正文引用124张；10个HTML官方示例沿用原下载和截图。逐条来源、原状态与复核结果见本页142行起。']];
 scope.getRange('A14:H14').format.rowHeightPx=58;
 const executionNotes=[
  '模板原实测环境与全面规范复核（2026-10-13）',
  '原执行环境快照：dev HEAD b2efcdb15e949a07b7d5d74aa997c082106a6b0f；5173由node PID21172监听；/home HTTP200、Mock自动登录可进入。本轮规范复核未重新健康检查。',
  '范围：/home落入基础配置；40条通用用例使用/demo/list、/demo/list/form、/demo/components及静态/403、/500。未执行业务76条功能测试。',
  '数据与授权条件：Mock数据/认证、权限全部授予；AI助手关闭。刷新会重置内存身份，重新自动登录可恢复目标路由。',
  `129个步骤：${stepText}。整条：${caseText}。005漏计操作列左对齐改不通过；032默认圆角2px改不通过；012明确修订UI校验呈现范围后通过。022/037维持不通过。`,
  '证据：92张应用截图、10张规范参考截图，另有DOM量测JSON、环境记录、逐步日志与规范附件SHA索引。E078/E079是无效Mobile视口尝试，正确证据为E080/E081。',
  `修改清单：${kinds['规范差异']}项规范差异、${kinds['可用性建议']}项可用性建议、${kinds['用例口径修订']}项口径修订、${kinds['执行条件待补']}条执行条件、${kinds['部分步骤待补']}条失败用例的子步骤缺口。005/032复用M03/M01，没有新增不同缺陷；本轮未修改应用源码。`,
  '静态/403和/500只证明展示与返回。初始化403、提交403、查询timeout/offline/500等没有可切换Mock响应，本次分别受阻。',
  '配套报告：SN318_通用模板40条_UI交互实测报告_20261013.html。截图及量测：evidence/template-execution-20261013。证据包解压后可打开报告查看相对路径图片。',
  '全面规范复核：正文5256/表格3138未变，已检查当前124张引用表。011/030/034/036等规格已有依据，不再等额外批准稿；012业务类型空组合未执行。032加载宽度可因Spin增加。来源快照及40条索引见norm-full-audit-*.json/txt。'
 ];
 executionNotes.forEach((text,i)=>{
  const row=127+i,range=scope.getRange(`A${row}:H${row}`);range.merge();scope.getRange(`A${row}`).values=[[text]];
  range.format.wrapText=true;range.format.font={name:'SimSun',size:i?11:13,bold:!i,color:'#25344A'};
  range.format.verticalAlignment='top';range.format.rowHeightPx=i?58:32;
 });
 const auditWidths=[80,85,220,360,145,95,240,245];
 scope.getRange('A140:H140').merge();scope.getRange('A140').values=[['40条通用模板规范全面复核索引（条款、结论、证据及剩余缺口）']];
 scope.getRange('A140:H140').format={font:{name:'SimSun',size:13,bold:true,color:'#25344A'},rowHeightPx:32};
 scope.getRange('A141:H141').merge();scope.getRange('A141').values=[['原状态指上轮交付12通过/8不通过/20受阻；本次状态按修订用例及原证据判定。原20条受阻以浅黄色标记。规则与执行证据分开审查，未触发的子步骤仍保留缺口。']];
 scope.getRange('A141:H141').format={font:{name:'SimSun',size:11,color:'#25344A'},wrapText:true,verticalAlignment:'top',rowHeightPx:58};
 scope.getRange('A142:H182').format={font:{name:'SimSun',size:11,color:'#25344A'},wrapText:true,verticalAlignment:'top'};
 scope.getRange('A142:H142').values=[['用例编号','原状态','规范依据','明确规则与复核结论','规则性质','本次状态','后续缺口','原证据']];
 scope.getRange('A142:H142').format={fill:'#E8EEF5',font:{name:'SimSun',size:11,bold:true,color:'#233B61'},horizontalAlignment:'center',verticalAlignment:'center',rowHeightPx:38};
 const auditRows=u.audit.cases.map(a=>[a.id,a.before,a.source,a.rule+'\n'+a.decision,a.kind,a.after,a.remaining||'本条步骤无新增执行缺口。',a.evidence.replaceAll('、','\n')]);
 scope.getRange('A143:H182').values=auditRows;
 auditRows.forEach((r,i)=>{const height=h(r,auditWidths);if(height>546)throw new Error(`Audit row ${i+143} height overflow ${height}`);const range=scope.getRange(`A${i+143}:H${i+143}`);range.format.rowHeightPx=height;range.format.fill=u.audit.cases[i].before==='受阻'?'#FFF8E7':(i%2?'#F7F9FC':'#FFFFFF');});
 scope.tables.add('A142:H182',true,'FullNormAuditIndex').showFilterButton=true;
 const fix=book.worksheets.add('修改清单');fix.showGridLines=false;
 const labels=['编号','类型','等级','页面/对象','规范依据','实际情况','修改或补齐建议','验收标准','相关用例','证据','状态'];
 const widths=[80,145,65,235,250,500,380,330,145,300,100];
 const last=u.checklist.length+1;
 fix.getRange(`A1:K${last}`).format={font:{name:'SimSun',size:11,color:'#25344A'},wrapText:true,verticalAlignment:'top'};
 widths.forEach((w,i)=>fix.getRangeByIndexes(0,i,last,1).format.columnWidthPx=w);
 fix.getRange('A1:K1').values=[labels];fix.getRange('A1:K1').format={fill:'#E8EEF5',font:{name:'SimSun',size:11,bold:true,color:'#233B61'},horizontalAlignment:'center',verticalAlignment:'center',rowHeightPx:38};
 const rows=u.checklist.map(c=>['id','kind','level','object','spec','actual','recommend','accept','cases','evidence','state'].map(k=>c[k]));
 fix.getRange(`A2:K${last}`).values=rows;
 rows.forEach((r,i)=>{const height=Math.ceil(h(r,widths)*1.15+38);if(height>546)throw new Error('Checklist height overflow');const range=fix.getRange(`A${i+2}:K${i+2}`);range.format.rowHeightPx=height;range.format.fill=i%2?'#F7F9FC':'#FFFFFF';});
 fix.tables.add(`A1:K${last}`,true,'TemplateModificationList').showFilterButton=true;
 fix.getRange(`K2:K${last}`).dataValidation={rule:{type:'list',values:['待修改','待确认','待补条件','已修订','已修改待复测','复测通过']}};
 fix.getRange(`K2:K${last}`).format.fill='#FFF5DB';
 fix.freezePanes.freezeRows(1);fix.freezePanes.freezeColumns(2);
 book.recalculate();
 const inspections=[];
 for(const range of ['通用模板UI与交互用例!C12:I13','通用模板UI与交互用例!G33:I33','修改清单!A1:K3','范围与依据!A127:H136','范围与依据!A153:H156']){
  inspections.push((await book.inspect({kind:'table',range,include:'values',tableMaxRows:10,tableMaxCols:11,maxChars:4000})).ndjson);
 }
 const errors=await book.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!',options:{useRegex:true,maxResults:20},summary:'Execution workbook error scan'});
 await fs.writeFile(path.join(executionWork,'workbook-inspect.json'),JSON.stringify({inspections,errors:errors.ndjson},null,2));
 const views=[['通用模板UI与交互用例','G6:I6'],['通用模板UI与交互用例','C12:I13'],['通用模板UI与交互用例','C31:I33'],['通用模板UI与交互用例','C35:I38'],['修改清单','D1:K4'],['修改清单','D25:K28'],['范围与依据','A127:H136'],['范围与依据','A140:H148'],['范围与依据','A153:H156'],['范围与依据','A172:H179']];
 for(let i=0;i<views.length;i++){const [sheetName,range]=views[i];const blob=await book.render({sheetName,range,scale:1.2,format:'png'});await fs.writeFile(path.join(executionWork,`execution-preview-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));}
 await (await SpreadsheetFile.exportXlsx(book)).save(target);
 console.log(JSON.stringify({output:target,cases:u.summary.caseCounts,steps:u.summary.stepCounts,checklistRows:rows.length}));
 process.exit(0);
}
const wb=Workbook.create();
const headers=['用例名称','所属模块','前置条件','步骤描述','预期结果','用例等级','备注','执行状态','实际结果/证据'];
const keys=['title','module','precondition','steps','expected','priority','notes','status','actual'];
const widths=[240,235,335,410,440,80,425,100,335];
const column=n=>String.fromCharCode(65+n);
function heightFor(row,ws){
 return Math.max(76,...row.map((v,j)=>{
  const chars=Math.max(4,(ws[j]-18)/14.8);
  let lines=0;
  for(const line of String(v??'').split('\n')){
   const units=Array.from(line).reduce((sum,ch)=>sum+(ch.charCodeAt(0)>255?1:0.55),0);
   lines+=Math.max(1,Math.ceil(units/chars));
  }
  return lines*19+18;
 }));
}
function cases(name,records,tableName){
 const s=wb.worksheets.add(name),last=records.length+1;
 s.showGridLines=false;
 const all=s.getRange(`A1:I${last}`);
 all.format.font={name:'SimSun',size:11,color:'#25344A'};
 all.format.wrapText=true;all.format.verticalAlignment='top';
 widths.forEach((w,j)=>s.getRange(`${column(j)}1:${column(j)}${last}`).format.columnWidthPx=w);
 s.getRange('A1:I1').values=[headers];
 s.getRange('A1:I1').format={fill:'#E8EEF5',font:{name:'SimSun',size:11,bold:true,color:'#233B61'},horizontalAlignment:'center',verticalAlignment:'center',rowHeightPx:38};
 const rows=records.map(x=>keys.map(k=>x[k]));
 s.getRange(`A2:I${last}`).values=rows;
 rows.forEach((r,i)=>{
  const h=heightFor(r,widths);
  if(h>546)throw new Error(`Excel row height overflow: ${name} row ${i+2} ${h}`);
  s.getRange(`A${i+2}:I${i+2}`).format.rowHeightPx=h;
  s.getRange(`A${i+2}:I${i+2}`).format.fill=i%2?'#F7F9FC':'#FFFFFF';
 });
 const table=s.tables.add(`A1:I${last}`,true,tableName);table.showFilterButton=true;
 s.getRange(`H2:H${last}`).format.fill='#FFF5DB';
 s.getRange(`H2:H${last}`).format.horizontalAlignment='center';
 s.getRange(`H2:H${last}`).dataValidation={rule:{type:'list',values:['未执行','通过','不通过','受阻','不适用']}};
 s.getRange(`H2:H${last}`).conditionalFormats.add('containsText',{text:'不通过',format:{fill:'#FDE8E7',font:{color:'#A52E28'}}});
 s.getRange(`H2:H${last}`).conditionalFormats.add('containsText',{text:'受阻',format:{fill:'#FFF0CF',font:{color:'#815A10'}}});
 s.getRange(`F2:F${last}`).format.horizontalAlignment='center';
 s.freezePanes.freezeRows(1);s.freezePanes.freezeColumns(2);
 return s;
}
cases('业务UI与交互用例',d.business,'BusinessUICases');
cases('通用模板UI与交互用例',d.templates,'TemplateUICases');

const s=wb.worksheets.add('范围与依据');s.showGridLines=false;
const scopeWidths=[80,85,220,360,145,95,240,245];
scopeWidths.forEach((w,j)=>s.getRange(`${column(j)}1:${column(j)}125`).format.columnWidthPx=w);
s.getRange('A1:H125').format.font={name:'SimSun',size:11,color:'#25344A'};
s.getRange('A1:H125').format.verticalAlignment='top';
s.getRange('A1').values=[['SN318 W2 UI与交互用例执行说明']];s.getRange('A1').format.font={size:16,bold:true};s.getRange('A1:H1').format.rowHeightPx=38;
const notes=[
 '本周范围：2026-10-12—10-16；来源快照日期：2026-10-13。',
 `本轮共${d.counts.total}条：${d.counts.business}条业务候选用例、${d.counts.templates}条模板用例；映射38项UI/开工作包，另24项为需求阶段。`,
 '本轮为用例设计复查，全部未执行。右侧保留首次记录；新增/修改步骤须重新执行，历史记录不能直接作为新版通过结论。',
 '前置条件未满足时记为受阻；待确认规则先补齐书面结论。L=字段长度上限，B=文件字节大小上限，K=文件数上限，N=每页条数。',
 '只验证布局、可见状态、交互路径及恢复。算法、计价、引用规则、版本生成、数据落库和真实鉴权按原功能测试安排。',
 '业务用例等级参考工作包优先级，模板按影响建议安排。记录环境、步骤及证据；条件未补齐时记受阻，不能任选一种行为判通过。',
 '业务表依据排期工作包、规范与Review设计；本轮未读取各业务封板PRD/专项设计稿。“PRD”是排期来源标签，具体缺口见每条备注。',
 '本地地址为通用模板，业务用例应进入本批业务提测环境；Mock样例只证明前端展示与交互。',
 '排期：'+d.sources.schedule,
 '设计规范：'+d.sources.norm,
 'UI Review：'+d.sources.review,
 '复查确认：排期rev988、Review rev680未变化；规范正文rev5256、内嵌工作表rev3138。Review设计确认不代表实现通过；修订记录见本页下方。'
];
notes.forEach((n,i)=>{const range=s.getRange(`A${i+3}:H${i+3}`);range.merge();s.getRange(`A${i+3}`).values=[[n]];range.format.wrapText=true;range.format.rowHeightPx=Math.max(27,heightFor([n],[scopeWidths.reduce((a,b)=>a+b,0)])-49);});
const sh=['源序号','原表行','业务区域','工作包','原始来源','W2阶段','新版用例编号','准入状态'];
s.getRange('A17:H17').values=[sh];s.getRange('A17:H17').format={fill:'#E8EEF5',font:{bold:true,color:'#233B61'},horizontalAlignment:'center',verticalAlignment:'center',rowHeightPx:38};
const sr=d.scope.map(x=>[Number(x.seq),x.row,x.level2,x.feature,x.source,x.w2,x.new_case_ids||'—',x.gate]);
s.getRange(`A18:H${17+sr.length}`).values=sr;
sr.forEach((r,i)=>{const range=s.getRange(`A${i+18}:H${i+18}`);range.format.wrapText=true;range.format.rowHeightPx=heightFor(r,scopeWidths);range.format.fill=i%2?'#F7F9FC':'#FFFFFF';});
const st=s.tables.add(`A17:H${17+sr.length}`,true,'WeekScope');st.showFilterButton=true;
s.getRange('A83').values=[['Review引用索引（按record_id回溯）']];s.getRange('A83').format.font={size:13,bold:true};
s.getRange('A85:F85').values=[['引用ID','原优先级','页面/模块','record_id','原始确认状态','说明']];
s.getRange('A85:F85').format={fill:'#E8EEF5',font:{bold:true,color:'#233B61'},horizontalAlignment:'center',rowHeightPx:38,wrapText:true};
const rr=d.reviews.map(x=>[x.id,(x['优先级']||[]).join('/'),(x['页面/模块']||[]).join('/'),x.record_id,(x['确认状态']||[]).join('/')||'未填',x['Review 建议']?'原始Review记录':'无Review建议，不作独立判据']);
s.getRange(`A86:F${85+rr.length}`).values=rr;
rr.forEach((r,i)=>{s.getRange(`A${i+86}:F${i+86}`).format.wrapText=true;s.getRange(`A${i+86}:F${i+86}`).format.rowHeightPx=heightFor(r,scopeWidths);});
const rt=s.tables.add(`A85:F${85+rr.length}`,true,'ReviewIndex');rt.showFilterButton=true;
s.getRange('A112').values=[['本次复查修订记录']];s.getRange('A112').format.font={size:13,bold:true};
s.getRange('A114:H114').values=[['复核项','序号','相关用例','修订内容','判定依据','变更类型','依据版本','执行边界']];
s.getRange('A114:H114').format={fill:'#E8EEF5',font:{bold:true,color:'#233B61'},horizontalAlignment:'center',verticalAlignment:'center',rowHeightPx:38,wrapText:true};
const ar=d.reaudit.checks.map((x,i)=>[x[0],i+1,x[1],x[2],x[3],i===4?'新增用例':i===0?'分支拆分':'文本复核','正文rev5256 / 表格rev3138','设计复核；本轮页面未执行']);
s.getRange(`A115:H${114+ar.length}`).values=ar;
ar.forEach((r,i)=>{const range=s.getRange(`A${i+115}:H${i+115}`);range.format.wrapText=true;range.format.rowHeightPx=heightFor(r,scopeWidths);range.format.fill=i%2?'#F7F9FC':'#FFFFFF';});
s.freezePanes.freezeRows(17);s.freezePanes.freezeColumns(2);
wb.recalculate();
const check=await wb.inspect({kind:'table',range:'业务UI与交互用例!A1:I3',include:'values',tableMaxRows:3,tableMaxCols:9,maxChars:4500});
await fs.writeFile(path.join(work,'rewrite-inspect.json'),JSON.stringify({sample:check.ndjson,counts:d.counts},null,2));
const views=[['业务UI与交互用例','A1:F3'],['业务UI与交互用例','C1:I3'],['通用模板UI与交互用例','A1:F3'],['通用模板UI与交互用例','C32:I34'],['范围与依据','A1:H20'],['范围与依据','A112:H118'],['通用模板UI与交互用例','C36:I37'],['通用模板UI与交互用例','A40:G41']];
for(let i=0;i<views.length;i++){
 if(i!==5 && process.argv.includes('--review-only'))continue;
 if(process.argv.includes('--changed') && ![0,1,3,6,7].includes(i))continue;
 const [sheetName,range]=views[i];const blob=await wb.render({sheetName,range,scale:1.1,format:'png'});
 await fs.writeFile(path.join(work,`rewrite-preview-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const filename='SN318_W2_UI与交互测试用例_按工单用例风格重写.xlsx';
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(path.join(output,filename));
console.log(JSON.stringify({output:path.join(output,filename),counts:d.counts,previews:views.length}));
