import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const dir='./recipes/w2-case-reaudit-20261013';
const d=JSON.parse(await fs.readFile(dir+'/revision-data.json','utf8'));
const ev=JSON.parse(await fs.readFile(dir+'/page-evidence.json','utf8'));
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(d.input));
await fs.writeFile(dir+'/import-summary.ndjson',(await wb.inspect({kind:'workbook,sheet,table',maxChars:7000,tableMaxRows:1,tableMaxCols:4})).ndjson);
const s=wb.worksheets.getItem('前端用例'),p=wb.worksheets.getItem('工作包对应'),m=wb.worksheets.getItem('本周执行');
const end=d.cases.length+5;
const ink='#243247',blue='#244D79',input='#FFF3D6';
const letter=n=>{let x='';while(n){n--;x=String.fromCharCode(65+n%26)+x;n=Math.floor(n/26);}return x;};
function formatHeader(sh,range){sh.getRange(range).format={fill:blue,font:{name:'Microsoft YaHei',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:36};}
function replaceTable(sh,name,range){const t=sh.tables.items.find(x=>x.name===name);assert.ok(t,name);t.delete();const nt=sh.tables.add(range,true,name);nt.style='TableStyleMedium2';}
function rowHeights(sh,start,rows,widths,last){
 rows.forEach((row,i)=>{const lines=Math.max(...row.map((v,c)=>String(v??'').split('\n').reduce((a,line)=>a+Math.max(1,Math.ceil([...line].reduce((n,z)=>n+(z.charCodeAt(0)>255?1.85:1),0)/Math.max(8,widths[c]-2))),0)));sh.getRange(`A${start+i}:${last}${start+i}`).format.rowHeight=Math.max(46,lines*14+14);});
}
function addTable(sh,start,headers,rows,widths,name){
 const e=start+rows.length,last=letter(headers.length);
 sh.getRange(`A${start}:${last}${e}`).format={font:{name:'Microsoft YaHei',size:10,color:ink},verticalAlignment:'top',wrapText:true};
 sh.getRange(`A${start}:${last}${start}`).values=[headers];sh.getRange(`A${start+1}:${last}${e}`).values=rows;
 const t=sh.tables.add(`A${start}:${last}${e}`,true,name);t.style='TableStyleMedium2';formatHeader(sh,`A${start}:${last}${start}`);
 widths.forEach((w,i)=>sh.getRange(`${letter(i+1)}1:${letter(i+1)}${e}`).format.columnWidth=w);
 rowHeights(sh,start+1,rows,widths,last);return e;
}
// 只修改用例内容；原97条K:P人工输入/证据/旧关联原样从导入工作簿保留。
s.getRange('A6:J102').values=d.cases.slice(0,97).map(r=>r.slice(0,10));
s.getRange(`A103:S${end}`).format={font:{name:'Microsoft YaHei',size:10,color:ink},verticalAlignment:'top',wrapText:true};
s.getRange(`A103:P${end}`).values=d.cases.slice(97).map(r=>r.slice(0,16));
s.getRange(`R6:S${end}`).values=d.cases.map(r=>r.slice(17,19));
s.getRange('R5:S5').values=[['本轮页面观察/执行条件','执行粒度/去重边界']];
s.getRange(`R5:S${end}`).format={font:{name:'Microsoft YaHei',size:10,color:ink},verticalAlignment:'top',wrapText:true};
s.getRange(`R1:R${end}`).format.columnWidth=78;s.getRange(`S1:S${end}`).format.columnWidth=40;
replaceTable(s,'FrontendCases',`A5:S${end}`);formatHeader(s,'A5:S5');
s.getRange('A3').values=[['14条设计准出＋53条组件交互＋38条工作包专项；页面观察与正式执行结果分别记录，公共用例按实例复用。']];
s.getRange(`K103:O${end}`).format.fill=input;
s.getRange(`K103:K${end}`).dataValidation={rule:{type:'list',values:['待评审','待依据','可执行','不纳入']}};
s.getRange(`L103:M${end}`).dataValidation={rule:{type:'list',values:['未执行','通过','失败','受阻','不适用']}};
for(let i=97;i<d.cases.length;i++){
 const r=i+6,design=d.cases[i][0].startsWith('RV');
 s.getRange('Q'+r).formulas=[[design?`=IF(K${r}="不纳入","不纳入",IF(K${r}="可执行","评审闭环","待评审/依据"))`:`=IF(K${r}="不纳入","不纳入",IF(L${r}="失败",IF(LEN(TRIM(N${r}))=0,"开发失败缺证据","开发自测失败"),IF(M${r}="失败",IF(LEN(TRIM(O${r}))=0,"复核失败缺证据","提测复核失败"),IF(K${r}<>"可执行","待评审/依据",IF(L${r}="受阻","开发自测受阻",IF(L${r}<>"通过","待开发自测",IF(LEN(TRIM(N${r}))=0,"缺开发Build/证据",IF(M${r}="受阻","提测复核受阻",IF(M${r}<>"通过","待提测复核",IF(LEN(TRIM(O${r}))=0,"缺复核Build/证据","本轮复核通过"))))))))))`]];
}
s.getRange(`Q103:Q${end}`).conditionalFormats.addCustom('Q103="本轮复核通过"',{fill:'#E5F4ED',font:{color:'#285846'}});
s.getRange(`Q103:Q${end}`).conditionalFormats.addCustom('OR(Q103="开发自测失败",Q103="提测复核失败",Q103="开发失败缺证据",Q103="复核失败缺证据")',{fill:'#FBE5E2',font:{color:'#9A382E'}});
const visibleCaseRows=d.cases.map(row=>row.map((v,col)=>col===16?'待评审/依据':v));
rowHeights(s,6,visibleCaseRows,[12,27,23,21,36,13,59,68,74,70,16,16,16,43,43,42,26,78,40],'S');

p.getRange('A6:P43').values=d.packages;
p.getRange('O5:P5').values=[['本轮入口观察','本包主要未补齐条件']];
p.getRange('O5:P43').format={font:{name:'Microsoft YaHei',size:10,color:ink},wrapText:true,verticalAlignment:'top'};
p.getRange('O1:O43').format.columnWidth=50;p.getRange('P1:P43').format.columnWidth=62;
replaceTable(p,'PackageMapping','A5:P43');formatHeader(p,'A5:P5');
p.getRange('A3').values=[['公共16条见本周执行，按物理页面/角色/Build复用；每包BP单独检查业务结果。FE22排序未有具体批准列，不固定映射。']];
rowHeights(p,6,d.packages,[12,12,27,42,35,23,18,18,18,62,91,17,34,64,50,62],'P');

m.getRange('A2').values=[['PCS W2 前端用例：飞书与实际页面复核修订']];
m.getRange('B4').formulas=[[`=COUNTA('前端用例'!A6:A${end})`]];
m.getRange('F4').formulas=[[`=COUNTIFS('前端用例'!Q6:Q${end},"待评审/依据")`]];
m.getRange('H4').formulas=[[`=COUNTIFS('前端用例'!Q6:Q${end},"本轮复核通过")`]];
m.getRange('A6').values=[['原97编号保留：41条实质修订，56条保留；补8条至105。38包映射重核；正式结果与证据输入保持原样。']];
m.getRange('B9').values=[['继续闭环RV01–14；10/12是任务计划，未提供已完成证据。新增RV13文案删留、RV14汇率三方规则裁决。']];
m.getRange('B10').values=[['50/51/56已核对部分入口：优先闭环费用字段映射/审批、汇率规则、字典范围及空态/标签/表格差异；其余服务管理补入口再执行。']];
m.getRange('B13').values=[['只对已交付包运行FE/BP；公共用例按同Build/角色/承载复用；分别检查开发自测与提测复核证据，记录遗留与下周提测条件。']];
m.getRange('A17:C23').values=d.facts;
rowHeights(m,17,d.facts,[34,114,85],'C');
m.getRange('A35:D41').values=d.sources;
replaceTable(m,'CaseSources','A34:D41');formatHeader(m,'A34:D34');
m.getRange('A34:D41').format.wrapText=true;
rowHeights(m,35,d.sources,[34,114,85,94],'D');
m.getRange('A40:D41').format.font={name:'Microsoft YaHei',size:10,color:ink};
m.getRange('A44').values=[['复核后的执行安排与复用规则']];m.getRange('A44').format.font.bold=true;
addTable(m,45,['调整','范围/结论','落到用例'],[
 ['错误映射','只读编码、普通字段/数值、历史及日期按真实对象能力收窄','FE26–30/34/36/40；BP03/50/51/54/56'],
 ['重复执行','公共用例不再逐包重复；同组件实例复用，字段/对象/角色变体另留证','RV01/11/12/13；FE01–09/41/46/47；FE与BP不是同一业务通过记录'],
 ['补漏8条','原型说明、汇率裁决、下单规则反馈、链接动作、费用来源/审批、汇率唯一校验、直接生效状态','RV13/RV14；FE48–53'],
 ['本轮页面边界','只有50/51/56部分入口；35包当前角色未见入口；未提交保存/删除/审批','页面证据P01–P20见复核记录；K:O不填通过'],
 ['优先处理','先定费用字段/审批和汇率规则；修空态/标签/视觉差异；其余包先交付入口/数据','10/13评审→10/14价卡→10/15配置→10/16仅已交付包复核'],
],[34,114,85],'ReauditActions');
m.getRange('A52').values=[['公共用例（在相应物理页面/角色/Build各执行一次，变体与变更再执行）']];m.getRange('A52').format.font.bold=true;
m.getRange('A53:C53').values=[['设计准出','RV01、RV11、RV12、RV13','范围/字段及视觉依据/提测证据/文案采用；有专项裁决另按包执行']];
m.getRange('A54:C54').values=[['框架/页面公共','FE01–FE09、FE41、FE46、FE47','导航/权限刷新/响应式/加载/页头/可访问性/授权/组件状态；同承载的不同对象差异仍分实例留证']];
m.getRange('A55:C55').values=[['条件能力','FE22排序','待本期某列表排序列/规则批准后补该包映射；不把列表序号当排序']];
m.getRange('A53:C55').format={font:{name:'Microsoft YaHei',size:10,color:ink},verticalAlignment:'top',wrapText:true,rowHeight:45};
m.getRange('A1:A55').format.columnWidth=34;m.getRange('B1:B55').format.columnWidth=114;m.getRange('C1:C55').format.columnWidth=85;m.getRange('D1:D55').format.columnWidth=94;

const a=wb.worksheets.add('复核记录');a.showGridLines=false;a.tabColor='#8093A5';
a.getRange('A2').values=[['97条逐项复核记录＋8条补漏（2026-10-13）']];a.getRange('A2').format.font={name:'Microsoft YaHei',size:15,bold:true,color:ink};
a.getRange('A3').values=[['此页保存修订理由与本轮页面证据，供审阅追溯；不作为开发自测或提测复核结果。原工作簿原样保留。']];
addTable(a,5,['用例','处理','原包范围','修订后包范围','复核理由','来源/规则定位','当前页面观察及未执行边界'],d.journal,[14,14,27,27,73,87,92],'CaseReaudit');
a.freezePanes.freezeRows(5);a.freezePanes.freezeColumns(2);
const evidenceRows=ev.map(e=>[e.id,e.time.replace('T',' ').replace('Z',' UTC'),e.note,e.url,e.image]);
addTable(a,114,['证据ID','采证UTC时间','观察（非业务通过）','当时页面URL','截图文件名'],evidenceRows,[14,34,93,106,43],'PageEvidenceIndex');
// 全部现场截图嵌入工作簿，避免交付依赖本机临时图片路径。
let imageRow=138;
for(const e of ev){
 a.getRange(`A${imageRow}`).values=[[e.id+'  '+e.note]];a.getRange(`A${imageRow}`).format={font:{name:'Microsoft YaHei',size:11,bold:true,color:ink},rowHeight:25};
 a.getRange(`A${imageRow+1}:G${imageRow+27}`).format.rowHeight=20;
 const bytes=await fs.readFile(dir+'/'+e.image);
 a.images.add({dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64'),anchor:{from:{row:imageRow,col:0},extent:{widthPx:832,heightPx:520}}});
 imageRow+=30;
}
// 两张表共用列，按详细复核表宽度恢复，证据URL/备注靠足够行高展现。
const auditWidths=[14,24,33,36,73,87,92];auditWidths.forEach((w,i)=>a.getRange(`${letter(i+1)}1:${letter(i+1)}${imageRow}`).format.columnWidth=w);
rowHeights(a,6,d.journal,auditWidths,'G');rowHeights(a,115,evidenceRows,auditWidths.slice(0,5),'E');
wb.recalculate();
assert.deepEqual(['B4','D4','F4','H4'].map(x=>m.getRange(x).values[0][0]),[105,38,105,0]);
assert.deepEqual(s.getRange('K6:P102').values,d.cases.slice(0,97).map(r=>r.slice(10,16)));
await fs.writeFile(dir+'/result-inspection.ndjson',(await wb.inspect({kind:'table',range:'本周执行!A4:H4',include:'values,formulas',tableMaxRows:1,tableMaxCols:8,maxChars:2500})).ndjson);
await fs.writeFile(dir+'/formula-scan.ndjson',(await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:2500})).ndjson);
await (await SpreadsheetFile.exportXlsx(wb)).save(d.out);
console.log(JSON.stringify({saved:d.out,cases:105,packages:38,images:ev.length,originalExecutionInputsPreserved:true}));
for(const [sheetName,range,name] of [
 ['本周执行','A8:B13','cadence'],['本周执行','A45:C50','changes'],['本周执行','A34:D41','sources'],
 ['前端用例','G43:J46','scoped-forms'],['前端用例','G107:J110','additions'],['前端用例','K103:S106','results-observations'],
 ['工作包对应','J34:P36','packages'],['复核记录','A5:E8','journal'],['复核记录','A138:C165','embedded-evidence']]){
 const b=await wb.render({sheetName,range,scale:1.15,format:'png'});await fs.writeFile(dir+'/preview-'+name+'.png',new Uint8Array(await b.arrayBuffer()));
}
console.log('export and visual previews complete');
