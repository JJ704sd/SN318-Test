import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
process.on('uncaughtException',e=>{console.error(`${e.name}: ${e.message}\n${String(e.stack).split('\n').filter(x=>x.includes('build_review.mjs')).join('\n')}`);process.exit(1);});

const base='./recipes/sn318-smoke-ui-review';
const out='./artifacts/smoke-ui';
const input='./artifacts/checklist/SN318_分批提测检查表_需求重核完善.xlsx';
const content=JSON.parse(await fs.readFile(`${base}/review_content.json`,'utf8'));
const live=(await fs.readFile(`${base}/ui-live.ndjson`,'utf8')).replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(x=>JSON.parse(x));
const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(input));
const batch=workbook.worksheets.getItem('本批提测');
const smoke=workbook.worksheets.getItem('冒烟用例');
const ui=workbook.worksheets.getItem('UI检查');
const trace=workbook.worksheets.getItem('需求对照');
const value=(s,a)=>s.getRange(a).values[0][0];
const write=(s,a,v)=>s.getRange(a).values=[[v]];
const assertions=[];
const equal=(s,a,v,label)=>{assert.equal(value(s,a),v,label);assertions.push(label);};
const str=x=>(Array.isArray(x)?x.join('、'):String(x??'')).replace(/<at[^>]*>(.*?)<\/at>/g,'$1').trim();
const cleanAdapt=x=>str(x).replace(/^[^\u4e00-\u9fff]+/,'');
const original={smoke:smoke.getRange('A6:U87').values,ui:ui.getRange('A6:AE39').values};
const smokeIds=new Map(original.smoke.map((r,i)=>[r[0],i+6]));
const uiIds=new Map(original.ui.map((r,i)=>[r[0],i+6]));
const decisionRows=new Map(batch.getRange('A40:A61').values.map((r,i)=>[r[0],i+40]));
for(let i=0;i<content.decisions.length;i++)decisionRows.set(content.decisions[i][0],115+i);
const deferred=new Set(['DEC01','DEC02','DEC03','DEC23']);
const dependencies=new Map();
for(const [s,ids] of [[smoke,smokeIds],[ui,uiIds]]){
 for(const [id,r] of ids){
  const f=s.getRange(`I${r}`).formulas[0][0]??'';
  const list=[...f.matchAll(/"(DEC\d+)"/g)].map(m=>m[1]);
  for(const m of f.matchAll(/'本批提测'!\$H\$(\d+)/g)){
   const match=[...decisionRows].find(([,row])=>row===Number(m[1]));if(match)list.push(match[0]);
  }
  if(id.startsWith('UI'))list.push('DEC18');
  dependencies.set(id,[...new Set(list)]);
 }
}

// Refresh source fields independently of test outcomes or this batch's adoption.
const sourceRows=live.filter(r=>r['当前原型问题']||r['Review 建议']);
assert.equal(sourceRows.length,20);
const liveById=new Map(sourceRows.map(r=>[r.record_id,r]));
for(const [id,r] of uiIds){
 const recordId=value(ui,`AB${r}`);if(!recordId)continue;
 const rec=liveById.get(recordId);assert(rec,`Current record exists: ${id}`);
 ui.getRange(`P${r}:S${r}`).values=[[str(rec['优先级']),str(rec['确认状态']),cleanAdapt(rec['框架适配判断']),str(rec['当前处理角色'])]];
 ui.getRange(`X${r}:AB${r}`).values=[[str(rec['Review 类型']),str(rec['当前原型问题']),str(rec['Review 建议']),str(rec['后续处理建议']),recordId]];
 write(ui,`L${r}`,`REVIEW ${recordId}；2026-10-12当前视图rev628；建议按本批批准基线采纳，来源状态不等于实测结果。`);
}
write(ui,'AC6','来源状态由修改中变为已修改；本批批准稿与开发实现仍需分别留证。');
write(ui,'AC8','同步当前处理角色UI、开发；保留DEC22数量反馈冲突及跨页保存保护。');
write(smoke,'S6','测试建议／条件需求');
write(smoke,'S8','需求正文＋测试建议');
write(smoke,'S9','未批准Review建议／状态范围待确认');
write(smoke,'L6','通用登录与身份检查为测试建议；本轮未访问业务环境，不能由旧观察推断当前登录可用。');
for(const id of ['SM33','SM39','SM51','SM52'])write(smoke,`P${smokeIds.get(id)}`,'专项回归');

