import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const work='./recipes/w2-week-20261012';
const data=JSON.parse(await fs.readFile(work+'/revision-data.json','utf8'));
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(data.source));
for(const name of ['W2任务','W2范围','W2用例','W2 Review'])wb.worksheets.add(name);
const changes=[];
const set=(sheet,address,value)=>{const s=wb.worksheets.getItem(sheet);changes.push({sheet,address,before:s.getRange(address).values,after:value});s.getRange(address).values=[[value]];};
const col=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
const review=new Map(data.reviews.map(x=>[x.record_id,x]));
const compact=v=>Array.isArray(v)?v.join('、'):(v??'');
const ui=wb.worksheets.getItem('UI检查'),walk=wb.worksheets.getItem('UI走查');

for(const old of data.baseline.ui){
 const r=Number(old.id.slice(2))+5;
 if(old.reviewId){
  const v=review.get(old.reviewId);assert(v);
  for(const [c,k] of [['P','优先级'],['Q','确认状态'],['R','框架适配判断'],['S','当前处理角色'],['X','Review 类型'],['Y','当前原型问题'],['Z','Review 建议'],['AA','后续处理建议']])set('UI检查',c+r,compact(v[k]));
  set('UI检查','L'+r,`REVIEW ${old.reviewId}；本轮2026-10-12实时读取rev680。源确认状态不等于本批采纳、实现或实测结果。原网站记录为历史局部观察；本周范围与当前证据见W2范围及W2任务。`);
  set('UI检查','AL'+r,`飞书直接映射：${old.reviewId}，rev680；原五色保留。功能case与W2工作包关联为本轮测试设计。`);
 }
}
set('UI检查','A4','正式界面交互验收库51条：23条有效Review＋28条规范/公共基准补充。UI50/51为本轮新增；执行记录保留，W2局部观察不自动计完整case通过。');
set('UI走查','A3','覆盖51条界面交互case（23条有效Review＋28条补充）。按页面实例、采用稿、Build留证；过程走查不等于原UI完整case通过。');
set('本批提测','H10','Review rev680：24条/23有效/1空，UI增至51条。W2 38项UI/开中3项局部观察、35项未取得入口；以W2任务/范围/用例为本周视图。');
set('本批提测','B66','产品管理及数据映射V1.0评审稿；本轮只读获取rev8345，正文规则与rev8340一致，新增c18/c19/c20未闭环评论；不是封板确认。');
set('本批提测','B67','UI Review rev680：24条＝23有效＋1空。新增UI50服务单元详情整页、UI51历史版本抽屉；UI18与UI50承载冲突待裁决。');
set('本批提测','B68','通用规范V1.2 rev5256、公共基准rev95本轮重读；表格规格与对齐内嵌表重读。数值冲突按原DEC确认；历史记录保留。');
set('本批提测','A197','本轮rev680有效Review23条一一对应：红3、白灰1、蓝4、黄1、绿14；28条补充独立。UI50/51新增；绿1空记录不生成case。PRD rev8345、规范rev5256、公共基准rev95实时核对。');
set('本批提测','A200','本周入口：W2任务、W2范围、W2用例、W2 Review。38项UI/开仍处设计与开发阶段；76条周用例为待执行计划，原91功能、16开发冒烟记录保留。');

