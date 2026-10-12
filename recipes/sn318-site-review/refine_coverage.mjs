import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='./recipes/sn318-site-review',out='./artifacts/smoke-ui';
const source=`${out}/SN318_功能冒烟与界面交互验证_策略调整.xlsx`,path=`${out}/SN318_功能冒烟与界面交互验证_覆盖复核.xlsx`;
const manifest=JSON.parse(await fs.readFile(`${root}/ui-final-review-live.manifest.json`,'utf8'));
assert.equal(manifest.rev,642);assert.equal(manifest.records_count,22);assert.equal(manifest.has_more,false);
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const b=w.worksheets.getItem('本批提测'),u=w.worksheets.getItem('UI检查'),s=w.worksheets.getItem('冒烟用例'),walk=w.worksheets.getItem('UI走查'),dev=w.worksheets.getItem('开发冒烟'),issues=w.worksheets.getItem('UI修改清单');
const get=(sh,a)=>sh.getRange(a).values[0][0],set=(sh,a,v)=>sh.getRange(a).values=[[v]],formula=(sh,a,v)=>sh.getRange(a).formulas=[[v]];
const snapshots=[[b,'B7:B17'],[b,'D40:G61'],[b,'D115:G117'],[b,'D156:G160'],[s,'D6:H96'],[s,'M6:O96'],[u,'D6:H54'],[u,'M6:O54'],[walk,'H7:R55'],[dev,'G7:M22'],[issues,'D7:S37']].map(([sh,a])=>({sh,a,v:sh.getRange(a).values}));
const oldWalk=walk.getRange('S7:S55').formulas.map(r=>r[0]),oldUi=u.getRange('I6:I54').formulas.map(r=>r[0]);
// Keep the 49 case definitions; execution scope is a list of actual pages and states below.
walk.getRange('U6:Y6').values=[['页面范围核定','适用页面实例','已有有效记录','页面实例通过','页面覆盖状态']];
walk.getRange('U7:U55').values=[['待确认']];
walk.getRange('U7:U55').dataValidation={rule:{type:'list',values:['待确认','已确认']}};
const B='$B$62:$B$1055',C='$C$62:$C$1055',D='$D$62:$D$1055',E='$E$62:$E$1055',A='$A$62:$A$1055',O='$O$62:$O$1055';
for(let r=7;r<=55;r++){
 formula(walk,`V${r}`,`=COUNTIFS(${B},A${r},${E},"是")`);
 formula(walk,`W${r}`,`=COUNTIFS(${B},A${r},${E},"是",${O},"通过")+COUNTIFS(${B},A${r},${E},"是",${O},"失败已记录")+COUNTIFS(${B},A${r},${E},"是",${O},"受阻已记录")+COUNTIFS(${B},A${r},${E},"是",${O},"缺依据已记录")`);
 formula(walk,`X${r}`,`=COUNTIFS(${B},A${r},${E},"是",${O},"通过")`);
 const unset=`COUNTIFS(${B},A${r})-COUNTIFS(${B},A${r},${E},"是")-COUNTIFS(${B},A${r},${E},"否")`;
 const invalidExclusion=`COUNTIFS(${B},A${r},${E},"否")-COUNTIFS(${B},A${r},${E},"否",${O},"不适用")`;
 formula(walk,`Y${r}`,`=IF(U${r}<>"已确认","页面范围待核定",IF((${unset})>0,"页面适用范围未选齐",IF((${invalidExclusion})>0,"不适用依据未齐",IF(V${r}=0,"适用页面未登记",IF(W${r}<V${r},"页面走查未覆盖",IF(X${r}<V${r},"已覆盖，仍有失败/受阻/缺依据","页面覆盖已通过"))))))`);
 const body=oldWalk[r-7].slice(1);
 // Process completion may include faithfully recorded failures and missing basis.
 formula(walk,`S${r}`,`=IF(AND(H${r}="是",OR(I${r}="已走查",I${r}="待复查",I${r}="已复查")),IF(OR(Y${r}="页面覆盖已通过",Y${r}="已覆盖，仍有失败/受阻/缺依据"),${body},Y${r}),${body})`);
 const n=r-1;
 const old=oldUi[r-7],tail=`IF(OR(G${n}="通过",G${n}="失败",G${n}="受阻",G${n}="依据待确认"),G${n},"结果待填写")`;
 assert(old.includes(tail),`UI result tail ${n}`);
 const pageVerdict=`IF(G${n}="通过",IF('UI走查'!Y${r}<>"页面覆盖已通过","页面覆盖未通过",IF('UI走查'!O${r}<>'本批提测'!$B$11,"页面依据版本待核对","通过")),G${n})`;
 formula(u,`I${n}`,old.replace(tail,tail.replace(`),G${n},`, `),${pageVerdict},`)));
}
walk.getRange('A57:Q57').merge();set(walk,'A57','页面执行明细：先列本批适用的页面/对象、组件与视口，再核定上方U列范围。49条是用例定义，不是49个页面；一个页面通过不能代表其他页面。');
walk.getRange('A58:Q58').merge();set(walk,'A58','预置10行来自网站只读观察的候选示例，均未选择、未执行，不构成完整页面清单；服务单元、AI等页面及其他对象按交付补齐。页面实例须覆盖对应case全部适用步骤；不支持的能力逐项写批准裁剪依据。');
walk.getRange('A59:Q59').merge();set(walk,'A59','C列写页面/对象＋组件范围＋视口，D列写URL或菜单路径；相同case+C+D不可重复计数。新增行复制O:R公式并扩展原生表，统计至1055行；发现差异登记UI修改清单，缺依据不能记通过。');
walk.getRange('A61:R61').values=[['页面实例ID','关联UI case','页面/对象·组件·视口','URL/实际菜单路径','本批适用','必验状态/批准裁剪/数据','本次采用UI依据版本','页面执行结果','执行Build','动作及实际结果证据','执行人','问题/受阻/缺依据说明','关联修改清单ID','不适用依据','页面记录有效结果','case操作步骤','case批准预期','来源适配层级']];
const observations=JSON.parse(await fs.readFile(`${root}/site_observations.json`,'utf8')).observations;
const seed=[['UI01','基础配置·分类与新增入口','按批准本批结构核分类切换与当前对象新增入口；导航按钮不是自动等同Tabs。'],['UI11','国家·列表分页','覆盖case分页适用状态；现有1条样本不足多页，需准备批准专用数据。空态页码以本批批准规范为准。'],['UI15','航空公司·列表编码','区分纯展示编码与已交付详情入口；核是否存在错误链接暗示。'],['UI44','货物类型·编辑表单','按批准字段合同验证校验触发、错误定位、只读及回显；可见0/500仅是观察，不自行推广统一限制。'],['UI09','费用项·查询区','覆盖case查询布局、条件/重置/刷新及结果同步；对象精确URL未读取，可用真实菜单路径。'],['UI29','币种·数据展示','验证真实零、缺失及字段单位；样本CNY/USD小数位2不代表所有金额只能2位。'],['UI45','汇率·筛选与编辑选择','核源/目标币种、状态的真实控件及已生效只读；多选/搜索仅在交付时适用。'],['UI41','邮编·列表与编辑关联值','核国家编码/名称/ID跨视图一致；观察到列表1、表单中国CN需核批准展示口径。'],['UI41','航线区域·主详情与国家关系','区分主表/子表作用域，核国家ID与显示名称；国家关系编辑入口未核实。'],['UI41','Zone·主详情与成员表','核成员类型/对象/显示名称及服务商范围跨视图；成员编辑表单未核实，需补入口后执行。']];
for(let i=0;i<50;i++){
 const r=62+i,entry=i<10?seed[i]:null,obs=observations[i];
 walk.getRange(`A${r}:R${r}`).values=[[entry?`PX${String(i+1).padStart(2,'0')}`:null,entry?entry[0]:null,entry?`${entry[1]}·视口待补`:null,entry?(i===4?'基础配置 > 计价底座 > 费用项（精确URL待核）':obs.url):null,'待选择',entry?entry[2]:null,null,'未执行',null,null,null,null,null,null,null,null,null,null]];
 const lookup=(col)=>`INDEX('UI检查'!$${col}$6:$${col}$54,MATCH(B${r},'UI检查'!$A$6:$A$54,0))`;
 for(const [dest,col]of [['P','J'],['Q','K'],['R','R']])formula(walk,`${dest}${r}`,`=IF(B${r}="","",IF(COUNTIFS('UI检查'!$A$6:$A$54,B${r})<>1,"case无效",${lookup(col)}))`);
 const adopted=`INDEX($O$7:$O$55,MATCH(B${r},$A$7:$A$55,0))`;
 const linked=`COUNTIFS('UI修改清单'!$A$7:$A$200,M${r},'UI修改清单'!$B$7:$B$200,B${r})`;
 const closed=`COUNTIFS('UI修改清单'!$A$7:$A$200,M${r},'UI修改清单'!$U$7:$U$200,"复查闭环")+COUNTIFS('UI修改清单'!$A$7:$A$200,M${r},'UI修改清单'!$U$7:$U$200,"核对符合")+COUNTIFS('UI修改清单'!$A$7:$A$200,M${r},'UI修改清单'!$U$7:$U$200,"有据不适用")`;
 const actualIssue=`COUNTIFS('UI修改清单'!$A$7:$A$200,M${r},'UI修改清单'!$B$7:$B$200,B${r},'UI修改清单'!$D$7:$D$200,"实测问题")`;
 const raw=`IF(H${r}="通过",IF(OR(LEN(TRIM(G${r}))=0,G${r}<>${adopted}),"页面依据未对齐",IF(AND(LEN(TRIM(L${r}))>0,OR(${linked}<>1,(${closed})<>1)),"页面问题未闭环","通过")),IF(H${r}="失败",IF(OR(LEN(TRIM(L${r}))=0,${actualIssue}<>1),"失败问题未登记","失败已记录"),IF(OR(H${r}="受阻",H${r}="依据待确认"),IF(LEN(TRIM(L${r}))=0,"受阻/缺依据说明待补",IF(H${r}="受阻","受阻已记录","缺依据已记录")),"结果待填写")))`;
 formula(walk,`O${r}`,`=IF(AND(A${r}="",B${r}=""),"",IF(E${r}="否",IF(LEN(TRIM(N${r}))=0,"不适用依据待补","不适用"),IF(E${r}<>"是","未纳入",IF(LEN(TRIM(A${r}))=0,"范围ID缺失",IF(COUNTIFS(${A},A${r})<>1,"范围ID重复",IF(COUNTIFS('UI检查'!$A$6:$A$54,B${r})<>1,"关联case无效",IF(COUNTIFS(${B},B${r},${C},C${r},${D},D${r},${E},"是")<>1,"重复页面范围",IF(OR(LEN(TRIM(C${r}))=0,LEN(TRIM(D${r}))=0,LEN(TRIM(F${r}))=0,ISNUMBER(SEARCH("待补",C${r}))),"页面范围待补",IF(OR(H${r}="未执行",H${r}=""),"未执行",IF(OR(LEN(TRIM(I${r}))=0,I${r}<>'本批提测'!$B$8),"页面Build需核对",IF(OR(LEN(TRIM(J${r}))=0,LEN(TRIM(K${r}))=0),"页面执行证据不齐",${raw})))))))))))`);
}
walk.tables.add('A61:R111',true,'UIPageExecution').style='TableStyleMedium2';
walk.getRange('E62:E111').dataValidation={rule:{type:'list',values:['待选择','是','否']}};
walk.getRange('H62:H111').dataValidation={rule:{type:'list',values:['未执行','通过','失败','受阻','依据待确认']}};
// DS03 must identify its actual object and apply its own approved contract.
dev.getRange('Q6:R6').values=[['DS03本次普通对象','DS03对象契约与合法数据依据']];
dev.getRange('Q9').dataValidation={rule:{type:'list',values:['国家','航空公司','货物类型','其他已确认普通字典']}};
set(dev,'D9','先在Q/R指定本次普通对象及批准契约，用专用合法数据分别新增、编辑、刷新读回；只修改可编辑字段。按国家/航空公司/货物类型/普通字典分别确认DEC28/DEC06/DEC26；不把统一编码名称步骤套全部对象。汇率用DS14、费用项用DS15；Zone主记录/成员和地点邮编映射用DS16及相应正式case。');
set(dev,'E9','仅所选普通对象的合法主流程可用，必填/编码只读/扩展字段符合其批准契约；实际结果证据分别包含新增、编辑及刷新读回，不代表其他对象通过。');
set(dev,'P9','Q/R为本次对象及契约依据，H确认包含相应字段和合法数据；航空公司→DEC06，国家→DEC28，货物类型/其他普通字典→DEC26。专用财务、版本及关系维护不适用本场景。');
const oldDs=dev.getRange('N9').formulas[0][0].slice(1);
formula(dev,'N9',`=IF(AND(G9="是",OR(Q9="",LEN(TRIM(R9))=0)),"对象/契约未确认",IF(AND(G9="是",Q9<>"国家",Q9<>"航空公司",Q9<>"货物类型",Q9<>"其他已确认普通字典"),"请转对象专用场景",IF(AND(G9="是",OR(AND(Q9="航空公司",'本批提测'!$H$45<>"已确认"),AND(Q9="国家",'本批提测'!$H$158<>"已确认"),AND(OR(Q9="货物类型",Q9="其他已确认普通字典"),'本批提测'!$H$156<>"已确认"))),"对象专属规则待确认",${oldDs})))`);
const expand=(sh,name,area)=>{const t=sh.tables.items.find(t=>t.name===name),style=t.style;t.delete();sh.tables.add(area,true,name).style=style;};
expand(dev,'DeveloperSmoke','A6:R22');expand(walk,'UIWalkthrough','A6:Y55');
set(walk,'A5','黄色为输入。先在下方登记本批页面实例并完成裁剪，再确认U列范围；上方流程记录和正式测试结果仍独立。页面范围已覆盖可以包含失败或缺依据，正式通过要求所有适用页面通过。');
b.getRange('A191:H191').merge();set(b,'A191','覆盖复核修订：用例定义、页面范围与执行证据分开登记');
b.getRange('A192:H192').merge();set(b,'A192','UI走查下方新增页面执行明细，逐case核定本批页面/组件/视口；适用页面未登记、漏页、旧Build、缺依据或问题未闭环时不能计正式UI通过。已覆盖不等于全部通过。预置10行仅为已观察页面的候选示例，其他交付页面须补齐。');
b.getRange('A193:H193').merge();set(b,'A193','DS03新增普通对象与契约输入，按对象校验DEC06/26/28；汇率、费用项和Zone成员使用专用场景。所有本轮新增页面执行行未执行，未取得本批交付范围或系统通过证据。');
b.getRange('A194:H194').merge();set(b,'A194','来源：2026-10-12只读复取UI Review revision642（22条/21有效，未变）；页面候选引用本工作簿网站详情对照及已留存只读观察；通用公共用例基准v1.2 revision95按需裁剪。');
// Match the existing table style and preserve all execution inputs.
for(const [sh,range]of [[walk,'U6:Y55'],[walk,'A57:R111'],[dev,'Q6:R22'],[b,'A191:H194']]){sh.getRange(range).format.font={name:'Arial',size:10,color:'#25324A'};sh.getRange(range).format.wrapText=true;sh.getRange(range).format.verticalAlignment='center';}
for(const [sh,range]of [[walk,'U6:Y6'],[walk,'A61:R61'],[dev,'Q6:R6'],[b,'A191:H191']]){sh.getRange(range).format.fill='#213B62';sh.getRange(range).format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};sh.getRange(range).format.rowHeightPx=60;}
for(const c of ['U','Y'])walk.getRange(`${c}6:${c}55`).format.columnWidthPx=c==='U'?155:260;
for(const c of ['V','W','X']){walk.getRange(`${c}6:${c}55`).format.columnWidthPx=135;walk.getRange(`${c}7:${c}55`).format.numberFormat='0';}
walk.getRange('U7:U55').format.fill='#FFF4D6';walk.getRange('A62:N111').format.fill='#FFF4D6';
walk.getRange('A57:Q59').format.rowHeightPx=70;walk.getRange('A62:R71').format.rowHeightPx=210;walk.getRange('A72:R111').format.rowHeightPx=110;
dev.getRange('Q6:Q22').format.columnWidthPx=230;dev.getRange('R6:R22').format.columnWidthPx=400;dev.getRange('Q9:R9').format.fill='#FFF4D6';dev.getRange('A9:R9').format.rowHeightPx=240;
b.getRange('A192:H194').format.rowHeightPx=75;
for(const p of snapshots)assert.deepEqual(p.sh.getRange(p.a).values,p.v,`preserve ${p.a}`);
// Exercise coverage/result behavior, then restore every real input.
const saved=[[b,'B7:B17'],[b,'D40:G61'],[b,'D156:G160'],[walk,'H7:R7'],[walk,'U7'],[walk,'A62:N64'],[u,'D6:H6'],[u,'M6:O6'],[u,'U6:V6'],[dev,'G9:M9'],[dev,'Q9:R9'],[issues,'D7:S7']].map(([sh,a])=>({sh,a,v:sh.getRange(a).values}));
const checks=[],eq=(sh,a,v,msg)=>{assert.equal(get(sh,a),v,msg);checks.push(msg);};
for(const [a,v]of [['B7','复核模拟批次'],['B8','AUDIT-BUILD'],['B9','复核模拟交付'],['B10','REQ-AUDIT'],['B11','UI-AUDIT'],['B12','已确认'],['B15','复核模拟账号'],['B16','2026-10-12'],['B17','已核对']])set(b,a,v);
walk.getRange('A62:N64').values=[['AUDIT-P1','UI01','范围一·列表·1920x1080','audit://page1','是','覆盖全部适用case状态','UI-AUDIT','通过','AUDIT-BUILD','复核模拟动作及读回','复核模拟测试人',null,null,null],['AUDIT-P2','UI01','范围二·列表·1920x1080','audit://page2','是','覆盖全部适用case状态','UI-AUDIT','未执行',null,null,null,null,null,null],[null,null,null,null,'待选择',null,null,'未执行',null,null,null,null,null,null]];
set(walk,'O7','UI-AUDIT');set(walk,'U7','已确认');
eq(walk,'V7',2,'Two planned page instances are counted');eq(walk,'X7',1,'One page cannot stand in for two');eq(walk,'Y7','页面走查未覆盖','Unexecuted page stays visible');
set(walk,'H7','是');set(walk,'I7','已走查');eq(walk,'S7','页面走查未覆盖','Case walkthrough completion requires page coverage');
for(const [a,v]of [['D6','是'],['E6','是'],['F6','已确认'],['G6','通过'],['H6','AUDIT-BUILD'],['M6','复核模拟实际证据'],['O6','复核模拟执行人'],['U6','复核模拟交付映射'],['V6','REQ-AUDIT | UI-AUDIT']])set(u,a,v);
for(const r of [40,57]){set(b,`D${r}`,'是');set(b,`F${r}`,'已确认');set(b,`G${r}`,'复核模拟批准人及依据');}
eq(b,'B6','已就绪','Formal prerequisite fixture is ready');eq(u,'I6','页面覆盖未通过','Formal pass rejects a missing page');
for(const [a,v]of [['H63','通过'],['I63','AUDIT-BUILD'],['J63','复核模拟第二页证据'],['K63','复核模拟测试人']])set(walk,a,v);
eq(walk,'Y7','页面覆盖已通过','All actual page records can pass');eq(u,'I6','通过','Formal pass permits complete approved page coverage');
set(walk,'I63','OLD-BUILD');eq(walk,'O63','页面Build需核对','Old page Build is rejected');eq(u,'I6','页面覆盖未通过','Old page Build blocks formal pass');set(walk,'I63','AUDIT-BUILD');
set(walk,'J63','');eq(walk,'O63','页面执行证据不齐','Missing page evidence is rejected');set(walk,'J63','复核模拟证据');
set(walk,'G63','DRAFT');eq(walk,'O63','页面依据未对齐','Draft basis cannot masquerade as adopted basis');set(walk,'G63','UI-AUDIT');
set(walk,'A63','AUDIT-P1');eq(walk,'O62','范围ID重复','Duplicate instance ID rejected on both rows');set(walk,'A63','AUDIT-P2');
set(walk,'C63','范围一·列表·1920x1080');set(walk,'D63','audit://page1');eq(walk,'O62','重复页面范围','Duplicate page scope cannot inflate denominator');set(walk,'C63','范围二·列表·1920x1080');set(walk,'D63','audit://page2');
set(walk,'H63','依据待确认');eq(walk,'O63','受阻/缺依据说明待补','Missing basis requires a concrete reason');set(walk,'L63','复核模拟缺字段规范');eq(walk,'W7',2,'Honest missing-basis record counts as covered');eq(walk,'X7',1,'Missing basis never counts as passed');eq(walk,'Y7','已覆盖，仍有失败/受阻/缺依据','Coverage and pass remain separate');eq(u,'I6','页面覆盖未通过','Missing basis blocks formal pass');
set(walk,'H63','通过');set(walk,'L63','复核模拟实测差异');set(walk,'M63','RV-UI01');eq(walk,'O63','页面问题未闭环','Unclosed review candidate cannot clear a page issue');set(walk,'L63','');set(walk,'M63','');
set(walk,'H63','失败');set(walk,'L63','复核模拟真实差异');set(walk,'M63','RV-UI01');eq(walk,'O63','失败问题未登记','Review candidate is not an observed defect');set(issues,'D7','实测问题');eq(walk,'O63','失败已记录','Observed failure is recorded in the actual issue list');set(issues,'D7','Review待核对');set(walk,'H63','通过');set(walk,'L63','');set(walk,'M63','');
set(walk,'U7','待确认');eq(u,'I6','页面覆盖未通过','Unconfirmed scope blocks formal pass');set(walk,'U7','已确认');set(walk,'E62','否');set(walk,'N62','');eq(walk,'O62','不适用依据待补','Excluded page requires a reason');set(walk,'N62','复核模拟本批未交付');eq(walk,'O62','不适用','Excluded page with reason remains separate');
set(walk,'N62','');eq(walk,'Y7','不适用依据未齐','Exclusion cannot silently shrink coverage');eq(u,'I6','页面覆盖未通过','Undocumented exclusion blocks formal pass');set(walk,'N62','复核模拟本批未交付');
set(walk,'E63','待选择');eq(walk,'Y7','页面适用范围未选齐','Pending applicability cannot silently shrink coverage');eq(u,'I6','页面覆盖未通过','Unselected planned page blocks formal pass');
set(walk,'E63','否');set(walk,'N63','复核模拟未交付');eq(walk,'Y7','适用页面未登记','Zero planned pages cannot pass by vacuous coverage');
for(const [a,v]of [['G9','是'],['H9','已确认'],['I9','通过'],['J9','AUDIT-BUILD'],['K9','REQ-AUDIT'],['L9','复核模拟新增编辑读回'],['M9','复核模拟开发']])set(dev,a,v);
eq(dev,'N9','对象/契约未确认','DS03 requires a concrete object');set(dev,'Q9','汇率');set(dev,'R9','复核模拟依据');eq(dev,'N9','请转对象专用场景','FX cannot bypass its lifecycle scene');set(dev,'Q9','航空公司');eq(dev,'N9','对象专属规则待确认','Airline uses DEC06');
for(const [a,v]of [['D45','是'],['F45','已确认'],['G45','复核模拟批准人及依据']])set(b,a,v);set(b,'B11','');eq(dev,'N9','通过','Object smoke still works without unrelated UI baseline');eq(s,'G16','未执行','Smoke does not backfill full functional pass');
for(const p of saved)p.sh.getRange(p.a).values=p.v;
w.recalculate();
for(const p of snapshots)assert.deepEqual(p.sh.getRange(p.a).values,p.v,`restore ${p.a}`);
for(const a of ['B22','F22','H22'])eq(b,a,0,'No formal passes invented');eq(dev,'E4',0,'Developer raw execution stays unexecuted');eq(walk,'E4',0,'No walkthrough execution invented');
for(let r=62;r<=111;r++)eq(walk,`H${r}`,'未执行','New page execution is unexecuted');
const errors=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},maxChars:1800});assert(errors.ndjson.includes('matched 0 entries'),errors.ndjson);
await (await SpreadsheetFile.exportXlsx(w)).save(path);
await fs.writeFile(`${root}/coverage-verification.json`,JSON.stringify({path,reviewRevision:manifest.rev,formalCases:140,developerScenes:16,pageCandidateExamples:10,pageInputRows:50,checks,formulaErrors:0},null,2));
for(const [sheetName,range,name]of [['UI走查','U6:Y9','coverage-summary'],['UI走查','A57:G65','coverage-page-plan'],['UI走查','G61:O64','coverage-page-result'],['开发冒烟','C9:F9','coverage-smoke-scope'],['开发冒烟','P6:R9','coverage-smoke-input'],['本批提测','A191:H194','coverage-overview']]){const p=await w.render({sheetName,range,scale:1.1,format:'png'});await fs.writeFile(`${root}/${name}.png`,new Uint8Array(await p.arrayBuffer()));}
console.log(JSON.stringify({path,checks:checks.length,formulaErrors:0,previews:6}));
