import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
process.on('uncaughtException',e=>{console.error(`${e.name}: ${e.message}\n${String(e.stack).split('\n').filter(x=>x.includes('build_second_review.mjs')).join('\n')}`);process.exit(1);});
const root='./recipes/sn318-smoke-ui-review';
const out='./artifacts/smoke-ui';
const source=`${out}/SN318_提测前冒烟与UI规范_用例复核.xlsx`;
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const b=w.worksheets.getItem('本批提测'),s=w.worksheets.getItem('冒烟用例'),u=w.worksheets.getItem('UI检查'),t=w.worksheets.getItem('需求对照');
const set=(sh,a,v)=>sh.getRange(a).values=[[v]],get=(sh,a)=>sh.getRange(a).values[0][0];
const originalInputs=[[b,'B7:B17'],[b,'D40:G61'],[b,'D115:G117'],[b,'B33:B36'],[s,'D6:H93'],[s,'M6:R93'],[u,'D6:H45'],[u,'M6:V45']].map(([sh,r])=>({sh,r,values:sh.getRange(r).values}));
const checks=[];
const eq=(sh,a,v,label)=>{assert.equal(get(sh,a),v,label);checks.push(label);};
const decisions=new Map([...b.getRange('A40:A61').values.map((r,i)=>[r[0],i+40]),...b.getRange('A115:A117').values.map((r,i)=>[r[0],i+115])]);
const deferred=new Set([40,41,42,115]);
const cases=new Map();
for(const [sh,last,basis] of [[s,93,'V'],[u,45,'AF']])for(let r=6;r<=last;r++)cases.set(get(sh,`A${r}`),{sh,r,basis});

// Basis confirmation is separate from execution readiness. Both must be explicit.
b.getRange('B6:D6').merge();set(b,'A6','本批执行前提');
const required=[7,8,9,10,11,15,16].map(r=>`LEN(TRIM(B${r}))=0`).join(',');
b.getRange('B6').formulas=[[`=IF(OR(${required},B12<>"已确认",B17<>"已核对"),"未就绪","已就绪")`]];
b.getRange('F6:H6').merge();set(b,'E6','说明');set(b,'F6','已就绪只表示执行信息齐备；测试结果、证据及关联决策仍须逐项满足。');
b.getRange('A6:H6').format.font={name:'Arial',size:10,color:'#25324A'};
b.getRange('A6:H6').format.wrapText=true;b.getRange('A6:H6').format.verticalAlignment='center';b.getRange('A6:H6').format.rowHeightPx=55;
b.getRange('B6:D6').conditionalFormats.add('containsText',{text:'未就绪',format:{fill:'#FFF4CE',font:{color:'#8B5B00'}}});
b.getRange('B4').formulas=[['=IF(B6<>"已就绪","请补齐本批信息并核对交付覆盖与基线",IF(H30>0,"请填写纳入项的交付映射",IF(B20+F20+H20=0,"本批没有适用检查项",IF(B25+F25+H25+F30>0,"请明确适用项的验收依据",IF(B27+F27+H27>0,"关键项失败，建议退回整改",IF(B24+F24+H24>0,"存在未完成或受阻检查",IF(B23+F23+H23+H31>0,"存在一般失败或后置项，需评审带项意见","本批检查已完成，待人工评审")))))))']];
for(const [id,{sh,r,basis}] of cases){
 const before=sh.getRange(`${basis}${r}`).formulas[0][0];
 const refs=new Set([...before.matchAll(/'本批提测'!\$H\$(\d+)/g)].map(m=>Number(m[1])));
 if(id==='SM55')refs.add(47);
 const invalid=[`LEN(TRIM('本批提测'!$B$10))=0`,`LEN(TRIM('本批提测'!$B$11))=0`,`'本批提测'!$B$12<>"已确认"`,`F${r}<>"已确认"`,...[...refs].map(dr=>deferred.has(dr)?`AND('本批提测'!$H$${dr}<>"已确认",'本批提测'!$H$${dr}<>"已记录后置")`:`'本批提测'!$H$${dr}<>"已确认"`)];
 sh.getRange(`${basis}${r}`).formulas=[[`=IF(D${r}="否","不适用",IF(D${r}<>"是","未纳入本批",IF(OR(${invalid.join(',')}),"待确认","已确认")))`]];
 const mapping=id.startsWith('UI')?'U':'Q',baseline=id.startsWith('UI')?'V':'R';
 sh.getRange(`I${r}`).formulas=[[`=IF(D${r}="否","不适用",IF(D${r}<>"是","未纳入本批",IF(AND(E${r}<>"是",E${r}<>"否"),"关键项待分类",IF(${basis}${r}<>"已确认","依据待确认",IF('本批提测'!$B$6<>"已就绪","批次未就绪",IF(OR(H${r}<>'本批提测'!$B$8,G${r}="",G${r}="未执行"),"未执行",IF(${baseline}${r}<>'本批提测'!$B$18,"基线已变，需复测",IF(LEN(TRIM(${mapping}${r}))=0,"交付未映射",IF(AND(OR(G${r}="通过",G${r}="失败"),LEN(TRIM(M${r}))=0),"缺少证据",IF(AND(OR(G${r}="通过",G${r}="失败"),LEN(TRIM(O${r}))=0),"缺少执行人",IF(OR(G${r}="通过",G${r}="失败",G${r}="受阻",G${r}="依据待确认"),G${r},"结果待填写")))))))))))`]];
}
set(s,'A4','全部未执行。按交付选择本批项；V列核有效依据，结果还需本批B6已就绪、关键项已分类、Build/执行基线匹配及证据/执行人齐备。适用分支全部完成后才标整行通过。');
set(u,'A4','全部未执行。按交付选择本批项；AF列核有效依据，结果还需本批B6已就绪、关键项已分类、Build/执行基线匹配及证据/执行人齐备。来源处理状态不等于本批采用或实测通过。');
let reviewFormula=b.getRange('F35').formulas[0][0];
reviewFormula=reviewFormula.replace('OR(B34="",B36="")','OR(LEN(TRIM(B34))=0,LEN(TRIM(B36))=0)').replace('B35<>""','LEN(TRIM(B35))>0');
b.getRange('F35').formulas=[[reviewFormula]];

