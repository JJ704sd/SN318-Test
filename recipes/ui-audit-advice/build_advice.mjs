import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const work = './recipes/ui-audit-advice';
const out = './artifacts/ui-audit';
const data = JSON.parse(await fs.readFile(`${work}/advice-data.json`, 'utf8'));
const wb = Workbook.create();
const names = ['UI测试建议','补充交互case','修改清单','走查口径'];
for (const name of names) wb.worksheets.add(name);
const palette = {ink:'#243247', header:'#274B73', line:'#D8E1EB', amber:'#FFF3D6', muted:'#58697B'};
const colName = n => {let s=''; while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};

function grid(name, title, note, headers, rows, widths, tableName) {
  const s = wb.worksheets.getItem(name);
  const end = rows.length + 5;
  const last = colName(headers.length);
  s.showGridLines = false;
  s.getRange(`A1:${last}${end}`).format.font = {name:'Microsoft YaHei',size:10,color:palette.ink};
  s.getRange(`A1:${last}${end}`).format.verticalAlignment = 'top';
  s.getRange('A2').values = [[title]];
  s.getRange('A2').format.font = {name:'Microsoft YaHei',size:15,bold:true,color:palette.ink};
  s.getRange(`A2:${last}2`).format.rowHeight = 29;
  s.getRange('A3').values = [[note]];
  s.getRange('A3').format.font = {name:'Microsoft YaHei',size:10,color:palette.muted};
  s.getRange('A3').format.wrapText = false;
  s.getRange(`A3:${last}3`).format.rowHeight = 23;
  s.getRange(`A5:${last}5`).values = [headers];
  s.getRange(`A6:${last}${end}`).values = rows;
  const table = s.tables.add(`A5:${last}${end}`,true,tableName);
  table.style = 'TableStyleMedium2';
  s.getRange(`A5:${last}5`).format = {
    fill:palette.header, font:{name:'Microsoft YaHei',size:10,color:'#FFFFFF',bold:true},
    horizontalAlignment:'center', verticalAlignment:'center', wrapText:true,
    borders:{insideVertical:{style:'thin',color:'#FFFFFF'}},rowHeight:36,
  };
  s.getRange(`A6:${last}${end}`).format.wrapText = true;
  for (let c=0;c<headers.length;c++) s.getRange(`${colName(c+1)}1:${colName(c+1)}${end}`).format.columnWidth = widths[c];
  for (let i=0;i<rows.length;i++) {
    const lines = Math.max(...rows[i].map((v,j)=>String(v??'').split('\n').reduce((a,t)=>a+Math.max(1,Math.ceil([...t].reduce((n,ch)=>n+(ch.charCodeAt(0)>255?1.85:1),0)/Math.max(8,widths[j]-2))),0)));
    s.getRange(`A${i+6}:${last}${i+6}`).format.rowHeight = Math.max(name==='走查口径'?34:55,lines*14+12);
  }
  s.freezePanes.freezeRows(5);
  s.freezePanes.freezeColumns(name==='走查口径'?2:3);
  return s;
}

const main = grid('UI测试建议','SN318 UI 规范审查：对应测试建议',
  '42条现有UI case逐条对应；以下为测试设计建议，本次未执行网站测试。原始用例表保持不变。',
  ['case','页面/模块','检查点','公共库章节','验证步骤建议','预期表现与判定','取证建议','确认偏差后的修改建议','验收前待明确','框架适配方式','来源确认状态','验收依据索引'],
  data.advice,[10,19,27,15,43,46,33,37,36,24,18,36],'UiTestAdvice');
main.tabColor = palette.header;
const extras = grid('补充交互case','建议展开的交互验证 case',
  'INT01—INT10用于展开现有检查点；仅纳入本批已交付能力，功能不存在或契约未明确时先记录范围/待确认。',
  ['建议case','关联原case','验证场景','公共库章节','前置条件','步骤与测试数据','预期表现','取证建议','确认偏差后的修改建议','当前状态'],
  data.extras,[12,25,28,19,39,49,49,37,42,24],'InteractionCases');
