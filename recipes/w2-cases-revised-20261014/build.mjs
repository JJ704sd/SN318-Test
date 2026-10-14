import fs from 'node:fs/promises';
import {FileBlob, SpreadsheetFile, Workbook} from '@oai/artifact-tool';
const work='./recipes/w2-cases-revised-20261014';
const p=JSON.parse(await fs.readFile(work+'/plan.json','utf8'));
const mode=process.argv[2]||'author';
if(mode==='help'){
  const w=Workbook.create();w.worksheets.add('Help');
  console.log(w.help('range.hyperlink',{include:'index,examples,notes',maxChars:2500}).ndjson);
  process.exit(0);
}
if(mode==='preview'){
  const w=await SpreadsheetFile.importXlsx(await FileBlob.load(p.source));
  const b=await w.render({sheetName:'业务UI与交互用例',range:'N98:O99',scale:1,format:'png'});
  await fs.writeFile(work+'/source-preview.png',new Uint8Array(await b.arrayBuffer()));
  console.log((await w.inspect({kind:'sheet',include:'id,name',maxChars:900})).ndjson);
  process.exit(0);
}
if(mode==='final-preview'||mode==='overview-check'){
  const w=await SpreadsheetFile.importXlsx(await FileBlob.load(p.destination));
  for(const [name,sheet,range] of [['overview','当前用例与补测','A2:E14'],['current-cases','当前用例与补测','A16:H21'],['human-inputs','当前用例与补测','J16:N21'],['steps','当前用例与补测','D165:H169'],['step-precondition','当前用例与补测',p.precondition_preview],['issues','整改跟进','A10:I13'],['issue-inputs','整改跟进','M10:S13']]){
    if(mode==='overview-check'&&name!=='overview')continue;
    const b=await w.render({sheetName:sheet,range,scale:1,format:'png'});
    await fs.writeFile(work+'/'+name+'.png',new Uint8Array(await b.arrayBuffer()));
  }
  console.log((await w.inspect({kind:'table',range:"'当前用例与补测'!A5:D9",include:'values,formulas',tableMaxRows:5,tableMaxCols:4,maxChars:2200})).ndjson);
  process.exit(0);
}

const wb=Workbook.create();
const casesSheet=wb.worksheets.add('当前用例与补测');
const issueSheet=wb.worksheets.add('整改跟进');
const col=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const cnum=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
for(const [name, d] of Object.entries(p.book)){
  const sh=wb.worksheets.add(name);
  const end=d.dimension.split(':').pop(), match=end.match(/([A-Z]+)(\d+)/);
  const rows=Number(match[2]), cols=cnum(match[1]);
  const matrix=Array.from({length:rows},()=>Array(cols).fill(''));
  const formula=[];
  for(const [address,v] of Object.entries(d.cells)){
    const m=address.match(/([A-Z]+)(\d+)/);
    if(typeof v==='string'&&v.startsWith('='))formula.push([address,v]);
    else matrix[Number(m[2])-1][cnum(m[1])-1]=v;
  }
  sh.getRange('A1:'+end).values=matrix;
  for(const [address,v] of formula)sh.getRange(address).formulas=[[v]];
}

