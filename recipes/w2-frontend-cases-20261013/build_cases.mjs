import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const dir='./recipes/w2-frontend-cases-20261013';
const d=JSON.parse(await fs.readFile(dir+'/cases-data.json','utf8'));
const wb=Workbook.create();for(const n of ['本周执行','前端用例','工作包对应'])wb.worksheets.add(n);
const color={header:'#244D79',ink:'#243247',input:'#FFF3D6'};
const letter=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
function table(sheetName,start,headers,rows,widths,name){
 const s=wb.worksheets.getItem(sheetName);s.showGridLines=false;
 const end=start+rows.length,last=letter(headers.length);
 s.getRange(`A${start}:${last}${end}`).format={font:{name:'Microsoft YaHei',size:10,color:color.ink},verticalAlignment:'top',wrapText:true};
 s.getRange(`A${start}:${last}${start}`).values=[headers];
 s.getRange(`A${start+1}:${last}${end}`).values=rows;
 const t=s.tables.add(`A${start}:${last}${end}`,true,name);t.style='TableStyleMedium2';
 s.getRange(`A${start}:${last}${start}`).format={fill:color.header,font:{name:'Microsoft YaHei',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:36,borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};
 for(let c=0;c<headers.length;c++)s.getRange(`${letter(c+1)}1:${letter(c+1)}${end}`).format.columnWidth=widths[c];
 for(let r=0;r<rows.length;r++){
  const n=Math.max(...rows[r].map((v,c)=>String(v??'').split('\n').reduce((sum,x)=>sum+Math.max(1,Math.ceil([...x].reduce((a,z)=>a+(z.charCodeAt(0)>255?1.85:1),0)/Math.max(widths[c]-2,8))),0)));
  s.getRange(`A${start+r+1}:${last}${start+r+1}`).format.rowHeight=Math.max(46,n*14+12);
 }
 return s;
}
function title(name,text){const s=wb.worksheets.getItem(name);s.getRange('A2').values=[[text]];s.getRange('A2').format.font={name:'Microsoft YaHei',size:15,bold:true,color:color.ink};s.getRange('A2:H2').format.rowHeight=29;}
title('本周执行','PCS W2 前端用例与执行安排');
title('前端用例','PCS 前端用例：评审、自测与提测复核分别记录');
title('工作包对应','W2 38个工作包的前端用例索引');

const allScope=d.packages.map(r=>String(r[0])).join('、');
const rows=d.cases.map(r=>{
 const rr=r.slice();if(rr[3]===allScope)rr[3]='全部W2';
 else if(rr[3].split('、').length>12)rr[3]=rr[2]==='表单'||rr[2]==='提交'?'表单类（见索引）':'列表类（见索引）';
 return [...rr.slice(0,13),'','',rr[14],null];
});
const headers=['编号','建议安排','模块/组件','工作包范围','具体场景','建议顺序','前置与测试数据','入口与操作步骤','预期可观察结果','依据与适用边界','评审结论','开发自测','提测复核','开发角色/Build/证据','复核角色/Build/证据','关联旧用例','当前记录提示'];
const cases=table('前端用例',5,headers,rows,[12,27,23,21,36,13,59,68,74,70,16,16,16,43,43,42,26],'FrontendCases');
cases.freezePanes.freezeRows(5);cases.freezePanes.freezeColumns(2);
cases.getRange('A3').values=[['仅对实际支持的页面能力执行；同组件不同页面分别留证，模板结果不代替业务通过。']];cases.getRange('A3').format.font={name:'Microsoft YaHei',size:10,color:'#53687D'};
const end=rows.length+5;
cases.getRange(`K6:O${end}`).format.fill=color.input;
cases.getRange(`K6:K${end}`).dataValidation={rule:{type:'list',values:['待评审','待依据','可执行','不纳入']}};
cases.getRange(`L6:M${end}`).dataValidation={rule:{type:'list',values:['未执行','通过','失败','受阻','不适用']}};
for(let i=0;i<rows.length;i++){
 const r=i+6;
 const f=i<12
  ?`=IF(K${r}="不纳入","不纳入",IF(K${r}="可执行","评审闭环","待评审/依据"))`
  :`=IF(K${r}="不纳入","不纳入",IF(L${r}="失败",IF(LEN(TRIM(N${r}))=0,"开发失败缺证据","开发自测失败"),IF(M${r}="失败",IF(LEN(TRIM(O${r}))=0,"复核失败缺证据","提测复核失败"),IF(K${r}<>"可执行","待评审/依据",IF(L${r}="受阻","开发自测受阻",IF(L${r}<>"通过","待开发自测",IF(LEN(TRIM(N${r}))=0,"缺开发Build/证据",IF(M${r}="受阻","提测复核受阻",IF(M${r}<>"通过","待提测复核",IF(LEN(TRIM(O${r}))=0,"缺复核Build/证据","本轮复核通过"))))))))))`;
 cases.getRange('Q'+r).formulas=[[f]];
}
cases.getRange(`Q6:Q${end}`).conditionalFormats.addCustom('Q6="本轮复核通过"',{fill:'#E5F4ED',font:{color:'#285846'}});
cases.getRange(`Q6:Q${end}`).conditionalFormats.addCustom('OR(Q6="开发自测失败",Q6="提测复核失败",Q6="开发失败缺证据",Q6="复核失败缺证据")',{fill:'#FBE5E2',font:{color:'#9A382E'}});

const packs=table('工作包对应',5,['排期序号','源表行号','二级目录','工作包','本周节奏','原来源','产品','开发','测试','设计准出用例','适用组件用例','本包专项','上一版周用例','未补齐条件/原备注'],d.packages,[12,12,27,42,35,23,18,18,18,62,91,17,34,64],'PackageMapping');
packs.freezePanes.freezeRows(5);packs.freezePanes.freezeColumns(2);packs.getRange('A6:B43').format.horizontalAlignment='right';
packs.getRange('A3').values=[['组件用例按真实能力裁剪；每包BP专项单独执行。来源标原型的仍须核定封板范围。']];packs.getRange('A3').format.font={name:'Microsoft YaHei',size:10,color:'#53687D'};

const summary=wb.worksheets.getItem('本周执行');summary.showGridLines=false;summary.tabColor=color.header;
summary.getRange('A4:H4').values=[['前端用例',null,'W2工作包',null,'待评审/依据',null,'有效复核通过',null]];
summary.getRange('B4').formulas=[[`=COUNTA('前端用例'!A6:A${end})`]];
summary.getRange('D4').formulas=[['=COUNTA(\'工作包对应\'!A6:A43)']];
summary.getRange('F4').formulas=[[`=COUNTIFS('前端用例'!Q6:Q${end},"待评审/依据")`]];
summary.getRange('H4').formulas=[[`=COUNTIFS('前端用例'!Q6:Q${end},"本轮复核通过")`]];
summary.getRange('A4:H4').format={font:{name:'Microsoft YaHei',size:10,color:color.ink},verticalAlignment:'center',rowHeight:27};
summary.getRange('A6').values=[['12条设计准出＋47条组件交互＋38条业务页面专项；业务类目前均未执行。']];
summary.getRange('A6').format.font={name:'Microsoft YaHei',size:10,color:'#53687D'};
table('本周执行',8,['时间/任务','本周要做的事'],d.plan,[34,114],'WeekCadence');
summary.getRange('A15').values=[['PCS前端特点与测试重点']];summary.getRange('A15').format.font.bold=true;
table('本周执行',16,['特点','当前证据/边界','用例重点'],d.facts,[34,114,85],'FrontendFacts');
summary.getRange('A25').values=[['执行数据与留证']];summary.getRange('A25').format.font.bold=true;
table('本周执行',26,['样本','类型','准备内容'],d.fixtures,[34,114,85],'FixtureGuide');
summary.getRange('A33').values=[['资料来源与版本']];summary.getRange('A33').format.font.bold=true;
table('本周执行',34,['编号','来源','版本/读取边界','链接或定位'],d.sources,[34,114,85,94],'CaseSources');
// 同一主视图的列宽统一，避免下方资料表反过来压缩上方节奏文本。
summary.getRange('A1:A39').format.columnWidth=34;
summary.getRange('B1:B39').format.columnWidth=114;
summary.getRange('C1:C39').format.columnWidth=85;
summary.getRange('D1:D39').format.columnWidth=94;
summary.getRange('E1:H4').format.columnWidth=22;
summary.getUsedRange().format.font.name='Microsoft YaHei';

wb.recalculate();
assert.deepEqual(['B4','D4','F4','H4'].map(a=>summary.getRange(a).values[0][0]),[97,38,97,0]);
// 一条组件用例模拟两个阶段，证据缺任一份都不能计为复核通过。
cases.getRange('K18:M18').values=[['可执行','通过','通过']];wb.recalculate();assert.equal(cases.getRange('Q18').values[0][0],'缺开发Build/证据');
cases.getRange('N18').values=[['合成验证：开发Build/角色/证据']];wb.recalculate();assert.equal(cases.getRange('Q18').values[0][0],'缺复核Build/证据');
cases.getRange('O18').values=[['合成验证：复核Build/角色/证据']];wb.recalculate();assert.equal(summary.getRange('H4').values[0][0],1);
cases.getRange('K18:O18').values=[['待评审','未执行','未执行','','']];wb.recalculate();assert.equal(summary.getRange('H4').values[0][0],0);
await fs.writeFile(dir+'/gate-verification.json',JSON.stringify({missingDevEvidenceBlocked:true,missingReviewEvidenceBlocked:true,bothStagesUpdateSummary:true,temporaryInputsRestored:true}));
await fs.writeFile(dir+'/inspection.ndjson',(await wb.inspect({kind:'table',range:'本周执行!A4:H4',include:'values,formulas',tableMaxRows:1,tableMaxCols:8,maxChars:2000})).ndjson);
await fs.writeFile(dir+'/formula-scan.ndjson',(await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:2500})).ndjson);
await fs.mkdir(d.out,{recursive:true});
const path=d.out+'/PCS_W2前端测试用例_按任务节奏细化.xlsx';
await (await SpreadsheetFile.exportXlsx(wb)).save(path);console.log(JSON.stringify({path,cases:97,packages:38}));
for(const [sheetName,range,name] of [['本周执行','A8:B13','cadence'],['本周执行','A16:C23','facts'],['前端用例','A18:F22','case-index'],['前端用例','G18:J20','case-steps'],['前端用例','K18:Q22','case-results'],['前端用例','G59:J61','import'],['工作包对应','A5:I10','mapping'],['本周执行','A34:D39','sources']]){
 const b=await wb.render({sheetName,range,scale:1.3,format:'png'});await fs.writeFile(dir+'/preview-'+name+'.png',new Uint8Array(await b.arrayBuffer()));
}
console.log('export and previews complete');
process.exit(0);
