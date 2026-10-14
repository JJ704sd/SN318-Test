import fs from 'node:fs/promises';
import path from 'node:path';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const W='./recipes/weekly-local-20261013';
const O='./artifacts/weekly-ui';
const d=JSON.parse(await fs.readFile(path.join(W,'data.json'),'utf8'));
const wb=Workbook.create();
const sheets={};
for(const name of ['本周任务','模板检查','业务UI用例','修改与待决','规范检查','Review来源'])sheets[name]=wb.worksheets.add(name);
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const color={navy:'#233B61',line:'#DFE5ED',blue:'#175DB1',ink:'#25344A',muted:'#61748A',input:'#FFF7DD'};
function init(name,title,desc,headers,rows,widths,notes=[]){
 const s=sheets[name],end=8+rows.length,last=col(headers.length-1),r=s.getRange(`A1:${last}${end}`);
 s.showGridLines=false;s.tabColor=name==='本周任务'?color.navy:color.blue;
 r.format.font={name:'Arial',size:10,color:color.ink};r.format.verticalAlignment='top';r.format.wrapText=true;r.format.rowHeightPx=28;
 widths.forEach((w,i)=>s.getRange(`${col(i)}1:${col(i)}${end}`).format.columnWidthPx=w);
 s.getRange('A2').values=[[title]];s.getRange(`A2:${last}2`).format.wrapText=false;s.getRange('A2').format.font={size:16,bold:true};s.getRange(`A2:${last}2`).format.rowHeightPx=36;
 s.getRange('A3').values=[[desc]];s.getRange(`A3:${last}3`).format.wrapText=false;s.getRange('A3').format.font={size:10,color:color.muted};
 for(let i=0;i<notes.length;i++){s.getRange(`A${i+4}`).values=[[notes[i]]];s.getRange(`A${i+4}:${last}${i+4}`).format.wrapText=false;}
 s.getRange(`A8:${last}8`).values=[headers];s.getRange(`A8:${last}8`).format={fill:color.navy,font:{bold:true,color:'#FFFFFF',size:10},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeightPx:42};
 s.getRange(`A9:${last}${end}`).values=rows;
 const table=s.tables.add(`A8:${last}${end}`,true,'Table'+Object.keys(sheets).indexOf(name));
 table.showFilterButton=true;
 rows.forEach((row,i)=>{
  const height=Math.max(55,...row.map((v,j)=>{const text=String(v??'');let line=0;for(const l of text.split('\n')){const units=Array.from(l).reduce((n,ch)=>n+(ch.charCodeAt(0)>255?1:0.56),0);line+=Math.max(1,Math.ceil(units/Math.max(4,(widths[j]-18)/14)));}return line*17+18;}));
  s.getRange(`A${i+9}:${last}${i+9}`).format.rowHeightPx=height;
  s.getRange(`A${i+9}:${last}${i+9}`).format.fill=i%2?'#F5F8FC':'#FFFFFF';
 });
 s.freezePanes.freezeRows(8);s.freezePanes.freezeColumns(2);
 return {s,end,last};
}
function editable(s,range,values){s.getRange(range).format.fill=color.input;if(values)s.getRange(range).dataValidation={rule:{type:'list',values}};}
function status(s,range){for(const [text,fill,ink] of [['不符','#FDE8E7','#9E302C'],['未执行','#FFF3D9','#805C12'],['待','#FFF3D9','#805C12'],['通过','#E9F3EC','#245B36']])s.getRange(range).conditionalFormats.add('containsText',{text,format:{fill,font:{color:ink}}});}
const task=init('本周任务','SN318 本周 UI 与交互审查','W2：2026-10-12—10-16｜取证：2026-10-13｜本地通用模板 + 最新飞书资料',
 ['源序号','原表行','业务区域','工作包','原始来源','原优先级','W2阶段','本周工作','前置门槛','关联用例','业务执行边界','负责人','任务状态'],
 d.scope.map(s=>[+s.seq,s.row,s.level2,s.feature,s.source,s.priority,s.w2,s.action,s.gate,s.case_ids,s.execution,'','待安排']),
 [65,65,155,295,150,78,78,225,220,190,235,100,110]);