// Append cases without changing the original IDs, evidence or execution inputs.
for(const [i,e] of content.functional.entries()){
 const r=88+i;smokeIds.set(e.id,r);dependencies.set(e.id,e.decisions);
 smoke.getRange(`A${r}:U${r}`).values=[[e.id,e.module,e.check,'待选择',e.critical,'待确认','未执行',null,null,e.steps,e.expected,e.source,null,null,null,e.stage,null,null,e.basis,e.method,e.evidence]];
}
for(const [i,e] of content.ui.entries()){
 const r=40+i;uiIds.set(e.id,r);dependencies.set(e.id,e.decisions);
 const rec=liveById.get(e.recordId);
 ui.getRange(`A${r}:AE${r}`).values=[[e.id,e.module,e.check,'待选择',e.critical,'待确认','未执行',null,null,e.steps,e.expected,e.source,null,null,null,e.priority,e.state,e.adaptation,e.roles,'UI核对',null,null,e.basis,rec?str(rec['Review 类型']):null,rec?str(rec['当前原型问题']):null,rec?str(rec['Review 建议']):null,rec?str(rec['后续处理建议']):null,e.recordId||null,'本轮补充；来源采纳、交付范围与实测分别记录。',e.method,e.evidence]];
}
const smokeLast=93,uiLast=45;
// Record the distinct new decisions in unused space; keep the original decision table in place.
batch.getRange('A113:H113').merge();write(batch,'A113','本轮补充待确认事项');
batch.getRange('A114:H114').values=[batch.getRange('A39:H39').values[0]];
batch.getRange('A115:G117').values=content.decisions;
for(const c of ['D','F'])batch.getRange(`${c}115:${c}117`).dataValidation={rule:{type:'list',values:c==='D'?['待选择','是','否']:['待确认','已确认','已记录后置']}};
write(batch,'C44','UI16、SM27');
write(batch,'C56','SM27、UI16、UI37、UI38');
write(batch,'B57','本批UI批准稿/规范版本、支持端、容差和遮罩；Tabs40/触达44及页头94px与4倍数说明冲突；全部UI按有效基线采纳');
write(batch,'C57','UI01—40');
write(batch,'C47','SM28、SM55、UI13');
const parseIds=t=>[...String(t).matchAll(/(SM|UI)(\d+)(?:[—–-](?:SM|UI)?(\d+))?/g)].flatMap(m=>Array.from({length:Number(m[3]??m[2])-Number(m[2])+1},(_,i)=>`${m[1]}${String(Number(m[2])+i).padStart(2,'0')}`));
for(const [id,r] of decisionRows){
 const cases=parseIds(value(batch,`C${r}`));
 const linked=cases.map(cid=>{
  const isUi=cid.startsWith('UI'),last=isUi?uiLast:smokeLast;
  assert((isUi?uiIds:smokeIds).has(cid),`${id}: mapped case ${cid}`);
  return `COUNTIFS('${isUi?'UI检查':'冒烟用例'}'!$A$6:$A$${last},"${cid}",'${isUi?'UI检查':'冒烟用例'}'!$D$6:$D$${last},"是")`;
 }).join('+')||'0';
 const adoption=`IF(AND(F${r}="已确认",LEN(TRIM(G${r}))>0),"已确认",IF(AND(F${r}="已记录后置",LEN(TRIM(G${r}))>0),"${deferred.has(id)?'已记录后置':'核心依据不可后置'}","待确认"))`;
 batch.getRange(`H${r}`).formulas=[[`=IF(AND((${linked})>0,D${r}="否"),"范围矛盾",IF(OR(D${r}="是",(${linked})>0),${adoption},IF(D${r}="否","不涉及","库内待选择")))`]];
 for(const cid of cases)if(cid!=='SM55')dependencies.set(cid,[...new Set([...(dependencies.get(cid)??[]),id])]);
}