const mods = grid('修改清单','前端页面修改清单',
  '21条原型Review待验证项；黄色区域填写本批走查结果。页首统计随走查结论更新，来源状态与实测结论分别记录。',
  ['清单ID','关联case','页面/模块','Review关注点（待实测）','Review记录ID','批准依据/待决事项','修改建议','复测验收标准','来源优先级','建议处理角色','来源确认状态','走查结论','实际表现/不适用原因','证据链接/定位','本批批准基线','责任人','实测级别','处理状态','复测结论','记录完整性'],
  data.modifications,[12,12,20,45,23,40,40,45,15,19,17,19,45,38,29,18,16,18,17,29],'FrontendChanges');
const lastMod = data.modifications.length+5;
mods.getRange(`L6:S${lastMod}`).format.fill = palette.amber;
mods.getRange(`L6:L${lastMod}`).dataValidation = {rule:{type:'list',values:['未走查','符合','已确认偏差','规范待确认','不适用']}};
mods.getRange(`Q6:Q${lastMod}`).dataValidation = {rule:{type:'list',values:['待定','P0','P1','P2','P3']}};
mods.getRange(`R6:R${lastMod}`).dataValidation = {rule:{type:'list',values:['待验证','待修正','修正中','待复测','已关闭','不适用']}};
mods.getRange(`S6:S${lastMod}`).dataValidation = {rule:{type:'list',values:['未执行','通过','失败','受阻','不适用']}};
for (let r=6;r<=lastMod;r++) {
  mods.getRange(`T${r}`).formulas = [[`=IF(L${r}="已确认偏差",IF(OR(LEN(TRIM(M${r}))=0,LEN(TRIM(N${r}))=0,LEN(TRIM(O${r}))=0),"待补实际/证据/基线",IF(AND(R${r}="已关闭",S${r}<>"通过"),"关闭需复测通过",IF(OR(Q${r}="待定",LEN(TRIM(Q${r}))=0),"已确认，待定级",IF(LEN(TRIM(P${r}))=0,"已确认，待分配","可交付修改项")))),IF(L${r}="符合",IF(OR(LEN(TRIM(N${r}))=0,LEN(TRIM(O${r}))=0),"符合需补证据/基线","符合已留证"),IF(L${r}="规范待确认","待明确规范",IF(L${r}="不适用",IF(LEN(TRIM(M${r}))=0,"不适用需写原因","不适用已注明"),"待走查"))))`]];
}
mods.getRange('A4:H4').values = [['待走查',null,'规范待确认',null,'偏差标记',null,'符合',null]];
mods.getRange('B4').formulas = [[`=COUNTIF(L6:L${lastMod},"未走查")`]];
mods.getRange('D4').formulas = [[`=COUNTIF(L6:L${lastMod},"规范待确认")`]];
mods.getRange('F4').formulas = [[`=COUNTIF(L6:L${lastMod},"已确认偏差")`]];
mods.getRange('H4').formulas = [[`=COUNTIF(L6:L${lastMod},"符合")`]];
mods.getRange('A4:H4').format.font.bold = true;
mods.getRange('A4:H4').format.rowHeight = 24;
for (const cell of ['B4','D4','F4','H4']) mods.getRange(cell).format.horizontalAlignment='center';
mods.getRange(`L6:L${lastMod}`).conditionalFormats.addCustom('L6="已确认偏差"',{fill:'#FDE9E7',font:{color:'#B53E37',bold:true}});
mods.getRange(`T6:T${lastMod}`).conditionalFormats.addCustom('AND($L6="已确认偏差",$T6<>"可交付修改项")',{fill:'#FFF0CB',font:{color:'#805615'}});