// Restore a minimal algorithm example to smoke, without duplicating the regression matrix.
set(s,'P57','冒烟');set(s,'C57','产品抛比、体积重与计费重正向算例');
set(s,'J57','前置：已发布未停用产品，批准测试配置产品抛比6000、实重8KG、订单计费重步长1KG，价卡及报价时点有效；进位规则经DEC19确认，均为算例配置，不是系统默认。\n操作：填写60×50×40cm并执行一次有效试算，独立核对体积重、原始计费重、订单计费重及结果中的产品抛比和版本。小数进位、尺寸缺失及非法输入另按SM79/SM78专项。');
set(s,'K57','60×50×40÷6000＝20KG；原始计费重max(8,20)＝20KG；在批准1KG进位配置下订单计费重20KG。使用产品最终抛比，不用服务单元履约抛比替代。一次合法试算既核成本也核计费重量，不能仅因固定费用合计131正确便认为重量算法正确；其他批准策略须先更新算例预期。');
set(s,'T57','以一组合法、整步长数据验证核心重量公式及产品抛比来源，纳入冒烟；非整步长和异常值矩阵归专项，避免移走全部算法正向检查。');
set(s,'U57','批准产品抛比6000、实重8KG及60×50×40cm；记录公式20KG、原始max和批准订单重量、产品/价卡版本。非整步长20.1→21算例在SM79逐项取证。');
set(s,'W57','二次复核修正');set(s,'X57','恢复核心重量正向算例至冒烟；小数进位与非法/缺失输入分别移至SM79、SM78，不丢原分支。');
set(s,'J84',`${get(s,'J84')}\n订单重量独立分支：批准产品抛比6000、实重8KG、67×30×60cm及按1KG向上进位策略，核20.1KG原始值与21KG订单值；费用行各自进位另核，不把1KG当系统默认。`);
set(s,'K84',`${get(s,'K84')}\n批准示例67×30×60÷6000＝20.1KG，原始max(8,20.1)＝20.1KG，按批准1KG向上进位后订单重量21KG。批准策略改变则更新预期；不取费用行步长替代订单重量进位。`);
set(s,'U84',`${get(s,'U84')}\n增加从SM52分出的20.1→21KG订单重量分支，独立保留原始与进位值以及批准配置证据。`);
set(s,'W84','二次复核修正');set(s,'X84','接收SM52非整步长专项分支；成本/FX/逐费用进位与订单重量进位分别核算。');
set(s,'W60','二次复核修正');set(s,'X60','补关联DEC08有效依据；导出范围/字段/格式未确认时不能仅手填本批依据已确认计通过。');