for(const [sheet,ids,basisCol,endCol,reviewCol,changeCol,last,isUi] of [[smoke,smokeIds,'V','X','W','X',smokeLast,false],[ui,uiIds,'AF','AH','AG','AH',uiLast,true]]){
 sheet.getRange(`${basisCol}5:${endCol}5`).values=[['依据有效性','用例复核处理','本轮复核说明']];
 for(const [id,r] of ids){
  const deps=dependencies.get(id)??[];
  const depTests=deps.map(d=>{
   const dr=decisionRows.get(d);assert(dr,`Decision exists ${d}`);
   const ref=`'本批提测'!$H$${dr}`;
   return deferred.has(d)?`AND(${ref}<>"已确认",${ref}<>"已记录后置")`:`${ref}<>"已确认"`;
  });
  const invalid=[`F${r}<>"已确认"`,...depTests].join(',');
  sheet.getRange(`${basisCol}${r}`).formulas=[[`=IF(D${r}="否","不适用",IF(D${r}<>"是","未纳入本批",IF(OR(${invalid}),"待确认","已确认")))`]];
  const mapping=isUi?'U':'Q',baseline=isUi?'V':'R';
  sheet.getRange(`I${r}`).formulas=[[`=IF(D${r}="否","不适用",IF(D${r}<>"是","未纳入本批",IF(${basisCol}${r}<>"已确认","依据待确认",IF('本批提测'!$B$8="","版本待填写",IF(OR(H${r}<>'本批提测'!$B$8,G${r}="",G${r}="未执行"),"未执行",IF(${baseline}${r}<>'本批提测'!$B$18,"基线已变，需复测",IF(LEN(TRIM(${mapping}${r}))=0,"交付未映射",IF(AND(OR(G${r}="通过",G${r}="失败"),LEN(TRIM(M${r}))=0),"缺少证据",IF(AND(OR(G${r}="通过",G${r}="失败"),LEN(TRIM(O${r}))=0),"缺少执行人",IF(OR(G${r}="通过",G${r}="失败",G${r}="受阻",G${r}="依据待确认"),G${r},"结果待填写"))))))))))`]];
  const added=r>(isUi?39:87),stageChanged=['SM33','SM39','SM51','SM52'].includes(id),sourceChanged=isUi&&r<=23;
  write(sheet,`${reviewCol}${r}`,added?'本轮补充':(stageChanged||sourceChanged||['SM01','SM03','SM04'].includes(id))?'本轮修正':'保留／按批次选取');
  const note=added?'补具体步骤、预期与分支证据；待本批确认并执行。':stageChanged?'边界/批量/公式矩阵调整为专项回归；冒烟正向闭环由本模块主链路覆盖。':sourceChanged?'同步2026-10-12 Review记录；来源状态与本批采纳、实测结果独立。':`设计复核后保留；${deps.length?'关联'+deps.join('、')+'确认后方可执行判定。':'按交付范围及批准现行基线执行。'}`;
  write(sheet,`${changeCol}${r}`,note);
 }
 // Preserve established table style while extending it to appended rows/columns.
 const table=sheet.tables.items[0],style=table.style,name=table.name;table.delete();
 const expanded=sheet.tables.add(`A5:${endCol}${last}`,true,name);expanded.style=style;expanded.showFilterButton=true;
 const nr=isUi?40:88;
 sheet.getRange(`A${nr}:${endCol}${last}`).format.font={name:'Arial',size:10,color:'#25324A'};
 sheet.getRange(`A${nr}:${endCol}${last}`).format.wrapText=true;
 sheet.getRange(`A${nr}:${endCol}${last}`).format.verticalAlignment='center';
 sheet.getRange(`${basisCol}5:${endCol}${last}`).format.font={name:'Arial',size:10,color:'#25324A'};
 sheet.getRange(`${basisCol}5:${endCol}${last}`).format.wrapText=true;
 sheet.getRange(`${basisCol}5:${endCol}${last}`).format.verticalAlignment='center';
 sheet.getRange(`${basisCol}1:${basisCol}${last}`).format.columnWidthPx=150;
 sheet.getRange(`${reviewCol}1:${reviewCol}${last}`).format.columnWidthPx=165;
 sheet.getRange(`${changeCol}1:${changeCol}${last}`).format.columnWidthPx=460;
 sheet.getRange(`${basisCol}5:${endCol}5`).format.fill='#213B62';
 sheet.getRange(`${basisCol}5:${endCol}5`).format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};
 sheet.getRange(`${basisCol}5:${endCol}5`).format.horizontalAlignment='center';
 for(const [letter,values] of [['D',['待选择','是','否']],['E',['是','否']],['F',['待确认','已确认']],['G',['未执行','通过','失败','受阻','依据待确认']]])sheet.getRange(`${letter}${nr}:${letter}${last}`).dataValidation={rule:{type:'list',values}};
 for(const range of [`D${nr}:H${last}`,`M${nr}:O${last}`,`${isUi?'U':'Q'}${nr}:${isUi?'V':'R'}${last}`])sheet.getRange(range).format.fill='#FFF4D6';
 for(const letter of ['G','I',basisCol]){
  const rg=sheet.getRange(`${letter}${nr}:${letter}${last}`);
  rg.conditionalFormats.add('containsText',{text:'失败',format:{fill:'#FDE7E9',font:{color:'#A3212E',bold:true}}});
  rg.conditionalFormats.add('containsText',{text:'待确认',format:{fill:'#FFF4CE',font:{color:'#8B5B00'}}});
 }
 write(sheet,'A4',`本轮为用例设计复核，全部未执行。按交付项选“是”；${basisCol}列综合本批依据与关联决策，未确认不计通过。每个适用分支都完成并留证后才能标整行通过。`);
}