task.s.getRange('A4').values=[['UI/开项']];task.s.getRange('B4').formulas=[[`=COUNTIF(G9:G${task.end},"UI/开")`]];
task.s.getRange('C4').values=[['需求阶段项']];task.s.getRange('D4').formulas=[[`=COUNTIF(G9:G${task.end},"需")`]];
task.s.getRange('E4').values=[['业务用例']];task.s.getRange('F4').formulas=[['=COUNTA(业务UI用例!A9:A84)']];
task.s.getRange('G4').values=[['待安排修改']];task.s.getRange('H4').formulas=[['=COUNTIF(修改与待决!L9:L21,"待安排")']];
task.s.getRange('A5').values=[['38项中26项源标PRD，12项为原型条件项；其余24项仅梳理需求。通用模板不含业务页属于环境边界。']];task.s.getRange('A5:M5').format.wrapText=false;
task.s.getRange('A6').values=[['建议：10/13确认基线与模板差异；10/14完成优先修改/规范裁决；10/15接入业务页复测；10/16汇总。负责人及承诺时间待团队安排。']];task.s.getRange('A6:M6').format.wrapText=false;
editable(task.s,`L9:L${task.end}`);editable(task.s,`M9:M${task.end}`,['待安排','进行中','待确认','待复测','已完成']);
const temp=init('模板检查','通用模板检查与实际结果','对象：http://127.0.0.1:5173｜截图编号与 evidence 文件夹对应｜原始观察保留，复测填写右侧',
 ['检查ID','检查项','操作步骤','规范或建议期望','本次状态','实际观察','证据编号/文件','判定依据','修改ID','复测负责人','复测结果'],
 d.templates.map(t=>[t.id,t.title,t.steps,t.expected,t.status,t.actual,t.evidence,t.basis,t.issue,'','未复测']),
 [78,190,285,330,115,360,230,210,85,100,110],
 ['14项本地通过、3项明确规范差异；2项仅错误页展示通过。其他分别为建议、条件项、样例/静态风险及未执行。','按钮/金额等Mock交互结果只证明前端可观察行为，不能作为业务规则、真实接口或权限验收。']);
status(temp.s,`E9:E${temp.end}`);editable(temp.s,`J9:J${temp.end}`);editable(temp.s,`K9:K${temp.end}`,['未复测','通过','不通过','受阻','不适用']);
const biz=init('业务UI用例','本周业务 UI 与交互用例','38个UI/开工作包，每项2个具体场景；通用模板只作参照，本业务用例均未执行',
 ['用例ID','源序号/行','业务区域','源优先级','场景','类型','前置条件','操作步骤','可观察预期','准入状态','依据','负责人','执行结果'],
 d.business.map(t=>[t.id,`${t.seq} / ${t.row}`,t.module,t.priority,t.title,t.kind,t.precondition,t.steps,t.expected,t.status,t.basis,'','未执行']),
 [105,90,145,80,220,110,290,365,420,125,240,100,110],
 ['边界值：L=PRD批准的字段长度；B=文件大小上限；K=文件数上限；N=每页条数。未规定时先确认，不自行定义业务规则。','仅检查布局、状态、提示与恢复；算法/价格计算/引用判定/版本生成/数据落库/真实鉴权交由既有功能测试。']);