// Resolve overbroad expectations and preserve contradictions rather than choose a rule silently.
set(u,'K25',`${get(u,'K25')}\n表头色存在源内差异：§4.5桌面说明#F7F8FA，§5.8规格与Token为#F7F7F7；先在DEC18记录采用值/组件依据，未经批准不凭任一数值判失败。`);
set(u,'AC25','二次复核补表头#F7F8FA/#F7F7F7源内差异；保持本批批准组件依据。');
set(u,'J31','分别准备表格长字段、列表标题、详情普通字段值及备注/描述；核对截断、Tooltip、折叠/展开和内容滚动，完整内容可读且关键操作不遮挡。');
set(u,'K31','表格单元格及列表标题类字段单行省略，hover Tooltip显示完整；详情普通字段值最多3行，超出折叠并能展开。备注/描述类字段最多2行，超出折叠，不能一概套详情3行。所有本批适用展示类型分别留证，容器滚动时关键操作可达；仅在支持hover的端使用Tooltip。');
set(u,'AC31','修正将详情3行泛化至备注/描述；补列表标题1行与备注/描述2行各自规则。');
set(u,'AD31','按字段展示场景分别核对1/2/3行上限及完整内容访问，不能用一条通用长文本规则代替不同容器。');
set(u,'AE31','分别留列表标题/表格单行、普通详情3行、备注描述2行的截断及展开证据；支持hover端测Tooltip，其他端按批准替代交互。');
set(u,'J34','分别准备无值、真实0、金额、重量、件数、百分比和体积字段；核对小数位、千分位、符号/单位及同列格式，不改变原始计算值。');
set(u,'K34',`${get(u,'K34')}\n规范数字类型另核：百分比保留2位小数并带%，体积保留4位小数并带单位；只检查本批实际展示字段，不增加业务计算输入精度约束。`);
set(u,'AC34','补百分比2位、体积4位及单位；展示精度与输入/计算精度分别判断。');
set(u,'AD34','将缺失值/真实零与数字展示格式分开核对；覆盖本批实际用到的每种数字类型，显示舍入不代表计算舍入。');
set(u,'AE34','逐项记录金额批准位数、重量3位、数量整数、百分比2位及体积4位，核对应符号/单位和原始值；无值不能变成0。');
set(u,'C44','背景、语义色、圆角与图标');
set(u,'J44',`${get(u,'J44')}\n4.核对默认控件8px、卡片/面板12px、弹窗/抽屉16px圆角；图标库按本批批准范围，服务单元详情emoji要求另按UI18采纳方案。`);
set(u,'K44',String(get(u,'K44')).replace('emoji不作业务图标。','服务单元详情不使用emoji的要求按UI18采纳方案，不泛化为全部AI或说明内容禁止emoji。')+'\n默认按钮/输入/Tag圆角8px，卡片/面板12px，弹窗/抽屉16px，适用组件和项目例外按本批批准基线。');
set(u,'L44','SPEC §3.1/3.4/3.7/5.12；语义/中性/图标表及圆角表jYqjvY已只读复核；详情emoji为Review UI18局部采纳项。');
for(const r of [25,31,34,44]){set(u,`AG${r}`,'二次复核修正');set(u,`AH${r}`,'补来源适用范围和量值；不把一类字段或局部Review扩展至全站。');}
set(b,'B57','本批UI稿/规范版本、支持端/容差；Tabs40/触达44、页头94与4倍数、表头#F7F8FA/#F7F7F7源内差异须记录采用方案；只确认本批实际组件。');
set(b,'B68','通用规范V1.2 revision5256；首轮12份内嵌表，二次补7份加载/空态/长文本/数字/时间/主色/圆角，共19份。源内及项目数值差异按DEC10/18确认；表头色不可默任选。');
set(b,'A83','二次复核：28冒烟＋60专项＋40UI，全部未执行；修正3处统计/决策联动问题；核心重量正向算例保留冒烟，小数/异常分支归专项，128检查点及原分支均保留。');
set(b,'D124','SM33/SM39/SM51保留专项；SM52恢复为核心重量正向冒烟，20.1→21进位归SM79、非法/缺失输入归SM78。共28冒烟/60专项，按本批交付选取。');
set(b,'D125','依据有效性需填写需求/UI基线及确认范围，并满足关联决策；结果需本批执行前提已就绪、关键项已分类和实际证据。未就绪不显示通过；SM55补DEC08。');
set(b,'D128','规范源内差异：Tabs40/触达44、页头94与4倍数、表头#F7F8FA/#F7F7F7统一记录DEC18；按本批批准组件方案验收，不擅自改规范数值。');
set(b,'H11','UI符合率仅统计有效依据已确认项的当前有效结果；缺批次执行信息不能计通过。同时披露F32确认覆盖率、H32未完成，不能称为整页像素拟合率。');
set(b,'F8','28冒烟为用例库候选；每交付模块选入口/权限、正向闭环、关键失败及保存读回。计价交付需SM25成本核算与SM52重量核算，细矩阵归专项。');
set(b,'B139','SM46→SM24→SM25＋SM52→SM53；既核131 CNY费用账本也核20KG重量正向算例；参数/小数进位/异常用SM51/SM79/SM78专项。');
set(b,'A110','二次独立复核重现并修正3个记录误判路径，补长文本/数字/圆角及规范冲突；全部128检查点仍未执行。实际提测须当前Build、交付映射、批准基线和业务环境证据。');
set(t,'D76','20KG核心正向冒烟；20.1→21的批准小数进位及费用行不同步长在SM79专项核对');
set(t,'B118','通用色彩、圆角与图标：背景/语义色/状态文字/图标与组件圆角');