// Extend existing metrics; report basis coverage separately from execution conformance.
const formulas=batch.getRange('A1:H111').formulas;
for(let r=0;r<formulas.length;r++)for(let c=0;c<formulas[r].length;c++){
 const f=formulas[r][c];if(!f)continue;
 const updated=f.replace(/('冒烟用例'![^,()+]*\$)87\b/g,`$1${smokeLast}`).replace(/('UI检查'![^,()+]*\$)39\b/g,`$1${uiLast}`);
 if(updated!==f)batch.getCell(r,c).formulas=[[updated]];
}
for(const [col,kind,basisColumn] of [['B','冒烟','V'],['H','专项回归','V'],['F',null,'AF']]){
 const sh=kind?'冒烟用例':'UI检查',last=kind?smokeLast:uiLast;
 const prefix=`'${sh}'!$D$6:$D$${last},"是"${kind?`,'${sh}'!$P$6:$P$${last},"${kind}"`:''}`;
 const confirmed=`COUNTIFS(${prefix},'${sh}'!$${basisColumn}$6:$${basisColumn}$${last},"已确认")`;
 const passed=`COUNTIFS(${prefix},'${sh}'!$I$6:$I$${last},"通过")`;
 batch.getRange(`${col}25`).formulas=[[`=COUNTIFS(${prefix})-${confirmed}`]];
 batch.getRange(`${col}29`).formulas=[[`=IF(${confirmed}=0,"无已确认项",${passed}/${confirmed})`]];
}
batch.getRange('F30').formulas=[['=COUNTIFS($H$40:$H$61,"待确认")+COUNTIFS($H$40:$H$61,"范围矛盾")+COUNTIFS($H$40:$H$61,"核心依据不可后置")+COUNTIFS($H$115:$H$117,"待确认")+COUNTIFS($H$115:$H$117,"范围矛盾")+COUNTIFS($H$115:$H$117,"核心依据不可后置")']];
batch.getRange('F31').formulas=[['=COUNTIFS($H$40:$H$61,"库内待选择")+COUNTIFS($H$115:$H$117,"库内待选择")']];
batch.getRange('H31').formulas=[['=COUNTIFS($H$40:$H$61,"已记录后置")+COUNTIFS($H$115:$H$117,"已记录后置")']];
write(batch,'E32','UI依据确认覆盖率');
batch.getRange('F32').formulas=[[`=IF(F20=0,"无适用项",COUNTIFS('UI检查'!$D$6:$D$${uiLast},"是",'UI检查'!$AF$6:$AF$${uiLast},"已确认")/F20)`]];
write(batch,'G32','已确认但未完成');
batch.getRange('H32').formulas=[[`=COUNTIFS('UI检查'!$D$6:$D$${uiLast},"是",'UI检查'!$AF$6:$AF$${uiLast},"已确认")-F22-F23`]];
batch.getRange('F32').setNumberFormat('0.0%');
batch.getRange('E32:H32').format.font={name:'Arial',size:10,color:'#25324A'};
batch.getRange('E32:H32').format.wrapText=true;
batch.getRange('E32:H32').format.verticalAlignment='center';
batch.getRange('A32:H32').format.rowHeightPx=65;
batch.getRange('A3:H3').merge();write(batch,'A3','2026-10-12 用例复核｜88功能检查＋40 UI检查；20条有效Review已映射；全部未执行');
write(batch,'H10','功能依有效需求正文；视觉依批准规范/专项稿。当前Review已修改1、修改中2、待确认17；来源处理状态不等于本批采纳或实测通过。');
write(batch,'H11','UI符合度按有效依据已确认项统计；同时报依据确认覆盖率F32及未完成H32。无已确认项不计算，不设统一像素相似度或默认通过阈值。');
write(batch,'F14','本次仅资料与用例复核，未访问业务环境；旧表所载2026-10-10航司页回到登录为历史观察。');
write(batch,'F16',new Date('2026-10-12T00:00:00Z'));batch.getRange('F16').setNumberFormat('yyyy-mm-dd');
write(batch,'B66','产品管理及数据映射V1.0评审稿；2026-10-12完整只读获取revision8340，按正文、删除线、评论与待确认项区别复核；沿用的引用调研/旧接口本轮未重读。');
write(batch,'B67','2026-10-12指定视图rev628，无筛选，21行完整读取（has_more=false）：20条有内容＋1空记录；20条均按record_id映射，原始来源字段保留UI检查X:AB。');
write(batch,'B68','通用规范V1.2，2026-10-12读取revision5256；另核12份内嵌表（字体、表格/对齐/行状态、间距、表单/双列/输入响应式、页头、语义/中性色、图标）。量值冲突见DEC10/18。');
write(batch,'B69','历史环境链接；2026-10-10曾回到登录。本轮未访问，无当前环境可用性或实测结论。');
write(batch,'B71','128检查点全部未执行；本轮完成资料、用例与检查表统计逻辑复核。执行前补批次/Build/交付映射/批准基线；外部模型、供应商接口和实际数据操作依本批授权。');
write(batch,'B73','当前20条Review：P0 7、P1 8、P2 5；已修改1、修改中2、待确认17。适配：直接复用14、组合复用2、调整后复用1、无法覆盖2、信息待明确1。1条空记录不计检查覆盖。');
write(batch,'B75','新增SM83—88六条基础配置具体检查；UI35—40六条页面承载/入口、AI状态、上传和规范量值检查；更新18条旧Review来源。复核明细见下方R01—R13。');
write(batch,'B77','保留DEC10/11/12/19/21/22，补DEC23新建页面、DEC24汇率生命周期、DEC25财务生效；DEC18补页头94px与4倍数说明冲突。本批纳入关联用例后才纳入待决范围。');
write(batch,'B79','关联用例设是后决策自动纳入；手填否显示范围矛盾；确认须方案/日期版本/证据。DEC01/02/03/23承载方案可记录后置，但须批准本批可测的现行方案、负责人、期限、影响和接受证据；核心规则不得后置。最终提测仍需人工评审。');
write(batch,'A83','本轮用例设计复核：27冒烟＋61专项＋40UI，全部未执行；补6功能/6UI与3项决策，更新20条Review映射。原有102条款组保留，新增12条具体映射。');
write(batch,'H105','按批准规范与现行方案逐项验收；范围UI01—40。金额/设备/容差/数值冲突DEC10/18，创建承载DEC23；高符合率不替代关键操作准入。');
write(batch,'B105','UI01—40');
write(batch,'A107','设计依据：主需求revision8340/评审稿、UI Review rev628、通用规范V1.2 revision5256；当前资料读取及用例复核日2026-10-12。');
write(batch,'A108','本轮完整读取主需求和规范正文，核20条有效Review及12份内嵌规格表；引用调研/规则标准化沿用原表证据，仍为参考或后续范围。未执行业务环境、模型/供应商接口或OMS实测。');
write(batch,'A109','本次分批范围由交付清单与B17确认；UI和产品持续调整，当前批准方案与后置目标须分别记录。数据正确、关键入口与保存闭环按本批Build验证。');
write(batch,'A110','普通视觉差异由团队决定是否带项，记录负责人/日期/影响/接受证据；错价、数据破坏、核心依据未定或关键操作不可达应先整改/确认。复核通过不等于测试通过。');