function style(sh,end,widths,title){
  sh.showGridLines=false;
  sh.tabColor='#1F4E78';
  const r=sh.getRange('A1:'+end);
  r.format.font={name:'Arial',size:10,color:'#243247'};
  r.format.wrapText=true;r.format.verticalAlignment='top';
  for(const [column,width]of Object.entries(widths))sh.getRange(column+':'+column).format.columnWidth=width;
  sh.getRange('A2').values=[[title]];sh.getRange('A2').format.font={name:'Arial',size:14,bold:true,color:'#1F4E78'};
  sh.getRange('A2').format.wrapText=false;
  sh.getRange('A2:'+col(Object.keys(widths).length)+'2').format.rowHeight=27;
}
function header(sh,range){const r=sh.getRange(range);r.format.fill='#1F4E78';r.format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};r.format.horizontalAlignment='center';r.format.verticalAlignment='center';r.format.rowHeight=32;}
function input(sh,range,date=false){const r=sh.getRange(range);r.format.fill='#FFF2CC';r.format.font.color='#1F4E78';if(date)r.setNumberFormat('yyyy-mm-dd hh:mm');}
function status(sh,range){const r=sh.getRange(range);r.dataValidation={rule:{type:'list',values:['通过','不通过','受阻','未执行','不适用']}};for(const [s,fill,color]of [['通过','#E2F0D9','#375623'],['不通过','#FCE4D6','#9C0006'],['受阻','#FFF2CC','#7F6000'],['未执行','#E7E6E6','#595959']])r.conditionalFormats.add('cellIs',{operator:'equal',formula:'"'+s+'"',format:{fill,font:{color}}});}
function fitRows(sh,start,rows,widths){
 for(let i=0;i<rows.length;i++){
  const lines=Math.max(...rows[i].map((v,j)=>String(v??'').split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil([...line].reduce((n,c)=>n+(c.charCodeAt(0)>127?2:1),0)/(widths[j]*0.91))),0)));
  sh.getRange('A'+(start+i)+':'+col(rows[i].length)+(start+i)).format.rowHeight=Math.max(36,Math.min(409,lines*13+13));
 }
}
const nativeLinks=[];
function hyperlink(sh,address,target,label){sh.getRange(address).values=[[label]];sh.getRange(address).format.font.color='#0563C1';nativeLinks.push({sheet:sh===casesSheet?'当前用例与补测':'整改跟进',address,target,label});}