b.getRange('A143:H143').merge();set(b,'A143','二次独立复核｜发现与修正');
const findings=[
 ['S01','基线/前提缺失','复现：只有Build和手填通过时，基线字段未填也能显示单行通过及100%，总提示却阻塞。现增加B6执行前提及基线确认校验，单行/符合率不能绕过。'],
 ['S02','关键项留空','复现：关键项为空＋结果失败会归一般失败，关键失败为0。现显示关键项待分类，进入未完成；分类完成前不能计通过或带项完成。'],
 ['S03','导出决策漏联','复现：SM55本批依据手填已确认时，DEC08待确认仍显示依据有效。现SM55与DEC08自动纳入及结果联动一致。'],
 ['S04','核心重量冒烟','上一轮将SM52整条移到专项，固定费用131正确仍可能漏掉重量算法错误。现恢复最小20KG正向冒烟，保留20.1→21专项及原异常分支。'],
 ['S05','长文本适用范围','规范§9.4普通详情字段最多3行、备注/描述最多2行、列表标题1行。修正UI26不再把详情3行套给所有长文本。'],
 ['S06','UI数值与局部规则','补UI29百分比2位/体积4位；UI39圆角8/12/16px；详情emoji要求按UI18采纳，避免泛化局部Review。'],
 ['S07','表头色源内差异','§4.5写#F7F8FA，§5.8规格/Token写#F7F7F7；补DEC18及UI20采用值记录。明确来源差异，不任取一条判实现错误。'],
 ['S08','复核证据边界','主需求revision8340及UI视图rev628再次读取未变；20条有效Review ID逐一匹配、128编号唯一；补核7份内嵌表。所有业务用例仍未执行。']
];
for(const [i,[id,label,text]] of findings.entries()){
 const r=144+i;set(b,`A${r}`,id);b.getRange(`B${r}:C${r}`).merge();set(b,`B${r}`,label);b.getRange(`D${r}:H${r}`).merge();set(b,`D${r}`,text);b.getRange(`A${r}:H${r}`).format.rowHeightPx=88;
}
b.getRange('A143:H151').format.font={name:'Arial',size:10,color:'#25324A'};
b.getRange('A143:H151').format.wrapText=true;b.getRange('A143:H151').format.verticalAlignment='center';
b.getRange('A143:H143').format.fill='#213B62';b.getRange('A143:H143').format.font={name:'Arial',size:12,bold:true,color:'#FFFFFF'};b.getRange('A143:H143').format.rowHeightPx=38;
for(const r of [57,83,110,124,125,128])b.getRange(`A${r}:H${r}`).format.rowHeightPx=Math.max(100,b.getRange(`A${r}`).format.rowHeightPx||0);
for(const [sh,rows,end] of [[s,[57,84],'X'],[u,[25,31,34,44],'AH']])for(const r of rows){
 const vals=sh.getRange(`A${r}:${end}${r}`).values[0];
 const lines=vals.map((v,i)=>String(v??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length*12/Math.max(45,(sh.getCell(r-1,i).format.columnWidthPx||120)-18))),0));
 sh.getRange(`A${r}:${end}${r}`).format.rowHeightPx=Math.max(150,...lines.map(n=>n*18+22));
}