// Compact review notes in the existing first sheet, with no new tabs.
batch.getRange('A119:H119').merge();write(batch,'A119','本轮复核问题与处理');
for(const [i,row] of content.findings.entries()){
 const r=120+i;write(batch,`A${r}`,row[0]);batch.getRange(`B${r}:C${r}`).merge();write(batch,`B${r}`,row[1]);batch.getRange(`D${r}:H${r}`).merge();write(batch,`D${r}`,row[2]);
 batch.getRange(`A${r}:H${r}`).format.rowHeightPx=Math.max(75,Math.ceil(row[2].length/70)*18+24);
}
batch.getRange('A134:H134').merge();write(batch,'A134','分批冒烟建议｜仅选择本批交付及受影响链路，不是整库必测');
const picks=[
 ['通用入口','SM01—05；每个本批模块核身份/权限、入口、刷新与真实反馈。'],
 ['基础配置','SM09或SM10→SM11→SM12→SM14/15→SM18；具体字典按实际交付，主数据删除保护及边界用SM83—88专项。'],
 ['服务单元/组合','单元SM21→SM22/SM30；组合SM31→有效选用/成本链路，批量删除/角色/并发/算法用SM32—38/SM54等专项。'],
 ['成本价卡','SM21/SM23→SM40；仅已启用且报价时有效的批准价卡参与后续成本链路。字段/区间/动态分支按SM39/41/42专项。'],
 ['产品及试算','SM46→SM24→SM25→SM53；用批准131 CNY样例核费用账本、版本及缺卡/拒收/转人工/无燃油分支；参数/重量边界用SM51/52专项。'],
 ['AI/历史/导出','AI交付选SM27及UI16/37/38；OMS历史只在DEC21已决且接入证据可用时选SM59/SM26；导出选SM55专项核真实文件。'],
 ['UI走查','各模块按批准稿取适用UI；先关键入口/反馈/内容可达，再规范量值及普通视觉差异。两类指标F29/F32与失败/未完成同时报告。']
];
for(const [i,[label,text]] of picks.entries()){
 const r=135+i;write(batch,`A${r}`,label);batch.getRange(`B${r}:H${r}`).merge();write(batch,`B${r}`,text);batch.getRange(`A${r}:H${r}`).format.rowHeightPx=64;
}
batch.getRange('A113:H141').format.font={name:'Arial',size:10,color:'#25324A'};
batch.getRange('A113:H141').format.wrapText=true;
batch.getRange('A113:H141').format.verticalAlignment='center';
batch.getRange('A115:H117').format.rowHeightPx=145;
batch.getRange('D115:G117').format.fill='#FFF4D6';
for(const r of [113,119,134]){batch.getRange(`A${r}:H${r}`).format.fill='#213B62';batch.getRange(`A${r}:H${r}`).format.font={name:'Arial',size:12,bold:true,color:'#FFFFFF'};batch.getRange(`A${r}:H${r}`).format.rowHeightPx=38;}
batch.getRange('A114:H114').format.fill='#213B62';batch.getRange('A114:H114').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};batch.getRange('A114:H114').format.rowHeightPx=48;
batch.getRange('A3:H3').format.rowHeightPx=32;
batch.getRange('A57:H57').format.rowHeightPx=145;
for(const r of [67,68,73,75,77,79,83,107,108,109,110])batch.getRange(`A${r}:H${r}`).format.rowHeightPx=Math.max(65,batch.getRange(`A${r}`).format.rowHeightPx||65);