const updateCase=(id,steps,expected,note)=>{
 const r=Number(id.slice(2))+5;set('UI检查','J'+r,steps);set('UI检查','K'+r,expected);set('UI检查','AC'+r,note);
 const wr=r+1;set('UI走查','F'+wr,steps);set('UI走查','G'+wr,expected);
};
updateCase('UI01','先确认本批采用review-67fb39add5专项设计。记录主数据/计价底座、导航分组与对象侧栏，核对一级Tab和内容区切换及当前列表新增入口。每个本批对象留证。','采纳稿明确主数据/计价底座一级Tab、子项内容切换、当前列表顶部新增。当前按钮分组与页头新增仍有设计差异，设计完毕不等于部署完成。','W2 50/51/56局部可核；source设计完毕保留，未设本批通过。');
updateCase('UI02','先取得至少两个一级分类及子菜单；跨分类选择验证自动收起，手动展开验证可并存，再核对选中路径。当前只有一个分类时记条件不足。','跨类子菜单选择收起此前其他分类；手动操作允许多分类展开；选中项和所属分类状态一致。','本轮仍仅系统配置/基础配置；一个分类不能验证跨类收起。');
updateCase('UI18','先裁决review-f828afea0f与review-331da30eb4的Drawer/整页冲突。采纳Drawer后在服务单元详情验证分组、滚动、固定区、图标和关闭后列表上下文。','若最终采纳Drawer则执行UI18并将UI50排除附依据；若采纳整页则执行UI50并排除UI18。版本抽屉另用UI51，Zone Drawer不代验。','补齐最新详情冲突；此处为待采纳条件，不同时要求两种承载通过。');
updateCase('UI35','先校准排期序号3的弹窗描述与最新Review整页建议并确认采用稿。取得服务单元新建入口，按标准组件组合布局检查字段分组、操作区、取消/保存和返回上下文。','按批准组合方案验收新建承载；主流程数据用SM21/29。缺稿/入口记录待确认，不以基础配置新增弹窗代验。','W2 UI/开用例需先确认新建承载变更。');
updateCase('UI42','等待全局行内编辑规范定稿并指定W2序号15明细行。检查进入编辑、修改、保存、取消、错误、失焦和键盘状态。','字段与数据保护按批准PRD，组件与失焦/键盘按定稿规范；全局Review修改中不计依据已确认；弹层编辑不能替代。','W2明细行操作绑定此case；规范仍修改中。');
for(const [id,note] of [['UI13','W2序号2服务单元批量适用；当前基础配置无勾选列，不强加批量。'],['UI14','W2序号2有选择能力后再测整行及固定列选中态；默认态局部观察不计整条通过。'],['UI22','本轮币种小数位、汇率倍率左对齐已复现；精度按PRD8345，排版按对齐内嵌表。'],['UI23','W2序号50搜索无匹配仍误显示暂无费用项数据；区分3类空态，是否删空由业务规则确认。'],['UI49','费用项编辑input缺少程序化标签关联已观察；按页面实例覆盖，局部问题不改原测试结果。']])set('UI检查','AC'+(Number(id.slice(2))+5),note);

