import fs from 'node:fs/promises';
import path from 'node:path';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';
const work='./recipes/ui-spec-audit-20261012';
const out='./artifacts/frontend-audit/ui-spec-audit';
const data=JSON.parse(await fs.readFile(path.join(work,'audit-data.json'),'utf8'));
const wb=Workbook.create();
const sheets={};
for(const n of ['审查概览','修改清单','Review对照','规范检查','证据索引','截图对照'])sheets[n]=wb.worksheets.add(n);
const color={navy:'#1A2130',blue:'#046EFC',light:'#EBF3FD',line:'#EBEBEB',body:'#4B5564',orange:'#FFF7E6',input:'#E6F2FF'};
const col=(i)=>{let s='';for(let n=i+1;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
function setup(s,widths,rows){
  s.showGridLines=false;s.tabColor=color.blue;
  const used=s.getRange(`A1:${col(widths.length-1)}${rows}`);
  used.format.font={name:'Microsoft YaHei',size:10,color:color.body};
  used.format.wrapText=true;used.format.verticalAlignment='top';
  widths.forEach((w,i)=>s.getRange(`${col(i)}1:${col(i)}${rows}`).format.columnWidthPx=w);
  used.format.rowHeightPx=28;
}
function band(s,address,text,bg=color.navy,size=16){
  s.mergeCells(address);const r=s.getRange(address);r.values=[[text]];
  r.format={fill:bg,font:{name:'Microsoft YaHei',size,bold:true,color:'#FFFFFF'},verticalAlignment:'center',wrapText:true};
}
function table(s,headers,rows,widths,name,height=135){
  setup(s,widths,rows.length+7);
  band(s,'A1:F2',name);
  s.getRange('A4').values=[['可筛选；冻结标识列。审查结论、原始状态和执行结果分别记录。']];
  s.mergeCells('A4:F4');s.getRange('A4:F4').format.rowHeightPx=52;
  s.getRange(`A6:${col(headers.length-1)}6`).values=[headers];
  s.getRange(`A6:${col(headers.length-1)}6`).format={fill:color.blue,font:{bold:true,color:'#FFFFFF',size:10},wrapText:true,verticalAlignment:'center',rowHeightPx:42};
  const r=s.getRange(`A7:${col(headers.length-1)}${rows.length+6}`);r.values=rows;r.format.rowHeightPx=height;r.format.fill='#FFFFFF';
  r.format.borders={insideHorizontal:{style:'thin',color:color.line}};
  rows.forEach((_,i)=>{if(i%2===1)s.getRange(`A${i+7}:${col(headers.length-1)}${i+7}`).format.fill='#F7F9FC';});
  s.tables.add(`A6:${col(headers.length-1)}${rows.length+6}`,true,name);
  s.freezePanes.freezeRows(6);s.freezePanes.freezeColumns(3);
}
const summary=sheets['审查概览'];
setup(summary,Array(12).fill(90),36);
band(summary,'A1:L2','SN318 前端 UI 规范审查与修改清单');
summary.mergeCells('A3:L3');summary.getRange('A3').values=[['2026-10-12 ｜ Review revision 680 ｜ 通用设计规范 V1.2 revision 5256']];
summary.getRange('A3:L3').format.rowHeightPx=34;
const stats=[['A5:C5','A6:C7','修改项总数',"=COUNTA('修改清单'!A7:A36)"],['D5:F5','D6:F7','建议 P0',"=COUNTIF('修改清单'!B7:B36,\"P0\")"],['G5:I5','G6:I7','待复测',"=COUNTIF('修改清单'!P7:P36,\"未执行\")"],['J5:L5','J6:L7','截图证据',"=COUNTA('证据索引'!A7:A54)"]];
for(const [labelRange,numRange,label,formula]of stats){
  summary.mergeCells(labelRange);summary.getRange(labelRange).values=[[label]];summary.getRange(labelRange).format={fill:color.light,font:{size:11,color:color.navy},horizontalAlignment:'center'};
  summary.mergeCells(numRange);summary.getRange(numRange.split(':')[0]).formulas=[[formula]];summary.getRange(numRange).format={fill:color.light,font:{size:25,bold:true,color:color.blue},horizontalAlignment:'center',verticalAlignment:'center'};
}
summary.mergeCells('A9:L10');summary.getRange('A9').values=[['结论：30项可分派修改，覆盖23条非空 Review；1条空白占位原样保留。28个规范检查维度。主清单建议 P0/P1/P2 为7/15/8，原始优先级保存在 Review 对照。']];summary.getRange('A9:L10').format.rowHeightPx=32;
band(summary,'A12:L12','需先澄清的实施决策',color.blue,12);
const decisions=[
 ['RV07 / RV22','详情承载冲突','独立页与右侧 Drawer 冲突。产品/UI确认唯一方案或明确两种入口职责，关联 UI07。'],
 ['RV03','行内编辑缺少专项定义','Review建议和当前问题未填写；UI先补齐规范后实施，关联 UI03。'],
 ['N07 / Core','Drawer 圆角边界','规范基础16px与Core“直角贴边”注释需澄清，先测实际样式，关联 UI28。'],
 ['N10','页头94px表述','94px与“全部为4的倍数”冲突；当前保留已列明94px，UI确认文字或统一迁移，关联 UI29。']
];
for(let i=0;i<decisions.length;i++){
  const row=14+i*2;summary.mergeCells(`A${row}:B${row+1}`);summary.getRange(`A${row}`).values=[[decisions[i][0]]];summary.mergeCells(`C${row}:E${row+1}`);summary.getRange(`C${row}`).values=[[decisions[i][1]]];summary.mergeCells(`F${row}:L${row+1}`);summary.getRange(`F${row}`).values=[[decisions[i][2]]];summary.getRange(`A${row}:L${row+1}`).format.fill=color.orange;
}
band(summary,'A23:L23','审查依据与使用边界',color.blue,12);
const notes=[
 '来源：'+data.reviewUrl,
 '规范：'+data.normUrl,
 'Review快照读取：'+data.reviewFetchedAt+'；汇总生成：'+data.created+'；24条源记录，视图无筛选；22个相关规范表格 A1:J60 及完整 Tabs 正文。',
 '源码 main / '+data.commit+'。Vue仓库以模板/演示为主；未找到测试环境基础配置业务实现。代码位置可能是复用入口，不代表业务已存在。',
 '证据：42张飞书Review附件；6张本会话线上/本地走查。附件可能为设计/历史原型截图，均保留来源类型。未读取蓝湖稿。',
 '本地 SPA 与 BFF 构建成功；真实登录、完整接口、全部业务路由与移动端运行测试未完成。生产预览使用回环HTTP解决自签证书访问，未改生产认证配置。',
 '颜色是框架适配判断；设计完毕是设计状态，不是实现验收通过。规范检查中的“Core具备”只表示可复用能力。',
 '使用：修改清单 N-Q 列为执行填写区；负责人、开发状态、复测结果、版本需实际执行后更新。当前全部“待安排 / 未执行”。',
 '输出为只读审查与修改清单；未修改业务源码，未写回飞书。HTML报告可按优先级筛选并查看全部截图原图。'
];
notes.forEach((v,i)=>{const row=25+i;summary.mergeCells(`A${row}:L${row}`);summary.getRange(`A${row}`).values=[[v]];summary.getRange(`A${row}:L${row}`).format.rowHeightPx=i===0||i===1?36:48;});
summary.freezePanes.freezeRows(3);

const main=sheets['修改清单'];
const mainRows=data.actions.map(a=>[a.id,a.priority,a.module,a.verdict,a.observed,a.target,a.retest,a.review,a.norm,a.location,a.roles,a.decision,a.evidence,a.owner,a.status,a.result,a.version]);
table(main,['编号','建议优先级','页面 / 模块','审查结论','观察与证据边界','具体修改要求','复测验收步骤','Review引用','规范依据','代码位置 / 页面入口','建议承接角色','前置条件 / 决策','截图证据ID','负责人（填写）','开发状态（填写）','复测结果（填写）','版本 / 日期（填写）'],mainRows,[60,82,140,140,310,360,340,125,210,340,130,270,130,120,130,130,140],'UIChanges',112);
main.getRange('A1').values=[['前端 UI 修改清单｜30项']];main.getRange('A4').values=[['建议优先级可筛选；原始优先级见Review对照。浅蓝 N-Q 为执行字段；状态需实际实施与复测后更新。']];
main.getRange('N7:Q36').format.fill=color.input;
main.getRange('O7:O36').dataValidation={rule:{type:'list',values:['待安排','待决策','开发中','待复测','完成','暂缓']}};
main.getRange('P7:P36').dataValidation={rule:{type:'list',values:['未执行','通过','不通过','受阻','不适用']}};
for(const [text,fill,font]of [['P0','#FDECEC','#B42318'],['P1','#FFF7E6','#995000'],['P2','#EBF3FD','#035ED4']])main.getRange('B7:B36').conditionalFormats.add('containsText',{text,format:{fill,font:{color:font,bold:true}}});

const review=sheets['Review对照'];
const reviewRows=data.review.map(r=>{const f=r.fields;return [r.ref,f.record_id,f['页面/模块'],f['优先级'],f['框架适配判断'],f['确认状态'],f['当前处理角色'],f['Review 类型'],f['当前原型问题'],f['Review 建议'],f['后续处理建议'],f['备注'],r.actions,r.evidence];});
table(review,['Review编号','record_id','原页面 / 模块','原优先级','原框架适配判断','原确认状态','原处理角色','原Review类型','原当前原型问题','原Review建议','原后续处理建议','原备注','修改项映射','截图证据ID'],reviewRows,[72,170,135,88,135,100,110,120,310,400,220,230,150,140],'ReviewSource',150);
review.getRange('A1').values=[['Review 原始记录对照｜revision 680']];review.getRange('A4').values=[['24条原始记录；RV24为空白占位，不生成修改项。保留原文本、优先级、角色与状态；@提及仅保留人名文本，不发送通知。']];
// More text is retained than can fit in compact rows; use adequate explicit heights.
for(let i=0;i<reviewRows.length;i++){
  const lineCount=(text,width)=>String(text??'').split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil([...line].reduce((n,ch)=>n+(ch.charCodeAt(0)>255?1:0.6),0)/(width/14-2))),0);
  const heights=reviewRows[i].map((x,j)=>lineCount(x,[72,170,135,88,135,100,110,120,310,400,220,230,150,140][j])*18+20);
  review.getRange(`A${i+7}:N${i+7}`).format.rowHeightPx=Math.max(150,Math.ceil(Math.max(...heights)*1.35+30));
}