const trEntries=[...content.functional,...content.ui].map((e,i)=>[`TR${String(103+i).padStart(3,'0')}`,`${e.module}：${e.check}`,e.id,e.id.startsWith('SM')?'字段校验/状态/引用保护按J/K及U列分支证据':'按批准现行基线逐状态量值/交互；来源处理状态不代替实测','2026-10-12补充',e.basis,(e.decisions??[]).join('、')||'按本批交付及批准方案',e.id.startsWith('SM')?'https://example.invalid/source/662ffe8557':e.recordId?`https://example.invalid/source/c1614f6853${e.recordId}`:'https://example.invalid/source/05cc32fecc']);
trace.getRange('A108:H119').values=trEntries;
trace.getRange('A108:H119').format.font={name:'Arial',size:10,color:'#25324A'};
trace.getRange('A108:H119').format.wrapText=true;
trace.getRange('A108:H119').format.verticalAlignment='center';
trace.getRange('A108:H119').format.rowHeightPx=130;
write(trace,'A3','2026-10-12用例设计复核｜原102条款组保留，补12映射至114；设计覆盖不等于已执行，所有128检查点未执行。');
write(trace,'A4','新增TR103—114映射配置校验、20条Review补漏及AI/上传/量值检查。原有待决及引用边界继续保留；本表用于追溯，不驱动业务测试结论。');
const tt=trace.tables.items[0],ts=tt.style,tn=tt.name;tt.delete();const nt=trace.tables.add('A5:H119',true,tn);nt.style=ts;nt.showFilterButton=true;