// 新增2条来源用例，保留所有旧行与原正式执行字段。
const newCases=[
 {id:'UI50',rid:'review-331da30eb4',point:'详情整页与Drawer方案裁决',steps:'先裁决与UI18的详情承载冲突。若采纳独立页，从服务单元列表打开详情；核对只读分组、长内容滚动、返回入口及列表上下文。',expected:'仅采纳整页时此case适用；UI18排除并记录裁决。当前与历史视图分开；Zone或服务组合详情不代验。'},
 {id:'UI51',rid:'review-2a5a56bb27',point:'历史版本抽屉与视图返回',steps:'先确认服务单元历史版本在本批PRD纳入，取得有至少2版本的真实受控对象。打开历史列表抽屉，选择一个版本、浏览分组快照、顶部返回历史列表，再切另一版本并关闭。',expected:'采用业务抽屉模板，在抽屉内切换列表/详情；顶部返回可达，历史快照只读且版本不串位；服务组合版本不自动使用本稿。'}
];
const pageNote=walk.getRange('A57').values[0][0];
walk.unmergeCells('A57:Q57');
set('UI走查','A114',String(pageNote).replace('49条','51条').replace('49个页面','51个页面'));
walk.mergeCells('A114:Q114');walk.getRange('A114:Q114').format.wrapText=true;walk.getRange('A114:Q114').format.rowHeight=55;
for(const [i,c] of newCases.entries()){
 const r=55+i,wr=56+i,v=review.get(c.rid);
 const row=ui.getRange('A40:AM40').values[0].map(x=>x??null);
 row[0]=c.id;row[1]='服务单元';row[2]=c.point;row[3]='待选择';row[4]='否';row[5]='待确认';row[6]='未执行';row[7]=null;row[8]=null;
 row[9]=c.steps;row[10]=c.expected;row[11]=`Review ${c.rid} rev680；规范rev5256；按本批采纳确认。`;
 row[12]=row[13]=row[14]=null;row[15]=compact(v['优先级']);row[16]=compact(v['确认状态']);row[17]=compact(v['框架适配判断']);row[18]=compact(v['当前处理角色']);
 row[19]='界面交互';row[20]=row[21]=null;row[22]='Review＋采纳稿';row[23]=compact(v['Review 类型']);row[24]=v['当前原型问题'];row[25]=v['Review 建议'];row[26]=v['后续处理建议']??null;row[27]=c.rid;
 row[28]='本轮补齐rev680遗漏的有效蓝色来源；未执行。';row[29]=c.steps;row[30]='角色、Build、对象与版本ID、采纳稿和操作前后截图';row[31]='待确认';row[32]='已修订，待执行';row[33]='本周先做来源/设计采纳评审，入口取得后按页面实例执行。';row[34]=c.expected;row[35]='SM82（只读详情局部）';row[36]='封板PRD、批准组合稿；UI50需要详情裁决';row[37]=`飞书直接映射${c.rid} rev680；蓝色。`;row[38]='仅来源指定服务单元视图，规则测试沿用相关SM。';
 ui.getRange(`A${r}:AM${r}`).copyFrom(ui.getRange('A40:AM40'),'all');ui.getRange(`A${r}:AM${r}`).values=[row];
 const formula=ui.getRange('I54').formulas[0][0].replace(/([A-Z]+)54\b/g,`$1${r}`).replace(/('UI走查'![A-Z]+)55\b/g,`$1${wr}`);
 ui.getRange('I'+r).formulas=[[formula]];
 const walkRow=walk.getRange('A41:Y41').values[0].map(x=>x??null);
 Object.assign(walkRow,{0:c.id,1:'服务单元',2:c.point,3:'组合复用',4:'确认本批采用的标准组件组合稿；来源状态不等于实测。',5:c.steps,6:c.expected,7:'待选择',8:'未走查'});
 for(let j=9;j<25;j++)walkRow[j]=null;walkRow[20]='未核定';
 walk.getRange(`A${wr}:Y${wr}`).copyFrom(walk.getRange('A41:Y41'),'all');walk.getRange(`A${wr}:Y${wr}`).values=[walkRow];
 for(const c2 of ['S','T','V','W','X','Y']){
  const f=walk.getRange(c2+'55').formulas[0][0];if(f)walk.getRange(c2+wr).formulas=[[f.replace(/([A-Z]+)55\b/g,`$1${wr}`).replace(/('UI检查'![A-Z]+)54\b/g,`$1${r}`)]];
 }
}
for(const [s,name,address] of [[ui,'UiCases','A5:AM56'],[walk,'UIWalkthrough','A6:Y57']]){
 const t=s.tables.items.find(x=>x.name===name);assert(t);const style=t.style;t.delete();s.tables.add(address,true,name).style=style;
}
ui.getRange('D55:D56').dataValidation={rule:{type:'list',values:['待选择','是','否']}};
ui.getRange('E55:E56').dataValidation={rule:{type:'list',values:['待选择','是','否']}};
ui.getRange('F55:F56').dataValidation={rule:{type:'list',values:['待确认','已确认','不适用']}};
ui.getRange('G55:G56').dataValidation={rule:{type:'list',values:['未执行','通过','失败','受阻','依据待确认']}};
ui.getRange('AF55:AF56').dataValidation={rule:{type:'list',values:['待确认','已确认','不适用']}};
walk.getRange('H56:H57').dataValidation={rule:{type:'list',values:['待选择','是','否']}};
walk.getRange('U56:U57').dataValidation={rule:{type:'list',values:['未核定','已核定']}};
// 扩展直接引用UI明细终点的汇总，不改其他业务逻辑。
for(const name of data.baseline.sheets){
 const s=wb.worksheets.getItem(name),used=s.getUsedRange();
 const matrix=used.formulas;
 for(let r=0;r<matrix.length;r++)for(let c=0;c<matrix[r].length;c++){
  let f=matrix[r][c];if(!f)continue;const before=f;
  f=f.replace(/('UI检查'!\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?)54\b/g,(_,p)=>p+'56').replace(/('UI走查'!\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?)55\b/g,(_,p)=>p+'57');
  if(name==='UI走查'&&r<6)f=f.replace(/(:\$?[A-Z]+\$?)55\b/g,(_,p)=>p+'57');
  if(f!==before){changes.push({sheet:name,address:col(c+1)+(r+1),beforeFormula:before,afterFormula:f});s.getCell(r,c).formulas=[[f]];}
 }
}