const checks=sheets['规范检查'];
table(checks,['检查编号','规范维度','规范引用','规范要求（摘录）','适用范围','本次核对结论','关联修改项','检查方式'],data.checks.map(x=>[x.id,x.topic,x.norm,x.spec,x.scope,x.verdict,x.related,x.method]),[72,160,170,390,175,200,150,320],'SpecChecks',112);
checks.getRange('A1').values=[['UI 规范检查矩阵｜28个维度']];checks.getRange('A4').values=[['以 V1.2 revision 5256 为准。未运行的检查不标通过；规范例外/矛盾先列决策，不擅自更改共享组件或数值契约。']];

const evidence=sheets['证据索引'];
table(evidence,['证据ID','Review引用','证据类型','模块 / 上下文','本地原图相对路径','图像尺寸','SHA-256','源record_id'],data.evidence.map(e=>[e.id,e.reviewRef,e.kind,e.module,e.relativePath,`${e.width} × ${e.height}`,e.sha256,e.recordId||'本会话走查']),[72,140,185,170,350,130,310,175],'EvidenceIndex',62);
evidence.getRange('A1').values=[['截图证据索引｜48张原图']];evidence.getRange('A4').values=[['所有原图位于工作簿同目录 evidence 文件夹；HTML报告可点击原图。SHA-256用于核对证据文件，附件截图不等于最新部署画面。']];