status(biz.s,`J9:J${biz.end}`);editable(biz.s,`L9:L${biz.end}`);editable(biz.s,`M9:M${biz.end}`,['未执行','通过','不通过','受阻','不适用']);
const issue=init('修改与待决','修改清单与规范待决事项','建议优先级只用于本轮分派；原始Review优先级保留在Review来源。13项并非13个已证实缺陷。',
 ['事项ID','建议优先级','判定类型','问题/待决事项','证据与实际表现','修改或裁决要求','承接角色','依据','定位','关联用例','复测判据','处理状态','负责人','复测结果'],
 d.issues.map(i=>[i.id,i.priority,i.type,i.title,i.actual+'\n证据：'+i.evidence,i.action,i.role,i.basis,i.location,i.cases,i.retest,i.status,'',i.result]),
 [80,90,145,245,355,405,135,240,280,180,365,115,100,110],
 ['优先处理P1交互可用性与规范依赖；P2视觉差异统一修正后回归。建议/条件项先确认口径，不能当作规范已批准。']);
editable(issue.s,`L9:L${issue.end}`,['待安排','待确认','进行中','待复测','已完成','本期不做']);editable(issue.s,`M9:M${issue.end}`);editable(issue.s,`N9:N${issue.end}`,['未复测','通过','不通过','受阻','不适用']);
const norms=init('规范检查','通用规范检查基线','通用设计规范V1.2：revision 5256｜24张内嵌表已读取；本页列出与本次工作直接相关的16组标准',
 ['章节','维度','基线值或规则','关联检查/用例','修改ID'],d.norm_rules,[145,205,655,310,90],
 ['明确标准优先；Review待确认项、规范冲突和个人可用性建议均独立标注。','规范入口：'+d.sources.norm]);
const raw=init('Review来源','UI Review 原始记录与来源','读取日期2026-10-13；按稳定record_id追踪。颜色为框架复用分类，确认状态是设计状态，不是实现/验收状态。',
 ['引用ID','record_id','页面/模块','原始优先级','原始确认状态','框架适配判断','当前原型问题','Review建议','后续处理建议','处理角色'],
 d.reviews.map(r=>[r.id,r.record_id,(r['页面/模块']||[]).join('/'),(r['优先级']||[]).join('/'),(r['确认状态']||[]).join('/')||'未填',(r['框架适配判断']||[]).join('/'),r['当前原型问题']||'',r['Review 建议']||'',(r['后续处理建议']||'').replace(/<at[^>]*>(.*?)<\/at>/g,'$1'),(r['当前处理角色']||[]).join('/')]),
 [80,180,140,85,115,180,370,600,320,130],
 ['排期rev988：'+d.sources.schedule,'Review rev680（24条含1空白占位）：'+d.sources.review,'关联聊天：探索 pcs-front 前端界面；基线66a11b60，本地既有适配未提交；本次未修改源码或写回飞书。']);
for(const s of [task.s,temp.s,biz.s,issue.s]){s.getRange('A7').values=[['浅黄色为后续人工填写/更新区；表头带筛选，横向滚动时前两列保留。']];s.getRange('A7:N7').format.wrapText=false;s.getRange('A7').format.font={color:color.muted,size:10};}
wb.recalculate();
const checks={summary:(await wb.inspect({kind:'table',range:'本周任务!A4:H4',include:'values,formulas',tableMaxRows:2,tableMaxCols:8,maxChars:2400})).ndjson,
 errors:(await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:2000})).ndjson};
await fs.writeFile(path.join(W,'workbook-checks.json'),JSON.stringify(checks,null,2));
const views=[['本周任务','A1:H12'],['模板检查','A8:F12'],['业务UI用例','E8:K11'],['修改与待决','A8:F12'],['规范检查','A1:E12'],['Review来源','A8:H11']];
for(let n=0;n<views.length;n++){const [sheetName,range]=views[n];const blob=await wb.render({sheetName,range,scale:1.3,format:'png'});await fs.writeFile(path.join(W,`preview-${n+1}.png`),new Uint8Array(await blob.arrayBuffer()));}
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(path.join(O,'SN318_W2_UI与交互用例及修改清单.xlsx'));
console.log(JSON.stringify({output:path.join(O,'SN318_W2_UI与交互用例及修改清单.xlsx'),checks,views:views.length}));