const palette={ink:'#243247',header:'#244D79',input:'#FFF3D6',muted:'#53687D'};
function tableSheet(name,title,headers,rows,widths){
 const s=wb.worksheets.getItem(name);s.showGridLines=false;
 const last=col(headers.length),end=rows.length+5;
 s.getRange(`A1:${last}${end}`).format={font:{name:'Microsoft YaHei',size:10,color:palette.ink},verticalAlignment:'top'};
 s.getRange('A2').values=[[title]];s.getRange('A2').format.font={name:'Microsoft YaHei',size:15,bold:true,color:palette.ink};
 s.getRange(`A2:${last}2`).format.rowHeight=28;
 s.getRange(`A5:${last}5`).values=[headers];s.getRange(`A6:${last}${end}`).values=rows;
 const names={'W2任务':'W2Tasks','W2范围':'W2Scope','W2用例':'W2Cases','W2 Review':'W2Review'};
 const t=s.tables.add(`A5:${last}${end}`,true,names[name]);t.style='TableStyleMedium2';
 s.getRange(`A5:${last}5`).format={fill:palette.header,font:{name:'Microsoft YaHei',size:10,color:'#FFFFFF',bold:true},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:35,borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};
 s.getRange(`A6:${last}${end}`).format.wrapText=true;
 for(let c=0;c<headers.length;c++)s.getRange(`${col(c+1)}1:${col(c+1)}${end}`).format.columnWidth=widths[c];
 for(let i=0;i<rows.length;i++){
  const lines=Math.max(...rows[i].map((v,c)=>String(v??'').split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil([...line].reduce((n,x)=>n+(x.charCodeAt(0)>255?1.85:1),0)/Math.max(8,widths[c]-2))),0)));
  s.getRange(`A${i+6}:${last}${i+6}`).format.rowHeight=Math.max(48,lines*14+12);
 }
 s.freezePanes.freezeRows(5);s.freezePanes.freezeColumns(2);return s;
}
const task=tableSheet('W2任务','W2 本周任务 2026-10-12至10-16',['任务','建议安排','要完成的事','工作包','承接人员（源排期/建议角色）','具体行动','交付物','当前依赖','任务状态'],data.tasks,[10,22,30,45,39,80,51,50,17]);
task.tabColor=palette.header;
task.getRange('I6:I14').dataValidation={rule:{type:'list',values:['未开始','处理中','已完成','受阻']}};task.getRange('I6:I14').format.fill=palette.input;
task.getRange('A4:H4').values=[['W2工作包',null,'局部已观察',null,'待入口',null,'待执行周用例',null]];
task.getRange('B4').formulas=[['=COUNTA(\'W2范围\'!A6:A43)']];task.getRange('D4').formulas=[['=COUNTIFS(\'W2范围\'!I6:I43,"部分已观察")']];task.getRange('F4').formulas=[['=COUNTIFS(\'W2范围\'!I6:I43,"待页面入口")']];task.getRange('H4').formulas=[['=COUNTIFS(\'W2用例\'!L6:L81,"未执行")']];
task.getRange('A16').values=[['本轮结果与待闭环事项']];task.getRange('A16').format.font.bold=true;
task.getRange('A17:J17').values=[['编号','性质','工作包','问题/事项','当前证据','修改或确认目标','依据/case','建议处理人','处理状态','截图']];
task.getRange('A18:J24').values=data.issues;task.tables.add('A17:J24',true,'W2IssuesTable').style='TableStyleMedium2';
task.getRange('A17:J24').format.wrapText=true;task.getRange('A17:J17').format={fill:palette.header,font:{name:'Microsoft YaHei',size:10,color:'#FFFFFF',bold:true},horizontalAlignment:'center',rowHeight:35};
task.getRange('A18:J24').format={font:{name:'Microsoft YaHei',size:10,color:palette.ink},verticalAlignment:'top',wrapText:true};
task.getRange('J1:J24').format.columnWidth=40;
task.getRange('A18:J24').format.rowHeight=100;task.getRange('I18:I24').dataValidation={rule:{type:'list',values:['未开始','待确认','处理中','已完成','受阻']}};task.getRange('I18:I24').format.fill=palette.input;
task.getRange('A27:D27').values=[['资料','来源链接','本轮版本/范围','使用边界']];task.getRange('A28:D34').values=data.sources;
task.tables.add('A27:D34',true,'W2SourcesTable').style='TableStyleMedium2';task.getRange('A27:D34').format.wrapText=true;task.getRange('A28:D34').format.rowHeight=115;task.getRange('A27:D27').format={fill:palette.header,font:{color:'#FFFFFF',bold:true},rowHeight:30};
task.getRange('A28:D34').format={font:{name:'Microsoft YaHei',size:10,color:palette.ink},verticalAlignment:'top',wrapText:true};
// 将来源区域分配足够宽度，表头/链接均按原四列逐行可读。
task.getRange('B28:B34').format.font.size=9;

