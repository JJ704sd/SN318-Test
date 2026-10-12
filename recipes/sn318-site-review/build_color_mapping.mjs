import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='./recipes/sn318-site-review';
const out='./artifacts/smoke-ui';
const source=`${out}/SN318_提测前冒烟与UI规范_网站对照修订.xlsx`;
const path=`${out}/SN318_提测前冒烟与UI规范_颜色层级对应.xlsx`;
const records=(await fs.readFile(`${root}/ui-color-live.ndjson`,'utf8')).replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(JSON.parse);
const manifest=JSON.parse(await fs.readFile(`${root}/ui-color-live.manifest.json`,'utf8'));
assert.equal(manifest.records_count,22);assert.equal(manifest.has_more,false);
const text=x=>(Array.isArray(x)?x.join('、'):String(x??'')).replace(/<at[^>]*>(.*?)<\/at>/g,'$1').trim();
const level=r=>text(r['框架适配判断']).replace(/^[^\u4e00-\u9fff]+/,'');
const valid=records.filter(r=>text(r['页面/模块'])||text(r['当前原型问题'])||text(r['Review 建议'])||text(r['后续处理建议']));
const blank=records.filter(r=>!valid.includes(r));assert.equal(valid.length,21);assert.equal(blank.length,1);
const definitions=[
 {name:'无法覆盖',color:'红色',fill:'#FDE7E9',ink:'#991B1B',method:'对照批准专项设计稿/组件规范，逐结构、状态、交互验证；现有框架本身不能作为该专项的完整验收依据。',evidence:'UI专项稿/组件规范及版本；产品确认业务边界；开发实现与测试截图/交互证据。'},
 {name:'业务交互、信息待明确',color:'白灰色',fill:'#F3F4F6',ink:'#374151',method:'先取得产品批准的业务流程、状态或文案清单，再按明确规则验证；未明确的分支保持依据待确认。',evidence:'产品确认的保留/删除文案、业务规则或状态说明；明确后重新评估框架适配。'},
 {name:'组合复用',color:'蓝色',fill:'#E0F2FE',ink:'#075985',method:'核现有标准组件组合后的布局、状态联动与完整流程，重点检查选中反馈、返回、跨页/未保存数据保护。',evidence:'批准组合布局与适用组件；业务冲突DEC22或页面承载DEC23已确定；组合交互证据。'},
 {name:'调整后复用',color:'黄色',fill:'#FEF3C7',ink:'#854D0E',method:'核局部调整/扩展项及受影响状态，同时回归原组件正常、取消及风险提示交互。',evidence:'批准局部改动及风险语义；必要UI建议；对应业务影响与取消/确认结果。'},
 {name:'直接复用',color:'绿色',fill:'#DCFCE7',ink:'#166534',method:'对照批准通用框架组件、Token与交互核一致性，保留实际字段/数据/权限差异；复用标签不代表实现已通过。',evidence:'框架/规范版本、业务配置及批准例外；无需另行UI出稿的通用项仍须开发与测试证据。'}
];
const byName=new Map(definitions.map(d=>[d.name,d]));
for(const r of records)assert(byName.has(level(r)),level(r));
const related={
 UI01:['SM03','SM11'],UI02:['SM03','SM04'],UI03:['SM28','SM63'],UI04:['SM22'],UI05:['SM05'],
 UI06:['SM03'],UI07:['SM03'],UI08:['SM03','SM11','SM21'],UI09:['SM06','SM07','SM58'],UI10:['SM06','SM08'],UI11:['SM08'],
 UI12:['SM28'],UI13:['SM28'],UI14:['SM28'],UI15:['SM03','SM12','SM31'],UI16:['SM27'],UI17:['SM04'],UI18:['SM30'],UI35:['SM21','SM29'],UI36:['SM21','SM27'],UI42:['SM02','SM05','SM12','SM13']
};
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const b=w.worksheets.getItem('本批提测'),u=w.worksheets.getItem('UI检查'),s=w.worksheets.getItem('冒烟用例'),t=w.worksheets.getItem('需求对照');
const get=(sh,a)=>sh.getRange(a).values[0][0],set=(sh,a,v)=>sh.getRange(a).values=[[v]];
const originalInputs=[[b,'B7:B17'],[b,'D40:G61'],[b,'D115:G117'],[b,'D156:G159'],[b,'B33:B36'],[s,'D6:H96'],[s,'M6:R96'],[u,'D6:H46'],[u,'M6:O46'],[u,'U6:V46']].map(([sh,r])=>({sh,r,values:sh.getRange(r).values}));
const originalFormulas={smoke:s.getRange('A1:X96').formulas,ui:u.getRange('A1:AH46').formulas};
const byRecord=new Map(valid.map(r=>[r.record_id,r]));
const sourceMap=new Map();for(let r=6;r<=46;r++){const recordId=get(u,`AB${r}`);if(recordId){assert(byRecord.has(recordId));sourceMap.set(recordId,{id:get(u,`A${r}`),r});}}
const added=valid.filter(r=>!sourceMap.has(r.record_id));assert.equal(added.length,1);const entry=added[0];assert.equal(entry.record_id,'review-294de09d51');assert(text(entry['后续处理建议']).includes('行内编辑'));
u.getRange('A47:AH47').copyFrom(u.getRange('A46:AH46'),'all');
u.getRange('A47:AH47').values=[['UI42','全局行内编辑','行内编辑组件、状态与数据保护','待选择','是','待确认','未执行',null,null,'前置：DEC30取得批准的行内编辑组件规范，明确适用页面/表格/字段、进入编辑方式、可编辑权限、保存/取消、加载/错误、键盘/失焦、未保存保护及返回焦点规则。本条为基于来源“产出行内编辑组件规范”的测试设计；来源未列明具体交互，不自行规定双击、失焦自动保存或尺寸。\n1.在批准的专用测试行进入编辑，核仅目标字段/行改变状态、值完整回显。\n2.合法变更后按批准方式保存，重新查询/刷新读回；取消另一变更后重开核原值。\n3.按批准规则测受限权限、无效值、保存失败/加载及键盘/失焦/切行；确认不误保存其他行、错误可定位、失败不报成功且未保存值按方案保留。','各状态、交互与量值符合批准行内编辑组件规范；仅有权限且批准的字段可编辑；成功保存与读回一致，取消不写入，无效/失败无错误成功反馈或串行写入。未知键盘/失焦、是否即时提交、尺寸与数据恢复按DEC30确认，不把测试设计自动当成产品契约。未取得规范时依据待确认；“修改中”是来源状态，不能代表测试通过。',`REVIEW ${entry.record_id}；2026-10-12视图rev${manifest.rev}；当前仅后续建议为UI产出行内编辑组件规范，原型问题及Review建议为空；待DEC30确认具体范围。`,null,null,null,text(entry['优先级']),text(entry['确认状态']),level(entry),text(entry['当前处理角色']),'UI核对',null,null,'未批准Review方向＋测试设计',text(entry['Review 类型']),text(entry['当前原型问题'])||null,text(entry['Review 建议'])||null,text(entry['后续处理建议']),entry.record_id,'补最新红色行内编辑记录；无具体规范时不编造固定交互。','从查看/编辑/保存/取消/加载/失败状态覆盖组件及真实数据读回，受限权限和未保存保护需产品/UI批准。','记录专项规范版本、适用字段、前后数据、各状态截图与交互/读回证据；配套功能结果不能由UI截图代替。',null,'颜色层级补充','新增来源仅有后续处理建议，具体组件规则和适用范围仍待确认。']];
sourceMap.set(entry.record_id,{id:'UI42',r:47});
const perCase=[];
u.getRange('AI5:AL5').values=[['层级对应检查重点','配套功能case','验收所需依据','层级来源']];
for(let r=6;r<=47;r++){
 const id=get(u,`A${r}`),rid=get(u,`AB${r}`),rec=rid?byRecord.get(rid):null;
 if(rec){
  const name=level(rec),d=byName.get(name);assert(d);
  u.getRange(`P${r}:S${r}`).values=[[text(rec['优先级']),text(rec['确认状态']),name,text(rec['当前处理角色'])]];
  u.getRange(`X${r}:AB${r}`).values=[[text(rec['Review 类型']),text(rec['当前原型问题'])||null,text(rec['Review 建议'])||null,text(rec['后续处理建议'])||null,rid]];
  u.getRange(`AI${r}:AL${r}`).values=[[d.method,(related[id]||[]).join('、')||'无直接功能映射',d.evidence,`飞书直接映射：${rid}，rev${manifest.rev}；${d.color}。`]];
  let sourceText=String(get(u,`L${r}`)).replace(/rev628/g,`rev${manifest.rev}`);
  set(u,`L${r}`,sourceText+`\n颜色层级按飞书框架适配字段对应；批准需求与本批实测结果分别记录。`);
  set(u,`AG${r}`,r===47?'颜色层级补充':'颜色层级对应');
  set(u,`AH${r}`,`${get(u,`AH${r}`)||''}\n对应${d.color}${name}：${d.method}`);
  perCase.push({id,row:r,recordId:rid,level:name,related:related[id]||[]});
 }else{
  u.getRange(`AI${r}:AL${r}`).values=[['通用规范/网站补充，按本批实际组件和批准基线执行，不列入五色来源分组。',null,'批准通用规范、设备/容差及组件采用方案；网站字段映射按原关联决策。','规范或网站补充；没有直接飞书Review记录，不擅自设颜色层级。']];
 }
}
assert.equal(perCase.length,21);
// Exact text categories drive the color; priorities and execution results keep their original formatting.
for(const d of definitions){
 u.getRange('R6:R47').conditionalFormats.add('cellIs',{operator:'equal',formula:`"${d.name}"`,format:{fill:d.fill,font:{color:d.ink,bold:true}}});
 u.getRange('A6:C47').conditionalFormats.addCustom(`$R6="${d.name}"`,{fill:d.fill,font:{color:d.ink}});
}
u.getRange('AI5:AL47').format.font={name:'Arial',size:10,color:'#25324A'};u.getRange('AI5:AL47').format.wrapText=true;u.getRange('AI5:AL47').format.verticalAlignment='center';
for(const [c,width]of [['AI',440],['AJ',215],['AK',430],['AL',370]])u.getRange(`${c}1:${c}47`).format.columnWidthPx=width;
u.getRange('AI5:AL5').format.fill='#213B62';u.getRange('AI5:AL5').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};
u.getRange('R1:R47').format.columnWidthPx=195;
const reverse=new Map();for(const row of perCase)for(const cid of row.related){const list=reverse.get(cid)||[];list.push(row);reverse.set(cid,list);}
s.getRange('Y5:Z5').values=[['配套UI case','对应颜色层级（关联）']];
for(let r=6;r<=96;r++){
 const id=get(s,`A${r}`),rows=reverse.get(id)||[],levels=[...new Set(rows.map(x=>x.level))];
 s.getRange(`Y${r}:Z${r}`).values=[[rows.map(x=>x.id).join('、')||null,levels.length?levels.map(x=>`${byName.get(x).color}：${x}`).join('；'):'功能专项，无直接Review映射']];
 if(levels.length===1){const d=byName.get(levels[0]);s.getRange(`Z${r}`).format.fill=d.fill;s.getRange(`Z${r}`).format.font={name:'Arial',size:10,color:d.ink};}
}
s.getRange('Y5:Z96').format.wrapText=true;s.getRange('Y5:Z96').format.verticalAlignment='center';s.getRange('Y1:Y96').format.columnWidthPx=310;s.getRange('Z1:Z96').format.columnWidthPx=400;s.getRange('Y5:Z5').format.fill='#213B62';s.getRange('Y5:Z5').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};
// The new red item needs a concrete design baseline, separately from the general UI baseline.
set(b,'A154','网站与Review｜新增待确认事项（按关联用例自动纳入）');
b.getRange('A160:G160').values=[['DEC30','行内编辑专项组件规范及适用页面/字段：触发、权限、查看/编辑/保存/取消/加载/错误、键盘/失焦、未保存保护和量值；当前来源仅有产出规范方向','UI42','待选择','UI、产品、开发','待确认',null]];
const linked=`COUNTIFS('UI检查'!$A$6:$A$47,"UI42",'UI检查'!$D$6:$D$47,"是")`;
b.getRange('H160').formulas=[[`=IF(AND(${linked}>0,D160="否"),"范围矛盾",IF(OR(D160="是",${linked}>0),IF(AND(F160="已确认",LEN(TRIM(G160))>0),"已确认",IF(AND(F160="已记录后置",LEN(TRIM(G160))>0),"核心依据不可后置","待确认")),IF(D160="否","不涉及","库内待选择")))`]];
for(const c of ['D','F'])b.getRange(`${c}160`).dataValidation={rule:{type:'list',values:c==='D'?['待选择','是','否']:['待确认','已确认','已记录后置']}};
b.getRange('A160:H160').format.font={name:'Arial',size:10,color:'#25324A'};b.getRange('A160:H160').format.wrapText=true;b.getRange('A160:H160').format.verticalAlignment='center';b.getRange('A160:H160').format.rowHeightPx=210;b.getRange('D160:G160').format.fill='#FFF4D6';
const oldI=u.getRange('I46').formulas[0][0];u.getRange('I47').formulas=[[oldI.replace(/\b([A-Z]+)46\b/g,(_,c)=>c+'47')]];
u.getRange('AF47').formulas=[['=IF(D47="否","不适用",IF(D47<>"是","未纳入本批",IF(OR(LEN(TRIM(\'本批提测\'!$B$10))=0,LEN(TRIM(\'本批提测\'!$B$11))=0,\'本批提测\'!$B$12<>"已确认",F47<>"已确认",\'本批提测\'!$H$57<>"已确认",\'本批提测\'!$H$160<>"已确认"),"待确认","已确认")))']];
for(const [c,values]of [['D',['待选择','是','否']],['E',['是','否']],['F',['待确认','已确认']],['G',['未执行','通过','失败','受阻','依据待确认']]])u.getRange(`${c}47`).dataValidation={rule:{type:'list',values}};
const bf=b.getRange('A1:H163').formulas;for(let r=0;r<bf.length;r++)for(let c=0;c<bf[r].length;c++){const f=bf[r][c];if(!f)continue;const nf=f.replace(/('UI检查'![^,()+]*\$)46\b/g,(_,p)=>p+'47').replace(/\$H\$156:\$H\$159/g,'$H$156:$H$160');if(nf!==f)b.getCell(r,c).formulas=[[nf]];}
set(b,'C57','UI01—42');
const selected=Array.from({length:42},(_,i)=>`COUNTIFS('UI检查'!$A$6:$A$47,"UI${String(i+1).padStart(2,'0')}",'UI检查'!$D$6:$D$47,"是")`).join('+');
b.getRange('H57').formulas=[[`=IF(AND((${selected})>0,D57="否"),"范围矛盾",IF(OR(D57="是",(${selected})>0),IF(AND(F57="已确认",LEN(TRIM(G57))>0),"已确认",IF(AND(F57="已记录后置",LEN(TRIM(G57))>0),"核心依据不可后置","待确认")),IF(D57="否","不涉及","库内待选择")))`]];
set(b,'A3','2026-10-12 颜色层级对应｜91功能＋42UI；28冒烟＋63专项；21有效Review逐项对应');
set(b,'A83','当前库：28冒烟＋63专项＋42UI，共133检查点；颜色表示框架适配层级，来源确认状态、本批采用及测试结果分别判断。');
set(b,'A110','按飞书框架适配颜色对应21条有效Review，保留1条空绿色来源统计；新增红色行内编辑UI42及DEC30，全部133检查点仍未执行。');
set(b,'H10','Review视图rev637：1已修改、3修改中、17待确认；颜色表示适配方式。确认状态及颜色均不代表本批实测通过。');
set(b,'B67',`UI Review视图rev${manifest.rev}，2026-10-12完整读取22条，21有效＋1空记录；全部有效记录ID映射到UI case。`);
// The color legend is the requested lookup view, located in the existing primary sheet.
set(b,'A166','颜色层级与case对应');b.getRange('B166:H166').merge();set(b,'B166','按飞书框架适配字段对应；颜色与P0/P1优先级、关键项、测试通过/失败独立。');
b.getRange('A167:H167').values=[['颜色','框架适配层级','飞书组内记录','有效映射记录','直接对应UI case','主要检查方式','配套功能case','依据及负责范围']];
const groups=[];
for(const [i,d]of definitions.entries()){
 const r=168+i,rows=perCase.filter(x=>x.level===d.name),rawCount=records.filter(x=>level(x)===d.name).length,func=[...new Set(rows.flatMap(x=>x.related))].sort((a,b)=>Number(a.slice(2))-Number(b.slice(2)));
 const ids=rows.map(x=>x.id).sort((a,b)=>Number(a.slice(2))-Number(b.slice(2)));
 const display=d.name==='直接复用'?'UI06—UI18、UI36':ids.join('、');
 const groupedFunctions=Array.from({length:Math.ceil(func.length/4)},(_,n)=>func.slice(n*4,n*4+4).join('、')).join('\n');
 b.getRange(`A${r}:H${r}`).values=[[d.color,d.name,rawCount,rows.length,display,d.method,groupedFunctions,d.evidence]];
 b.getRange(`A${r}:B${r}`).format.fill=d.fill;b.getRange(`A${r}:B${r}`).format.font={name:'Arial',size:10,bold:true,color:d.ink};
 groups.push({level:d.name,color:d.color,rawRecords:rawCount,mappedRecords:rows.length,cases:ids,related:func});
}
b.getRange('A173:B173').values=[['合计','五色来源对应']];b.getRange('C173:D173').formulas=[['=SUM(C168:C172)','=SUM(D168:D172)']];set(b,'E173','21个UI case');set(b,'F173','每条有效来源只直接映射一次；配套功能case可跨层级，不能重复计为来源记录。');set(b,'G173','功能验证独立执行');set(b,'H173','颜色不替代批准基线或测试结果');
set(b,'A175','空记录');b.getRange('B175:H175').merge();set(b,'B175',`绿色15条含1空记录${blank[0].record_id}，仅有适配标签，无页面/问题/建议，不生成case；绿色有效映射14条。`);
set(b,'A176','补充用例');b.getRange('B176:H176').merge();set(b,'B176','UI19—UI34、UI37—UI41为规范或网站补充，共21条；没有直接Review记录，不强行套五色。按实际组件配套使用，如UI33/34配套UI01、UI37/38配套UI16。');
set(b,'A177','来源');b.getRange('B177:H177').merge();set(b,'B177',`飞书视图rev${manifest.rev}及框架适配字段说明，2026-10-12只读获取；字段定义明确UI/开发/产品分工。https://example.invalid/source/e04459bb0b`);
b.getRange('A166:H177').format.wrapText=true;b.getRange('A166:H177').format.verticalAlignment='center';b.getRange('A166:H177').format.font={name:'Arial',size:10,color:'#25324A'};
b.getRange('A166:H167').format.fill='#213B62';b.getRange('A166:H167').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};b.getRange('A166:H167').format.rowHeightPx=62;b.getRange('A168:H172').format.rowHeightPx=160;b.getRange('A173:H173').format.rowHeightPx=90;b.getRange('A175:H176').format.rowHeightPx=78;b.getRange('A177:H177').format.rowHeightPx=110;
b.getRange('C168:D173').format.horizontalAlignment='center';
// Restore category ink after the shared table typography, without coloring result cells.
for(const [i,d]of definitions.entries()){b.getRange(`A${168+i}:B${168+i}`).format.font={name:'Arial',size:10,bold:true,color:d.ink};}
for(const [sh,range,name]of [[u,'A5:AL47','UiCases'],[s,'A5:Z96','SmokeCases'],[b,'A155:H160','SiteDecisions']]){const table=sh.tables.items.find(v=>v.name===name),style=table.style;table.delete();const nt=sh.tables.add(range,true,name);nt.style=style;nt.showFilterButton=true;}
t.getRange('A124:H124').values=[['TR119','行内编辑专项规范与状态保护','UI42','批准触发/权限/保存取消/加载失败/键盘失焦及逐状态证据','2026-10-12颜色层级补充','Review方向＋测试设计','DEC30、DEC18',`https://example.invalid/source/c1614f6853${entry.record_id}`]];t.getRange('A124:H124').format.font={name:'Arial',size:10,color:'#25324A'};t.getRange('A124:H124').format.wrapText=true;t.getRange('A124:H124').format.verticalAlignment='center';t.getRange('A124:H124').format.rowHeightPx=130;const trace=t.tables.items[0],traceStyle=trace.style,traceName=trace.name;trace.delete();t.tables.add('A5:H124',true,traceName).style=traceStyle;
set(u,'A4','颜色表示框架适配方式，R列及左侧case识别区按来源着色；AI—AL列列明对应检查方式、配套功能与依据。来源已修改/修改中、颜色、本批采用和G/I测试结果分别记录；全部未执行。');
set(s,'A4',`${get(s,'A4')} Y/Z列为配套UI case及其颜色层级；功能行为须独立验证，不从颜色或UI结果推定功能通过。`);
for(const sh of [u,s]){
 const last=sh===u?47:96,end=sh===u?'AL':'Z';
 for(let r=6;r<=last;r++){const vals=sh.getRange(`A${r}:${end}${r}`).values[0];const lines=vals.map((v,i)=>String(v??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length*12/Math.max(45,(sh.getCell(r-1,i).format.columnWidthPx||120)-18))),0));sh.getRange(`A${r}:${end}${r}`).format.rowHeightPx=Math.max(sh.getRange(`A${r}`).format.rowHeightPx||150,...lines.map(n=>n*18+28));}
}
u.getRange('A47:AL47').format.font={name:'Arial',size:10,color:'#25324A'};u.getRange('A47:AL47').format.wrapText=true;u.getRange('A47:AL47').format.verticalAlignment='center';
// Native cell fills preserve the visible source grouping in previews and Excel; CF retains category-change behavior.
for(const row of perCase){const d=byName.get(row.level);for(const area of [`R${row.row}`,`A${row.row}:C${row.row}`]){u.getRange(area).format.fill=d.fill;u.getRange(area).format.font={name:'Arial',size:10,color:d.ink};}u.getRange(`R${row.row}`).format.font={name:'Arial',size:10,bold:true,color:d.ink};}
for(const c of ['G','I','AF']){const rg=u.getRange(`${c}47`);rg.conditionalFormats.add('containsText',{text:'失败',format:{fill:'#FDE7E9',font:{color:'#A3212E',bold:true}}});rg.conditionalFormats.add('containsText',{text:'待确认',format:{fill:'#FFF4CE',font:{color:'#8B5B00'}}});}
// Preserve existing execution inputs and result logic. Only affected range extensions and new design gate are added.
for(const p of originalInputs)assert.deepEqual(p.sh.getRange(p.r).values,p.values,`preserve ${p.r}`);
assert.deepEqual(s.getRange('A1:X96').formulas,originalFormulas.smoke);
assert.deepEqual(u.getRange('A1:AH46').formulas,originalFormulas.ui);
const checks=[];const eq=(sh,a,v,label)=>{assert.equal(get(sh,a),v,label);checks.push(label);};
const saved=[[b,'B7:B17'],[b,'D57:G57'],[b,'D160:G160'],[u,'D47:H47'],[u,'M47:O47'],[u,'U47:V47']].map(([sh,r])=>({sh,r,values:sh.getRange(r).values}));
set(u,'D47','是');set(u,'F47','已确认');eq(b,'F20',1,'New red case counted as applicable UI');eq(b,'H160','待确认','Inline design decision automatically selected');
for(const [a,v]of [['B7','复核模拟'],['B8','AUDIT-BUILD'],['B9','复核模拟交付'],['B10','复核模拟需求'],['B11','复核模拟UI'],['B12','已确认'],['B15','复核模拟账号'],['B16','2026-10-12'],['B17','已核对'],['F57','已确认'],['G57','复核模拟UI基线']])set(b,a,v);
eq(u,'AF47','待确认','General UI baseline alone cannot approve missing red component specification');set(b,'F160','已确认');set(b,'G160','复核模拟行内编辑批准规范');eq(u,'AF47','已确认','Approved specific component baseline activates new case');set(b,'D160','否');eq(b,'H160','范围矛盾','Selected new case cannot exclude its baseline decision');eq(u,'AF47','待确认','Contradictory decision blocks new case');set(b,'D160','是');set(b,'F160','已记录后置');eq(b,'H160','核心依据不可后置','Inline component specification cannot be postponed');set(b,'F160','已确认');
for(const [a,v]of [['G47','通过'],['H47','AUDIT-BUILD'],['M47','复核模拟结果'],['O47','复核模拟执行人'],['U47','复核模拟交付'],['V47',get(b,'B18')]])set(u,a,v);eq(u,'I47','通过','New fully evidenced case can pass');eq(b,'F22',1,'New case effective pass included in UI statistics');set(b,'B15','');eq(u,'I47','批次未就绪','New case still requires execution metadata');
for(const p of saved)p.sh.getRange(p.r).values=p.values;
w.recalculate();eq(b,'C173',22,'Color summary matches source group record total');eq(b,'D173',21,'Color summary excludes blank source from mapped cases');eq(b,'B6','未就绪','Final execution metadata restored');for(const c of ['B22','F22','H22'])eq(b,c,0,`Final ${c} has no executed pass`);
for(const p of originalInputs)assert.deepEqual(p.sh.getRange(p.r).values,p.values);
for(const [sh,last]of [[s,96],[u,47]])for(let r=6;r<=last;r++)assert.equal(get(sh,`G${r}`),'未执行');
const errors=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:25},maxChars:1600});assert(errors.ndjson.includes('matched 0 entries'),errors.ndjson);
await (await SpreadsheetFile.exportXlsx(w)).save(path);
await fs.writeFile(`${root}/color-verification.json`,JSON.stringify({path,sourceRevision:manifest.rev,sourceCount:records.length,validCount:valid.length,blankRecord:blank[0].record_id,groups,perCase,checks,total:{functional:91,smoke:28,regression:63,ui:42,cases:133},formulaErrors:errors.ndjson},null,2));
console.log(JSON.stringify({path,sourceRecords:22,mappedRecords:21,totalCases:133,checks:checks.length}));
for(const [sheetName,range,name]of [['本批提测','A166:H173','color-overview'],['UI检查','P6:S10','color-labels'],['UI检查','A47:C47','color-new-case'],['UI检查','AI6:AL10','color-methods'],['冒烟用例','Y8:Z10','color-functional']]){const p=await w.render({sheetName,range,scale:1.1,format:'png'});await fs.writeFile(`${root}/${name}.png`,new Uint8Array(await p.arrayBuffer()));}
console.log('Color correspondence exported and previews saved.');process.exit(0);