style(casesSheet,'P'+(165+p.steps.length),{A:26,B:17,C:32,D:30,E:33,F:36,G:35,H:28,I:19,J:23,K:23,L:24,M:24,N:26,O:24,P:23},'SN318 W2 当前用例与补测');
casesSheet.getRange('A3:D3').values=[['整理日期','2026-10-14','工作周期','W2 10/12–10/16']];
casesSheet.getRange('A3:D3').format.rowHeight=30;
casesSheet.getRange('A5:D5').values=[['记录总数','主数据复核数','通过','不通过']];header(casesSheet,'A5:D5');
casesSheet.getRange('A8:D8').values=[['受阻','其他业务未复核','模板未重跑','主数据确认问题数']];header(casesSheet,'A8:D8');
const sumFormulas=["=COUNTA(A17:A157)","=COUNTIFS(E17:E157,\"本轮已复核\")","=COUNTIFS(E17:E157,\"本轮已复核\",D17:D157,\"通过\")","=COUNTIFS(E17:E157,\"本轮已复核\",D17:D157,\"不通过\")","=COUNTIFS(E17:E157,\"本轮已复核\",D17:D157,\"受阻\")","=COUNTIFS(E17:E157,\"本轮未复核\")","=COUNTIFS(E17:E157,\"本轮未重跑\")","=SUM(COUNTIFS('整改跟进'!B11:B29,\"已证实规范差异\",'整改跟进'!F11:F29,\"主数据轮次已核对\"),COUNTIFS('整改跟进'!B11:B29,\"已证实交互差异\",'整改跟进'!F11:F29,\"主数据轮次已核对\"))"];
casesSheet.getRange('A6:D6').formulas=[sumFormulas.slice(0,4)];casesSheet.getRange('A9:D9').formulas=[sumFormulas.slice(4)];
for(const rg of ['A6:D6','A9:D9']){casesSheet.getRange(rg).setNumberFormat('0');casesSheet.getRange(rg).format.font.bold=true;casesSheet.getRange(rg).format.rowHeight=30;}
casesSheet.getRange('E5').values=[['计数说明']];casesSheet.getRange('E5').format.font.bold=true;casesSheet.getRange('E6').values=[['23条失败中20条关联R09，失败用例与独立问题分别统计。']];casesSheet.getRange('A6:E6').format.rowHeight=54;
casesSheet.getRange('E8').values=[['历史保留']];casesSheet.getRange('E8').format.font.bold=true;casesSheet.getRange('E9').values=[['后四表原样保留；模板结果属于旧版本。']];casesSheet.getRange('A9:E9').format.rowHeight=42;
casesSheet.getRange('A11:D11').values=[['主数据执行基线','fd786de / dirty-8cdf1453','模板历史基线','b2efcdb / dirty-5c6bc530']];casesSheet.getRange('A11:D11').format.rowHeight=42;
casesSheet.getRange('A12:D12').values=[['本版未新增页面执行','黄色栏由人工填写','证据入口','打开证据索引']];casesSheet.getRange('A12:D12').format.rowHeight=34;
hyperlink(casesSheet,'D12','证据索引.html','打开证据索引');
casesSheet.getRange('A13:D13').values=[['执行环境','本地Mock / demo','规范来源','沿用10/14快照，本次未刷新']];casesSheet.getRange('A13:D13').format.rowHeight=35;
casesSheet.getRange('A14:D14').values=[['本周建议','10/15补齐判据/样例','10/16建议','汇总整改及剩余缺口；日期待确认']];casesSheet.getRange('A14:D14').format.rowHeight=42;
const caseHeaders=['用例ID','W2工作包','用例名称','最近执行结果','主数据轮次覆盖','最近执行基线','变化或判定摘要','关联问题ID','步骤与补测入口','原人工复核','本轮人工复核','复核人','复核时间','下一步'];
const caseValues=p.cases.map(c=>[c.id,c.package,c.name,c.result,c.coverage,c.baseline,c.brief,c.issue_ids.join('\n'),'查看步骤',c.manual,'','','',c.next]);
casesSheet.getRange('A16:N16').values=[caseHeaders];header(casesSheet,'A16:N16');casesSheet.getRange('A17:N157').values=caseValues;
fitRows(casesSheet,17,caseValues,[26,17,32,30,33,36,35,28,19,23,23,24,24,26]);
status(casesSheet,'D17:D157');casesSheet.getRange('E17:E157').dataValidation={rule:{type:'list',values:['本轮已复核','本轮未复核','本轮未重跑']}};
input(casesSheet,'K17:M157');casesSheet.getRange('K17:K157').dataValidation={rule:{type:'list',values:['通过','不通过','受阻','未执行','不适用']}};casesSheet.getRange('M17:M157').setNumberFormat('yyyy-mm-dd hh:mm');
for(const c of p.cases){
  hyperlink(casesSheet,'I'+c.row,"#'当前用例与补测'!A"+c.first_step_row,'查看步骤/补测');
  // Original human decisions are an immutable snapshot, separate from new input.
  casesSheet.getRange('J'+c.row).values=[[c.manual]];
}
casesSheet.tables.add('A16:N157',true,'CurrentCases');
casesSheet.freezePanes.freezeRows(16);casesSheet.freezePanes.freezeColumns(3);
casesSheet.getRange('A162').values=[['步骤明细与补测准备']];casesSheet.getRange('A162').format.font={name:'Arial',size:14,bold:true,color:'#1F4E78'};casesSheet.getRange('A162:P162').format.rowHeight=28;
casesSheet.getRange('A163:D163').values=[['前置条件','原用例前置保留在历史用例表','范围处理','字典取消交互与范围前置分开记录；整条仍受阻']];casesSheet.getRange('A163:P163').format.rowHeight=43;
const stepHeaders=['步骤ID','用例ID','执行层次','具体操作','预期结果','已有实际表现','步骤结果','缺判据或样例','规范定位','证据链接','建议补齐角色','补测数据要求','下一步','准备责任人','计划复测日','人工步骤意见'];
const stepValues=p.steps.map(s=>[s.id,s.case_id,s.layer,s.action,s.expected,s.actual,s.result,s.needed,s.norm,s.evidence_ids.join('\n'),s.role,s.data,s.next,'','','']);
casesSheet.getRange('A165:P165').values=[stepHeaders];header(casesSheet,'A165:P165');casesSheet.getRange('A166:P'+(165+p.steps.length)).values=stepValues;
fitRows(casesSheet,166,stepValues,[26,17,32,30,33,36,35,28,19,23,23,24,24,26,24,23]);
status(casesSheet,'G166:G'+(165+p.steps.length));input(casesSheet,'N166:P'+(165+p.steps.length));casesSheet.getRange('O166:O'+(165+p.steps.length)).setNumberFormat('yyyy-mm-dd');
for(const s of p.steps){
  if(s.evidence_ids.length){const run=s.layer==='主数据既有执行'?'master':'prior';hyperlink(casesSheet,'J'+s.row,'证据索引.html#'+run+'-'+s.evidence_ids[0],'查看 '+s.evidence_ids.join('、'));}
}
casesSheet.tables.add('A165:P'+(165+p.steps.length),true,'CaseSteps');