const scope=tableSheet('W2范围','W2 38个UI/开工作包',['排期序号','源行号','一级目录','二级目录','工作包','源优先级','W2状态','原来源','当前覆盖','本轮观察边界','原功能case（设计关联）','原UI case（设计关联）','开发冒烟参考','纳入/执行前置','产品','开发','测试','本周用例ID','排期原备注'],data.scopeRows,[12,11,22,26,43,14,13,23,19,62,39,44,36,78,18,18,18,26,64]);
scope.getRange('I6:I43').conditionalFormats.addCustom('I6="待页面入口"',{fill:'#FFF0CF',font:{color:'#805C22'}});
const cases=tableSheet('W2用例','W2 76条页面用例与开发冒烟',['用例ID','排期序号','工作包','本周测试层次','源优先级','原case关联','执行前置','步骤与测试数据','预期结果','依据','建议执行人','执行结果','执行Build','实际证据/问题','执行人','本轮观察（非结果）'],data.cases,[17,12,39,22,14,50,81,85,84,65,19,17,22,48,20,72]);
cases.getRange('L6:O81').format.fill=palette.input;cases.getRange('L6:L81').dataValidation={rule:{type:'list',values:['未执行','通过','失败','受阻','依据待确认','不适用']}};
cases.getRange('A3').values=[['先填Build、采用依据和受控数据；本周新增用例与原完整case分开。']];
const reviewSheet=tableSheet('W2 Review','UI Review rev680 全部24条原记录',['record_id','对应UI case','源模块','源五色','源确认状态','原型问题原文','Review建议原文','后续建议原文','源处理角色','使用边界'],data.reviewRows,[31,21,26,29,20,80,102,70,25,59]);
const colors={'🔴':'#FDE6E8','🔵':'#DFEFF9','🟡':'#FFF3C5','🟢':'#DBFCE8','⚪':'#F1F3F5'};
for(let i=0;i<data.reviewRows.length;i++)for(const [key,fill] of Object.entries(colors))if(data.reviewRows[i][3].startsWith(key))reviewSheet.getRange(`A${i+6}:J${i+6}`).format.fill=fill;