// Independently verify every declared decision-to-case edge; SM55 was the prior missing edge.
for(const [did,r] of decisions){
 for(const m of String(get(b,`C${r}`)).matchAll(/(SM|UI)(\d+)(?:[—–-](?:SM|UI)?(\d+))?/g))for(let n=Number(m[2]);n<=Number(m[3]??m[2]);n++){
  const cid=`${m[1]}${String(n).padStart(2,'0')}`,entry=cases.get(cid);assert(entry);
  assert(entry.sh.getRange(`${entry.basis}${entry.r}`).formulas[0][0].includes(`'本批提测'!$H$${r}`),`${did} dependency ${cid}`);
 }
}

// Regression tests include the reproduced failures and nearby counterexamples, then restore all inputs.
for(let r=6;r<=45;r++)set(u,`D${r}`,'否');for(let r=6;r<=93;r++)set(s,`D${r}`,'否');
set(b,'B8','AUDIT-BUILD');set(b,'F57','已确认');set(b,'G57','复核模拟：已批准UI组件基线');
for(const [a,v] of [['D41','是'],['F41','已确认'],['G41','通过'],['H41','AUDIT-BUILD'],['M41','复核模拟截图'],['O41','复核模拟执行人'],['U41','复核模拟交付'],['V41',get(b,'B18')]])set(u,a,v);
eq(u,'AF41','待确认','Blank baseline metadata cannot confirm UI basis');eq(u,'I41','依据待确认','Reproduced missing-baseline pass is blocked');eq(b,'F29','无已确认项','Missing baseline cannot display 100 percent');
const completeMeta=[['B7','复核模拟批次'],['B9','复核模拟交付'],['B10','复核模拟需求'],['B11','复核模拟UI'],['B12','已确认'],['B15','复核模拟账号'],['B16','2026-10-12'],['B17','已核对']];
for(const [a,v] of completeMeta)set(b,a,v);set(u,'V41',get(b,'B18'));
eq(b,'B6','已就绪','Complete execution metadata is ready');eq(u,'I41','通过','Complete case can still pass');eq(b,'F29',1,'Valid complete case yields a recorded 100 percent');
set(b,'B15','');eq(u,'AF41','已确认','Approved basis is independent of missing execution account');eq(u,'I41','批次未就绪','Missing execution account cannot pass');eq(b,'F29',0,'Ready basis without execution readiness cannot inflate conformance');set(b,'B15','复核模拟账号');
set(b,'B17','待确认');eq(u,'I41','批次未就绪','Unverified delivery coverage blocks effective result');set(b,'B17','已核对');
set(b,'B12','待确认');eq(u,'AF41','待确认','Unapproved batch baseline blocks valid basis');set(b,'B12','已确认');
set(b,'B10','   ');eq(u,'AF41','待确认','Whitespace cannot be the requirement baseline');set(b,'B10','复核模拟需求');
set(b,'B8','   ');eq(b,'B6','未就绪','Whitespace cannot be the Build');eq(u,'I41','批次未就绪','Whitespace Build cannot pass');set(b,'B8','AUDIT-BUILD');
set(u,'E41','');set(u,'G41','失败');eq(u,'I41','关键项待分类','Reproduced blank critical flag cannot become ordinary failure');eq(b,'F24',1,'Missing critical classification is incomplete');eq(b,'B4','存在未完成或受阻检查','Incomplete classification cannot enter carry-item review');
set(u,'G41','通过');eq(u,'I41','关键项待分类','Blank critical flag also cannot count as a pass');set(u,'E41','无效');eq(u,'I41','关键项待分类','Invalid critical flag cannot bypass classification');set(u,'E41','否');
set(u,'H41','OLD-BUILD');eq(u,'I41','未执行','Old Build is not a current executed pass');set(u,'H41','AUDIT-BUILD');
set(u,'V41','OLD-BASELINE');eq(u,'I41','基线已变，需复测','Old execution baseline needs retest');set(u,'V41',get(b,'B18'));
for(const [col,msg] of [['U','交付未映射'],['M','缺少证据'],['O','缺少执行人']]){const old=get(u,`${col}41`);set(u,`${col}41`,'   ');eq(u,'I41',msg,`Whitespace ${col} cannot support a pass`);set(u,`${col}41`,old);}
set(s,'D60','是');set(s,'F60','已确认');eq(s,'V60','待确认','Reproduced SM55 bypass is blocked');eq(b,'H47','待确认','Export decision is automatically selected');set(b,'F47','已确认');set(b,'G47','   ');eq(s,'V60','待确认','Export decision requires substantive evidence');set(b,'G47','复核模拟：已批准导出范围/字段/格式');eq(s,'V60','已确认','Approved export specification activates basis');
set(b,'D47','否');eq(b,'H47','范围矛盾','Selected export decision cannot be excluded');eq(s,'V60','待确认','Contradictory export scope cannot pass');set(b,'D47','是');set(s,'D60','否');
eq(b,'B4','本批检查已完成，待人工评审','Fully recorded selected cases still reach human review');
set(b,'B33','同意提测');set(b,'B34','   ');set(b,'B36','复核模拟评审证据');eq(b,'F35','请补齐评审人与证据','Whitespace reviewer cannot confirm review');set(b,'B34','复核模拟评审人');set(b,'B36','   ');eq(b,'F35','请补齐评审人与证据','Whitespace approval evidence cannot confirm review');set(b,'B36','复核模拟评审证据');eq(b,'F35','已记录同意提测','Substantive review record is accepted only with completed checks');
set(u,'G41','失败');set(b,'B33','允许带项提测');set(b,'B35','   ');eq(b,'F35','需满足检查前提并补齐带项意见','Whitespace carry-item opinion cannot confirm review');
for(const {sh,r,values} of originalInputs)sh.getRange(r).values=values;
set(s,'P57','冒烟');
for(const [id,{sh,r}] of cases)assert.equal(get(sh,`G${r}`),'未执行',`${id} remains unexecuted`);
assert.equal(cases.size,128);
assert.equal(s.getRange('P6:P93').values.filter(r=>r[0]==='冒烟').length,28);
assert.equal(s.getRange('P6:P93').values.filter(r=>r[0]==='专项回归').length,60);
w.recalculate();
eq(b,'B6','未就绪','Original batch metadata restored');eq(b,'B22',0,'Final smoke passes remain zero');eq(b,'F22',0,'Final UI passes remain zero');eq(b,'H22',0,'Final regression passes remain zero');
const errors=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:40},maxChars:1600,summary:'Second independent formula error scan'});
assert(errors.ndjson.includes('matched 0 entries'),errors.ndjson);
await fs.mkdir(out,{recursive:true});
const path=`${out}/SN318_提测前冒烟与UI规范_二次复核修正.xlsx`;
await (await SpreadsheetFile.exportXlsx(w)).save(path);
await fs.writeFile(`${root}/second-verification.json`,JSON.stringify({path,checks,counts:{smoke:28,regression:60,ui:40,total:128},formulaErrors:errors.ndjson,findings},null,2),'utf8');
console.log(JSON.stringify({path,checks:checks.length,total:128,errors:errors.ndjson}));
for(const [sheetName,range,name] of [['本批提测','A4:H14','second-meta'],['本批提测','A19:H35','second-summary'],['本批提测','A143:H151','second-findings'],['冒烟用例','J57:L57','second-weight-smoke'],['冒烟用例','J84:L84','second-rounding'],['UI检查','J25:L25','second-header'],['UI检查','J31:L34','second-text-format'],['UI检查','J44:L44','second-color-radius'],['需求对照','A76:H76','second-trace']]){
 const blob=await w.render({sheetName,range,scale:1.25,format:'png'});await fs.writeFile(`${root}/${name}.png`,new Uint8Array(await blob.arrayBuffer()));
}
console.log('Second review export and previews saved.');process.exit(0);