const contextRows = [
 ['目标','交付内容','用UI规范生成可执行交互case；走查系统实际实现；输出逐页/逐组件的修改建议与复测标准。','本次交付建议表及待验证清单','—'],
 ['执行','本批Build','执行前填写Build/部署版本和时间；结果与截图必须来自同一版本。',null,'需由本批执行人填写'],
 ['执行','批准UI基线','填写规范版本、框架组件版本、专项设计稿及项目例外；各行注明具体条款。',null,'建议参考UI规范rev5256'],
 ['执行','环境与视口','填写URL、账号角色、浏览器、视口尺寸、缩放比例及实际交付页。',null,'测试入口：test.bot.example.invalid/pcs/system-config/master-data'],
 ['顺序','测试与走查','先以开发冒烟确认页面可用，再执行本批UI规范case；每条记录期望、实际、证据、修改建议及复测。','本次未执行网站测试','引用聊天中的用例工作流'],
 ['判定','符合/偏差/待明确','有批准条款且行为匹配可记符合；有可复现偏差且证据齐全可记已确认偏差；基线冲突先记规范待确认。','Review确认状态与测试结果分开','源Review不是实测结论'],
 ['修改','具体可实施内容','修改项写清页面/组件、实际与预期差异、规范条款、改法、责任人、实测级别和复测标准。','同case在多个页面的偏差应分别记录','修改清单可新增行；追加行沿用公式/验证'],
 ['定级','按本批影响判定','来源P0/P1保留为Review优先级；实测级别按核心操作是否受阻、影响范围和本批缺陷标准决定。','P0/P1/P2/P3定义需本批确认','颜色不作为缺陷级别'],
 ['适用','公共库按需裁剪','重点用3.1、3.2和5.1—5.5；结合输入控件、批量动作、失败恢复的UI表现。','快键、多语言、移动端、草稿、撤销仅在明确交付时纳入','公共库说明要求结合业务上下文与验收标准'],
 ['范围','审批流','本期产品管理不接入工单、不走审批流；保存/提交/启用在系统内直接生效。','不纳入审批人/会签等case','产品需求§6.1，rev8340'],
 ['范围','深层业务与AI专项','业务计算、后端幂等、接口授权、模型准确性等独立取证；UI看到成功反馈不能证明后端或模型结果正确。','本表只设计测试，不调用外部模型','关联原功能case须注明局部覆盖范围'],
 ['证据','截图与交互','静态截图核视觉与位置；交互用录屏/状态与请求证据；写入结果按对象ID读回。','未设整页像素相似度百分比门槛','UI32；DEC18'],
 ['五色','红色·无法覆盖','UI01、UI02、UI42：先取得专项稿/组件规范，再核结构、状态和交互。','规范缺失记待确认','Review rev642'],
 ['五色','白灰·交互待明确','UI05：先确认产品文案与业务交互范围。','不能自行删掉必要规则','Review rev642'],
 ['五色','蓝色·组合复用','UI03、UI35：核组合布局及跨组件选择、取消、保存与返回。','静态稿不替代交互契约','Review rev642'],
 ['五色','黄色·调整后复用','UI04：核Warning图标/语义色及风险提示。','业务禁用结果另读回','Review rev642'],
 ['五色','绿色·直接复用','UI06—UI18、UI36：逐页核统一组件、状态与例外。','15条绿色源记录含1空行；有效映射14条','Review rev642'],
 ['待决','已有基线冲突','DEC01分类布局；DEC10金额精度；DEC18表头色、页头94px、Tabs40px/触达44px；DEC22数量反馈；DEC23新建页承载；DEC30行内编辑。','用原表决策ID续接，不擅自选择','源用例复查修正版'],
 ['状态','本次执行边界','完成42条对应建议、10条建议展开case和21条Review候选项。','未执行网站测试；全部修改候选未获本次实测确认','2026-10-12'],
 ['来源','公共用例基准库v1.2','全文读取；revision_id=95；用于检查维度及通用场景。','本次读取成功','https://example.invalid/source/92f788d9b2'],
 ['来源','通用设计规范V1.2','文档读取；revision_id=5256；数值条款含内嵌表，以原case已提取条款及本批批准基线核对。','本次读取成功','https://example.invalid/source/b12a1bc700'],
 ['来源','SN318产品需求','文档读取；revision_id=8340；用于功能范围及项目特有口径。','本次读取成功','https://example.invalid/source/662ffe8557'],
 ['来源','SN318 UI Review','view revision=642；22条来源记录；21条有效记录对应case，1空行不生成case。','本次读取成功','https://example.invalid/source/e04459bb0b'],
 ['来源','原UI用例','使用颜色层级对应_复查修正版中的UI01—UI42作为编号和范围。','原文件未改动','SN318_提测前冒烟与UI规范_颜色层级对应_复查修正.xlsx'],
 ['来源','引用聊天','读取了引用聊天的近期请求、五色映射及网站历史观察。','历史观察需在本批复核','thread://smoke-ui?hostId=local'],
];
const context = grid('走查口径','UI 走查口径与验收依据',
  '本批执行信息填写在D列；基线冲突先明确，再验收。修改清单中的黄色区域为执行输入。',
  ['类别','项目','执行口径','执行输入/当前边界','依据/来源'],contextRows,[12,27,79,47,72],'ReviewScope');