// Fit only rows whose source text was refreshed or appended.
function fit(sheet,rows,endCol){
 for(const r of rows){
  const vals=sheet.getRange(`A${r}:${endCol}${r}`).values[0];
  const widths=vals.map((_,i)=>sheet.getCell(r-1,i).format.columnWidthPx||120);
  const lines=vals.map((v,i)=>String(v??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length*12/Math.max(45,widths[i]-18))),0));
  sheet.getRange(`A${r}:${endCol}${r}`).format.rowHeightPx=Math.max(150,...lines.map(n=>n*18+22));
 }
}
fit(smoke,Array.from({length:6},(_,i)=>88+i),'X');
fit(ui,[...Array.from({length:18},(_,i)=>6+i),...Array.from({length:6},(_,i)=>40+i)],'AH');

// Meaningful workflow verification uses disposable values, then restores every execution field.
const snapshot=[[batch,'B7:B17'],[batch,'D40:G61'],[batch,'D115:G117'],[ui,'D6:H45'],[ui,'M6:V45'],[smoke,'D6:H93'],[smoke,'M6:R93']].map(([s,r])=>({s,r,values:s.getRange(r).values}));
write(batch,'B8','SYNTHETIC-BUILD');write(batch,'B10','SYNTHETIC-REQ');write(batch,'B11','SYNTHETIC-UI');
for(let r=6;r<=uiLast;r++)write(ui,`D${r}`,'否');
write(ui,'D41','是');write(ui,'F41','已确认');
equal(ui,'AF41','待确认','A manually confirmed case cannot bypass an unresolved baseline decision');
equal(batch,'F32',0,'UI basis coverage stays zero while the linked baseline is unresolved');
equal(batch,'F29','无已确认项','No denominator when no UI basis is valid');
write(batch,'F57','已确认');write(batch,'G57','Synthetic approved baseline 2026-10-12');
equal(ui,'AF41','已确认','Documented baseline activates basis independently of execution');
equal(batch,'F32',1,'Basis coverage updates after the baseline decision');
equal(batch,'F29',0,'Unexecuted case does not count as UI pass');
write(ui,'H41','SYNTHETIC-BUILD');write(ui,'V41',value(batch,'B18'));write(ui,'U41','Synthetic delivery item');write(ui,'G41','通过');
equal(ui,'I41','缺少证据','Passing result requires evidence');
write(ui,'M41','Synthetic UI evidence');equal(ui,'I41','缺少执行人','Passing result requires executor');
write(ui,'O41','Synthetic tester');equal(ui,'I41','通过','Complete matching-version evidence is accepted');
equal(batch,'F29',1,'UI pass rate updates with valid evidence');
write(ui,'H41','OLD-BUILD');equal(ui,'I41','未执行','Old Build cannot remain a current pass');
write(ui,'H41','SYNTHETIC-BUILD');write(ui,'V41','OLD-BASELINE');equal(ui,'I41','基线已变，需复测','Old UI baseline invalidates the result');
write(ui,'V41',value(batch,'B18'));write(ui,'D40','是');write(ui,'F40','已确认');
equal(batch,'H115','待确认','New page decision is automatically selected by UI35');
equal(ui,'AF40','待确认','New page conflicts require adoption evidence');
write(batch,'F115','已确认');write(batch,'G115','   ');equal(ui,'AF40','待确认','Whitespace cannot act as approval evidence');
write(batch,'G115','Synthetic approved new-page decision');equal(ui,'AF40','已确认','New page gets a valid basis after approval');
write(batch,'D115','否');equal(batch,'H115','范围矛盾','Excluding a selected case decision is contradictory');
equal(ui,'AF40','待确认','Contradictory scope cannot count as valid basis');
for(let r=6;r<=smokeLast;r++)write(smoke,`D${r}`,'否');
write(smoke,'D90','是');write(smoke,'F90','已确认');
equal(smoke,'V90','待确认','FX config requires lifecycle and finance decisions');
for(const r of [116,117]){write(batch,`F${r}`,'已确认');write(batch,`G${r}`,'Synthetic approved configuration rule');}
equal(smoke,'V90','已确认','FX basis activates only after both decisions');
equal(batch,'H20',1,'Appended functional regression participates in metrics');
for(const {s,r,values} of snapshot)s.getRange(r).values=values;
for(const [s,ids] of [[smoke,smokeIds],[ui,uiIds]])for(const [id,r] of ids)assert.equal(value(s,`G${r}`),'未执行',`Restored ${id}`);
assert.deepEqual([...smokeIds.keys()].slice(0,82),original.smoke.map(r=>r[0]));
assert.deepEqual([...uiIds.keys()].slice(0,34),original.ui.map(r=>r[0]));
assert.equal(sourceRows.length,ui.getRange('AB6:AB45').values.filter(r=>r[0]).length);
for(const [s,old,last] of [[smoke,original.smoke,87],[ui,original.ui,39]])for(let i=0;i<old.length;i++){
 const r=i+6;for(const c of [3,4,5,6,7,12,13,14])assert.deepEqual(s.getCell(r-1,c).values[0][0],old[i][c],`Preserved execution input ${r}/${c}`);
}
workbook.recalculate();
equal(batch,'B22',0,'Final smoke has zero executed passes');equal(batch,'F22',0,'Final UI has zero executed passes');equal(batch,'H22',0,'Final regression has zero executed passes');
const inspected=await workbook.inspect({kind:'table',range:'本批提测!A19:H32',include:'values,formulas',tableMaxRows:14,tableMaxCols:8,maxChars:4500});
const errors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:1500,summary:'Final formula error scan'});
assert(!/"value":"#(?:REF|DIV|VALUE|NAME|N\/A|NUM|NULL|SPILL|CALC)/.test(errors.ndjson));
await fs.mkdir(out,{recursive:true});
const path=`${out}/SN318_提测前冒烟与UI规范_用例复核.xlsx`;
await (await SpreadsheetFile.exportXlsx(workbook)).save(path);
await fs.writeFile(`${base}/verification.json`,JSON.stringify({path,counts:{functional:88,smoke:27,regression:61,ui:40,review:20,blankReview:1,traceGroups:114,decisions:25},assertions,inspection:inspected.ndjson,formulaErrors:errors.ndjson,allExecutionResults:'未执行'},null,2),'utf8');
console.log(JSON.stringify({path,assertions:assertions.length,counts:{functional:88,smoke:27,regression:61,ui:40,review:20},errors:errors.ndjson}));
for(const [sheetName,range,name] of [['本批提测','A19:H35','summary'],['本批提测','A119:H124','review'],['冒烟用例','J88:L90','new-functional'],['UI检查','J40:L42','new-ui'],['UI检查','J43:L45','new-ui-spec'],['需求对照','A108:H111','trace']]){
 const b=await workbook.render({sheetName,range,scale:1.25,format:'png'});
 await fs.writeFile(`${base}/${name}.png`,new Uint8Array(await b.arrayBuffer()));
}
console.log('Export and preview files saved.');
process.exit(0);