style(issueSheet,'T29',{A:17,B:23,C:9,D:25,E:17,F:24,G:48,H:46,I:48,J:28,K:25,L:42,M:32,N:20,O:20,P:26,Q:20,R:20,S:30,T:25},'SN318 W2 整改跟进');
issueSheet.getRange('A4:I4').values=[['清单范围','规范差异、待裁决、样例缺口','新增登记','G03/G04拆分旧受阻条件','历史保留','原修改清单不覆盖','填报说明','黄色栏由责任方填写','未分派人员与日期不虚填']];issueSheet.getRange('A4:I4').format.rowHeight=52;
issueSheet.getRange('A6:I6').values=[['关闭条件','修改完成且复测通过','仍有条件未齐','继续显示待补齐','记录分工','模型结果与人工复核分栏','版本限制','未重跑的条目保留旧基线','主数据通过不替代产品裁决']];issueSheet.getRange('A6:I6').format.rowHeight=45;
issueSheet.getRange('A8:I8').values=[['建议推进','P1差异优先整改','判据确认','产品/设计确认冲突与范围','样例补齐','开发提供测试条件','复测安排','条件齐备后测试介入','具体人员、日期待填写']];issueSheet.getRange('A8:I8').format.rowHeight=40;
const ih=['问题ID','类型','等级','页面或对象','跟进状态','本轮复核覆盖','实际差异或复核表现','修改或补齐建议','验收标准','关联用例ID','证据链接','缺条件','建议责任角色','责任人','计划完成日期','采用或修复版本','复测日期','复测结果','复测证据','关闭核对'];
const iv=p.issues.map(i=>[i.id,i.type,i.level,i.page,i.state,i.coverage,i.actual,i.recommendation,i.acceptance,i.case_ids.join('\n'),i.evidence_ids.join('\n'),i.needed,i.role,'','','','','','']);
issueSheet.getRange('A10:T10').values=[ih];header(issueSheet,'A10:T10');issueSheet.getRange('A11:S29').values=iv;
fitRows(issueSheet,11,iv,[17,23,9,25,17,24,48,46,48,28,25,42,32,20,20,26,20,20,30]);
issueSheet.getRange('E11:E29').dataValidation={rule:{type:'list',values:['待整改复测','待确认','待补齐','整改中','待复测','复测不通过','已关闭']}};
issueSheet.getRange('E11:E29').conditionalFormats.add('cellIs',{operator:'equal',formula:'"已关闭"',format:{fill:'#E2F0D9',font:{color:'#375623'}}});
input(issueSheet,'N11:S29');issueSheet.getRange('O11:O29').setNumberFormat('yyyy-mm-dd');issueSheet.getRange('Q11:Q29').setNumberFormat('yyyy-mm-dd');issueSheet.getRange('R11:R29').dataValidation={rule:{type:'list',values:['通过','不通过','受阻','未执行','不适用']}};
input(issueSheet,'L11:L29');
for(let r=11;r<=29;r++)issueSheet.getRange('T'+r).formulas=[['=IF(E'+r+'<>"已关闭","未关闭",IF(L'+r+'<>"","仍有缺条件",IF(R'+r+'<>"通过","缺通过复测",IF(OR(P'+r+'="",Q'+r+'="",S'+r+'=""),"缺版本/日期/证据","关闭资料齐备"))))']];
issueSheet.getRange('T11:T29').conditionalFormats.add('beginsWith',{text:'缺',format:{fill:'#FCE4D6',font:{color:'#9C0006'}}});
issueSheet.getRange('T11:T29').conditionalFormats.add('cellIs',{operator:'equal',formula:'"仍有缺条件"',format:{fill:'#FFF2CC',font:{color:'#7F6000'}}});
for(let n=0;n<p.issues.length;n++){const i=p.issues[n];if(i.evidence_ids.length){const run=i.coverage==='主数据轮次已核对'?'master':'prior';hyperlink(issueSheet,'K'+(n+11),'证据索引.html#'+run+'-'+i.evidence_ids[0],'查看 '+i.evidence_ids.join('、'));}}
issueSheet.tables.add('A10:T29',true,'IssueFollowup');issueSheet.freezePanes.freezeRows(10);issueSheet.freezePanes.freezeColumns(4);