context.getRange('D7:D9').format.fill=palette.amber;

// Validate that incomplete evidence and an unpassed retest cannot look closed.
const probes=[];
const original = mods.getRange('L6:S6').values;
mods.getRange('L6').values=[['已确认偏差']];
assert.equal(mods.getRange('T6').values[0][0],'待补实际/证据/基线');
probes.push('confirmed deviation requires actual behavior, evidence and approved baseline');
mods.getRange('M6:Q6').values=[['验证样本实际','验证样本证据','验证样本基线','验证样本负责人','P2']];
mods.getRange('R6:S6').values=[['已关闭','未执行']];
assert.equal(mods.getRange('T6').values[0][0],'关闭需复测通过');
mods.getRange('S6').values=[['通过']];
assert.equal(mods.getRange('T6').values[0][0],'可交付修改项');
probes.push('closed deviation requires passed retest');
mods.getRange('Q6').values=[[null]];
assert.equal(mods.getRange('T6').values[0][0],'已确认，待定级');
probes.push('blank severity stays pending classification');
mods.getRange('L6:S6').values=original;
wb.recalculate();
assert.equal(mods.getRange('B4').values[0][0],20);
assert.equal(mods.getRange('D4').values[0][0],1);
assert.equal(mods.getRange('F4').values[0][0],0);
assert.equal(mods.getRange('H4').values[0][0],0);
assert.equal(mods.getRange('T6').values[0][0],'待走查');

const err = await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},maxChars:1800,summary:'formula error scan'});
await fs.writeFile(`${work}/formula-scan.ndjson`,err.ndjson);
for (const [sheetName, range, filename] of [
  ['UI测试建议','A2:H8','advice-preview.png'],
  ['UI测试建议','I5:L8','advice-basis-preview.png'],
  ['补充交互case','A2:G8','extras-preview.png'],
  ['修改清单','A2:H8','changes-preview.png'],
  ['修改清单','I5:T8','changes-input-preview.png'],
  ['走查口径','A2:E10','scope-preview.png'],
]) {
  const pic=await wb.render({sheetName,range,scale:1.3,format:'png'});
  await fs.writeFile(`${work}/${filename}`,new Uint8Array(await pic.arrayBuffer()));
}
const outputPath=`${out}/SN318_UI规范审查_测试建议与修改清单.xlsx`;
await fs.mkdir(out,{recursive:true});
await (await SpreadsheetFile.exportXlsx(wb)).save(outputPath);
await fs.writeFile(`${work}/verification.json`,JSON.stringify({outputPath,counts:data.counts,probes,summary:{unreviewed:20,baselinePending:1,confirmedDeviations:0,conforming:0},source:data.sourceWorkbook},null,2));
console.log(JSON.stringify({outputPath,counts:data.counts,probes,formulaScan:err.ndjson},null,2));