// 留存7张本轮证据；前一次审查截图保留在原交付物，无重复打包。
task.getRange('A37').values=[['本轮PCS证据 1280×800，部署Build待提供']];task.getRange('A37').format.font.bold=true;
const evidence=[['pcs-list.jpg','费用项列表与当前导航'],['pcs-empty.jpg','筛选无匹配结果空态'],['pcs-form.jpg','费用项编辑表单'],['pcs-cancel-readback.jpg','取消后重开名称恢复运费'],['pcs-currency.jpg','币种小数位与操作列'],['pcs-rate.jpg','汇率倍率与操作列'],['pcs-cargo.jpg','货物类型字典样本']];
let imageRow=39;
for(const [filename,title] of evidence){
 task.getRange('A'+imageRow).values=[[filename+'：'+title]];
 const bytes=await fs.readFile(work+'/'+filename);
 task.images.add({dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64'),anchor:{from:{row:imageRow,col:0},extent:{widthPx:960,heightPx:600}}});
 task.getRange(`A${imageRow+1}:J${imageRow+31}`).format.rowHeight=16;
 imageRow+=34;
}
for(const s of [task,scope,cases,reviewSheet])s.getUsedRange().format.font.name='Microsoft YaHei';
wb.recalculate();
const tally=()=>['B4','D4','F4','H4'].map(a=>task.getRange(a).values[0][0]);
assert.deepEqual(tally(),[38,3,35,76]);
cases.getRange('L6').values=[['受阻']];wb.recalculate();assert.equal(tally()[3],75);
cases.getRange('L6').values=[['未执行']];
const cover=scope.getRange('I6').values[0][0];scope.getRange('I6').values=[['部分已观察']];wb.recalculate();assert.deepEqual(tally().slice(0,3),[38,4,34]);
scope.getRange('I6').values=[[cover]];
ui.getRange('D55').values=[['是']];wb.recalculate();assert.equal(ui.getRange('I55').values[0][0],'依据待确认');
ui.getRange('D55').values=[['待选择']];wb.recalculate();assert.deepEqual(tally(),[38,3,35,76]);
await fs.writeFile(work+'/recalculation-check.json',JSON.stringify({summary:[38,3,35,76],resultChangeUpdatedCount:true,coverageChangeUpdatedCounts:true,newUiMissingBasisBlocked:true,temporaryInputsRestored:true}));
await fs.writeFile(work+'/changes.json',JSON.stringify(changes,null,2));
await fs.writeFile(work+'/final-inspection.ndjson',(await wb.inspect({kind:'table',range:'W2任务!A4:H4',include:'values,formulas',tableMaxRows:1,tableMaxCols:8,maxChars:2500})).ndjson);
const scan=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:50},maxChars:5000});
await fs.writeFile(work+'/formula-scan.ndjson',scan.ndjson);
await fs.mkdir(data.out,{recursive:true});
const filename=data.out+'/SN318_W2测试用例修订与本周任务.xlsx';
await (await SpreadsheetFile.exportXlsx(wb)).save(filename);
console.log(JSON.stringify({output:filename,changes:changes.length,weeklyCases:data.cases.length,ui:51}));
for(const [sheetName,range,id] of [['W2任务','A4:I10','tasks'],['W2任务','A17:J21','issues'],['W2范围','A5:I10','scope'],['W2范围','J33:N37','scope-detail'],['W2用例','A5:F11','case-index'],['W2用例','G6:J7','case-detail'],['W2 Review','A5:E13','review'],['UI检查','A55:C56','new-ui'],['UI检查','J23:K23','ui18'],['W2任务','A27:D31','sources']]){
 const b=await wb.render({sheetName,range,scale:1.3,format:'png'});await fs.writeFile(work+'/preview-'+id+'.png',new Uint8Array(await b.arrayBuffer()));
}
console.log('rendered');
process.exit(0);