const gallery=sheets['截图对照'];setup(gallery,Array(12).fill(90),122);
band(gallery,'A1:L2','关键截图对照｜原型、设计与本会话复现');
gallery.mergeCells('A4:L4');gallery.getRange('A4').values=[['保留图片比例；展示8张关键截图。完整48张见证据索引及HTML报告，不以设计稿替代实现验收。']];
const chosen=[data.evidence.find(e=>e.reviewRef==='RV02'&&e.kind==='原型截图'),data.evidence.find(e=>e.reviewRef==='RV02'&&e.kind==='规范或设计稿'),data.evidence.find(e=>e.id==='EV47'),data.evidence.find(e=>e.reviewRef==='RV05'&&e.kind==='规范或设计稿'),data.evidence.find(e=>e.id==='EV48'),data.evidence.find(e=>e.reviewRef==='RV22'&&e.kind==='规范或设计稿'),data.evidence.find(e=>e.id==='EV43'),data.evidence.find(e=>e.id==='EV44')];
for(let i=0;i<chosen.length;i++){
  const e=chosen[i];if(!e)throw Error(`Missing screenshot ${i}`);
  const r=6+Math.floor(i/2)*29,c=(i%2)*6;
  const title=`${e.id} · ${e.reviewRef} · ${e.kind}`;
  gallery.mergeCells(`${col(c)}${r}:${col(c+5)}${r+1}`);gallery.getRange(`${col(c)}${r}`).values=[[title]];gallery.getRange(`${col(c)}${r}:${col(c+5)}${r+1}`).format={fill:color.light,font:{bold:true,color:color.navy},verticalAlignment:'center',wrapText:true};
  const scale=Math.min(520/e.width,645/e.height);
  const bytes=await fs.readFile(e.path);
  const mime=e.path.endsWith('.png')?'image/png':'image/jpeg';
  gallery.images.add({dataUrl:`data:${mime};base64,${bytes.toString('base64')}`,anchor:{from:{row:r+1,col:c},extent:{widthPx:Math.round(e.width*scale),heightPx:Math.round(e.height*scale)}}});
  gallery.mergeCells(`${col(c)}${r+26}:${col(c+5)}${r+27}`);gallery.getRange(`${col(c)}${r+26}`).values=[[e.relativePath]];gallery.getRange(`${col(c)}${r+26}:${col(c+5)}${r+27}`).format.font={size:9,color:color.body};
}
gallery.freezePanes.freezeRows(4);
wb.recalculate();
const inspected=await wb.inspect({kind:'region',sheetId:summary.name,range:'A5:L10',maxChars:3000,tableMaxRows:8,tableMaxCols:12});
await fs.writeFile(path.join(work,'workbook-inspect.json'),JSON.stringify(inspected,null,2));
const exported=await SpreadsheetFile.exportXlsx(wb);
await exported.save(path.join(out,'SN318_前端UI规范审查与修改清单.xlsx'));
console.log(JSON.stringify({exported:true,sheets:6,actions:data.actions.length,review:data.review.length,checks:data.checks.length,evidence:data.evidence.length,images:chosen.length}));
// Optional bounded previews, using the render range documented by artifact_tool help.
if(process.argv.includes('--render')){
  await fs.mkdir(path.join(work,'previews'),{recursive:true});
  const previews=[['审查概览','A1:L21'],['修改清单','A1:F10'],['修改清单','F25:L29'],['Review对照','A1:H11'],['Review对照','I7:N10'],['规范检查','A1:F12'],['证据索引','A1:F12'],['截图对照','A1:L34']];
  for(let i=0;i<previews.length;i++){
    const [sheetName,range]=previews[i];
    const img=await wb.render({sheetName,range,scale:1,format:'png'});
    await fs.writeFile(path.join(work,'previews',`sheet-${i+1}.png`),new Uint8Array(await img.arrayBuffer()));
    console.log(`preview ${i+1} ${sheetName} ${range}`);
  }
}