wb.recalculate();
const checks=await wb.inspect({kind:'table',range:"'当前用例与补测'!A5:D9",include:'values,formulas',tableMaxRows:5,tableMaxCols:4,maxChars:3500});
await fs.writeFile(work+'/summary-check.ndjson',checks.ndjson);
console.log(checks.ndjson);
const readSummary=()=>[...casesSheet.getRange('A6:D6').values[0],...casesSheet.getRange('A9:D9').values[0]];
const summary=readSummary();
if(JSON.stringify(summary)!==JSON.stringify([141,31,4,23,4,70,40,6]))throw new Error('Summary mismatch '+JSON.stringify(summary));
// Exercise one status input and restore it before delivery.
const saved=casesSheet.getRange('D17').values[0][0];
casesSheet.getRange('D17').values=[['通过']];wb.recalculate();
const changed=readSummary();
if(changed[2]!==5||changed[4]!==3)throw new Error('Status recalculation did not update summary');
casesSheet.getRange('D17').values=[[saved]];wb.recalculate();
if(JSON.stringify(readSummary())!==JSON.stringify(summary))throw new Error('Status input restoration failed');
const savedIssue=issueSheet.getRange('E11').values[0][0];
issueSheet.getRange('E11').values=[['已关闭']];issueSheet.getRange('R11').values=[['通过']];wb.recalculate();
const openPrerequisite=issueSheet.getRange('T11').values[0][0];
if(openPrerequisite!=='缺版本/日期/证据')throw new Error('Missing closure prerequisite hidden');
issueSheet.getRange('P11').values=[['fixture-test-only']];issueSheet.getRange('Q11').values=[[46200]];issueSheet.getRange('S11').values=[['fixture-evidence-only']];wb.recalculate();
const completedPrerequisite=issueSheet.getRange('T11').values[0][0];
if(completedPrerequisite!=='关闭资料齐备')throw new Error('Closure prerequisite check failed');
issueSheet.getRange('E11').values=[[savedIssue]];for(const a of ['P11','Q11','R11','S11'])issueSheet.getRange(a).values=[['']];wb.recalculate();
await fs.writeFile(work+'/input-recalculation.json',JSON.stringify({engine:'Artifact Tool',original:summary,temporary:changed,restored:readSummary(),closure_missing:openPrerequisite,closure_completed:completedPrerequisite,closure_restored:issueSheet.getRange('T11').values[0][0],nativeExcel:false}));
const err=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:12},maxChars:1800});
await fs.writeFile(work+'/formula-errors.ndjson',err.ndjson);
await(await SpreadsheetFile.exportXlsx(wb)).save(work+'/artifact-export.xlsx');
await fs.writeFile(work+'/native-links.json',JSON.stringify(nativeLinks));
await fs.writeFile(work+'/new-sheet-names.json',JSON.stringify(['当前用例与补测','整改跟进']));
process.exit(0);
