import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='./recipes/sn318-site-review';
const out='./artifacts/smoke-ui';
const source=`${out}/SN318_提测前冒烟与UI规范_颜色层级对应.xlsx`;
const path=`${out}/SN318_提测前冒烟与UI规范_颜色层级对应_复查修正.xlsx`;
const audit=JSON.parse(await fs.readFile(`${root}/color-independent-audit.json`,'utf8'));
const beforeSource=(await fs.readFile(`${root}/ui-color-live.ndjson`,'utf8')).replace(/^\uFEFF/,'').trim();
const nowSource=(await fs.readFile(`${root}/ui-color-recheck.ndjson`,'utf8')).replace(/^\uFEFF/,'').trim();
assert.equal(beforeSource,nowSource,'Current Feishu records unchanged');
const report=JSON.parse(await fs.readFile(`${root}/color-verification.json`,'utf8'));
const palette=new Map([['无法覆盖',{color:'红色',fill:'#FDE7E9',ink:'#991B1B'}],['业务交互、信息待明确',{color:'白灰色',fill:'#F3F4F6',ink:'#374151'}],['组合复用',{color:'蓝色',fill:'#E0F2FE',ink:'#075985'}],['调整后复用',{color:'黄色',fill:'#FEF3C7',ink:'#854D0E'}],['直接复用',{color:'绿色',fill:'#DCFCE7',ink:'#166534'}]]);
// Link only overlapping functional checks; same-page proximity is not coverage.
const mapping={
 UI01:{ids:['SM03','SM11'],scope:'仅基础配置分组/对象切换与新增目标。Tabs层级、布局和量值仍由UI01验收。'},
 UI02:{ids:[],scope:'跨分类折叠菜单在UI02本身执行；SM03已限定基础配置对象导航，SM04测刷新/返回，均不覆盖菜单自动收起。'},
 UI03:{ids:['SM28','SM63'],scope:'对应跨页选择、选中对象及保存不丢失；Checkbox/Tag/数量呈现由UI03及DEC22判定。'},
 UI04:{ids:['SM22'],scope:'对应禁用编排后的业务影响；图标、风险语义及取消交互由UI04验证。'},
 UI05:{ids:[],scope:'由UI05逐页按产品文案清单核对。SM05测请求加载/反馈，不覆盖原型说明文字清理。'},
 UI06:{ids:[],scope:'菜单字体、缩进、图标、视觉状态由UI06验证；不以基础配置对象导航SM03代替。'},
 UI07:{ids:[],scope:'顶部导航布局及无功能入口由UI07验证；当前功能库没有直接对应同一导航检查的SM条目。'},
 UI08:{ids:[],scope:'面包屑、副标题、操作对齐由UI08验证。SM03/SM11/SM21不直接检查这些组件。'},
 UI09:{ids:['SM06','SM07','SM58'],scope:'对应命中/空结果、查询重置及地点即时检索；仅复用本批实际对象分支，控件布局与量值由UI09验证。'},
 UI10:{ids:[],scope:'容器Padding、列适配与表格视觉由UI10验证；已有数据或分页结果不能覆盖这些量值。'},
 UI11:{ids:['SM08'],scope:'对应基础配置分页记录/总数；其他模块需按实际交付数据执行UI11，不由SM08代表全站。'},
 UI12:{ids:[],scope:'横向滚动固定列及分隔样式在UI12验证；SM28未写横向滚动，不把批量范围检查当固定列覆盖。'},
 UI13:{ids:['SM28'],scope:'对应选择后批量执行对象与范围；操作栏位置、遮挡及恢复默认状态由UI13验证。'},
 UI14:{ids:['SM28'],scope:'仅对应实际选择对象与范围；整行高亮、固定区底色和字体由UI14验证。'},
 UI15:{ids:[],scope:'编码是否可点击、详情目标及返回在UI15直接执行；SM03/SM12/SM31没有明确同一编码点击分支，不作直接配套。'},
 UI16:{ids:['SM27'],scope:'对应解析/确认/保存流程；页面承载、步骤布局与留白由UI16验证。'},
 UI17:{ids:['SM04'],scope:'对应刷新/返回上下文；状态保留范围按本批批准规则，不默认保存未提交字段。'},
 UI18:{ids:['SM82'],scope:'SM82仅覆盖本批对应模块打开/关闭当前或历史详情及对象/只读边界。Drawer、固定操作区/滚动/emoji由UI18验证，不以SM30编辑影响替代。'},
 UI35:{ids:['SM21','SM29'],scope:'对应服务单元创建、必填及保存读回；独立页面、返回与未保存保护由UI35及DEC23直接验证。'},
 UI36:{ids:['SM21','SM27'],scope:'对应人工创建/AI建档目标流程；入口位置及重复标题由UI36验证，按钮可用不等于位置符合。'},
 UI42:{ids:['SM02','SM05'],scope:'仅通用权限及加载/成功/失败反馈参考，需DEC30确认适用页面后选择。当前SM12/SM13针对基础配置编辑表单，不覆盖行内编辑保存/取消；行内状态与数据保护在UI42专项执行。'}
};
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const b=w.worksheets.getItem('本批提测'),s=w.worksheets.getItem('冒烟用例'),u=w.worksheets.getItem('UI检查');
const get=(sh,a)=>sh.getRange(a).values[0][0],set=(sh,a,v)=>sh.getRange(a).values=[[v]];
const preserved=[[b,'B7:B17'],[b,'D40:G61'],[b,'D115:G117'],[b,'D156:G160'],[b,'B33:B36'],[s,'D6:H96'],[s,'M6:R96'],[u,'D6:H47'],[u,'M6:V47'],[u,'X6:AB47']].map(([sh,r])=>({sh,r,values:sh.getRange(r).values}));
const resultFormulas=[s.getRange('I6:I96').formulas,u.getRange('I6:I47').formulas];
const checks=[];const eq=(sh,a,v,label)=>{assert.equal(get(sh,a),v,label);checks.push(label);};
const parseIds=v=>[...String(v).matchAll(/(SM|UI)(\d+)(?:[—–-](?:SM|UI)?(\d+))?/g)].flatMap(m=>Array.from({length:Number(m[3]??m[2])-Number(m[2])+1},(_,i)=>`${m[1]}${String(Number(m[2])+i).padStart(2,'0')}`));
const decisions=new Map();for(const r of [...Array.from({length:22},(_,i)=>40+i),115,116,117,156,157,158,159,160])decisions.set(r,{id:get(b,`A${r}`),cases:parseIds(get(b,`C${r}`))});
const cases=new Map();for(const [sh,last,col]of [[s,96,'V'],[u,47,'AF']])for(let r=6;r<=last;r++)cases.set(get(sh,`A${r}`),{sh,r,col});
// Reproduce the incorrect global layout gate before changing any formulas.
const trial=[[b,'B7:B17'],[b,'D40:G61'],[u,'D7:H7'],[u,'M7:V7'],[s,'D15:H15']].map(([sh,r])=>({sh,r,values:sh.getRange(r).values}));
for(const [a,v]of [['B7','复核模拟批次'],['B8','AUDIT-BUILD'],['B9','复核模拟交付'],['B10','复核模拟需求'],['B11','复核模拟UI'],['B12','已确认'],['B15','复核模拟账号'],['B16','2026-10-12'],['B17','已核对'],['F41','已确认'],['G41','复核模拟菜单方案'],['F57','已确认'],['G57','复核模拟UI基线'],['F45','已确认'],['G45','复核模拟航司格式']])set(b,a,v);
set(u,'D7','是');set(u,'F7','已确认');set(s,'D15','是');set(s,'F15','已确认');
eq(b,'H40','库内待选择','Unrelated base-configuration layout is not selected');eq(b,'H41','已确认','Menu-specific decision is approved');eq(u,'AF7','待确认','Reproduce unrelated DEC01 blocking UI02');eq(s,'V15','待确认','Reproduce unrelated DEC01 blocking airline required-fields case');
const removed=[];
for(const [cid,{sh,r,col}]of cases){
 const before=sh.getRange(`${col}${r}`).formulas[0][0];
 const oldRefs=[...new Set([...before.matchAll(/'本批提测'!\$H\$(\d+)/g)].map(m=>Number(m[1])))];
 const relevant=[...decisions].filter(([,d])=>d.cases.includes(cid)).map(([dr])=>dr);
 for(const dr of oldRefs.filter(dr=>!relevant.includes(dr)))removed.push({case:cid,decision:decisions.get(dr)?.id,row:dr});
 const deferred=new Set([40,41,42,115]);
 const invalid=[`LEN(TRIM('本批提测'!$B$10))=0`,`LEN(TRIM('本批提测'!$B$11))=0`,`'本批提测'!$B$12<>"已确认"`,`F${r}<>"已确认"`,...relevant.map(dr=>deferred.has(dr)?`AND('本批提测'!$H$${dr}<>"已确认",'本批提测'!$H$${dr}<>"已记录后置")`:`'本批提测'!$H$${dr}<>"已确认"`)];
 sh.getRange(`${col}${r}`).formulas=[[`=IF(D${r}="否","不适用",IF(D${r}<>"是","未纳入本批",IF(OR(${invalid.join(',')}),"待确认","已确认")))`]];
 if(oldRefs.some(dr=>!relevant.includes(dr))){const review=cid.startsWith('UI')?'AG':'W',note=cid.startsWith('UI')?'AH':'X';set(sh,`${review}${r}`,'复查修正');set(sh,`${note}${r}`,`${get(sh,`${note}${r}`)||''}\n移除不属于本条的DEC01基础配置布局门槛，保留本条实际关联决策及全部执行前提。`);}
}
assert.equal(removed.length,54);assert(removed.every(x=>x.decision==='DEC01'));assert.deepEqual(removed.map(x=>x.case).sort(),audit.extraDependencies.map(x=>x.case).sort());
eq(u,'AF7','已确认','Menu basis no longer blocked by unrelated layout');eq(s,'V15','已确认','Airline basis no longer blocked by unrelated layout');
set(b,'F41','待确认');eq(u,'AF7','待确认','Real menu decision remains required');set(b,'F41','已确认');set(b,'F57','待确认');eq(u,'AF7','待确认','General UI baseline remains required');set(b,'F57','已确认');
set(b,'F45','待确认');eq(s,'V15','待确认','Real airline format decision remains required');set(b,'F45','已确认');
set(u,'D6','是');set(u,'F6','已确认');eq(u,'AF6','待确认','UI01 still requires its own DEC01 layout decision');set(u,'D6','待选择');set(u,'F6','待确认');
for(const [a,v]of [['G7','通过'],['H7','AUDIT-BUILD'],['M7','复核模拟实际结果'],['O7','复核模拟执行人'],['U7','复核模拟交付'],['V7',get(b,'B18')]])set(u,a,v);
eq(u,'I7','通过','Evidence-complete menu case can pass independently of unrelated layout');set(u,'M7','');eq(u,'I7','缺少证据','Missing evidence still blocks effective pass');set(u,'M7','复核模拟实际结果');set(b,'B15','');eq(u,'I7','批次未就绪','Missing account still blocks pass');
for(const p of trial)p.sh.getRange(p.r).values=p.values;
const correctedLinks=[];const perCase=report.perCase.map(row=>{assert(mapping[row.id],row.id);const prior=row.related||[],next=mapping[row.id].ids;if(JSON.stringify(prior)!==JSON.stringify(next))correctedLinks.push({id:row.id,before:prior,after:next});return {...row,related:next,scope:mapping[row.id].scope};});assert.equal(correctedLinks.length,10);
set(u,'AJ5','配套功能case（局部覆盖）');set(u,'AM5','功能关联范围');
u.getRange('AM6:AM47').values=Array.from({length:42},()=>[null]);
for(const row of perCase){set(u,`AJ${row.row}`,row.related.join('、')||'无直接配套；本UI case独立执行');set(u,`AM${row.row}`,row.scope);set(u,`AL${row.row}`,`${get(u,`AL${row.row}`)}\n颜色及Review→UI case为飞书直接映射；功能配套为测试设计关联，具体覆盖范围见AM。`);}
u.getRange('AM5:AM47').format.font={name:'Arial',size:10,color:'#25324A'};u.getRange('AM5:AM47').format.wrapText=true;u.getRange('AM5:AM47').format.verticalAlignment='center';u.getRange('AM1:AM47').format.columnWidthPx=470;u.getRange('AM5').format.fill='#213B62';u.getRange('AM5').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};
const reverse=new Map();for(const row of perCase)for(const cid of row.related){const list=reverse.get(cid)||[];list.push(row);reverse.set(cid,list);}
s.getRange('Z6:Z96').format.fill='#FFFFFF';s.getRange('Z6:Z96').format.font={name:'Arial',size:10,color:'#25324A'};
for(let r=6;r<=96;r++){const rows=reverse.get(get(s,`A${r}`))||[],names=[...new Set(rows.map(x=>x.level))];s.getRange(`Y${r}:Z${r}`).values=[[rows.map(x=>x.id).join('、')||null,names.length?names.map(n=>`${palette.get(n).color}：${n}（局部配套）`).join('；'):'功能专项，无直接Review配套']];if(names.length===1){const d=palette.get(names[0]);s.getRange(`Z${r}`).format.fill=d.fill;s.getRange(`Z${r}`).format.font={name:'Arial',size:10,color:d.ink};}}
const groups=report.groups.map(group=>({...group,related:[...new Set(perCase.filter(x=>x.level===group.level).flatMap(x=>x.related))].sort((a,b)=>Number(a.slice(2))-Number(b.slice(2)))}));
for(const [i,g]of groups.entries()){const chunks=Array.from({length:Math.ceil(g.related.length/4)},(_,n)=>g.related.slice(n*4,n*4+4).join('、')).join('\n');set(b,`G${168+i}`,chunks||'无直接配套；UI case独立执行');}
set(b,'G167','配套功能case（局部覆盖）');set(b,'F173','Review→UI case每条映射一次；功能配套仅覆盖重叠检查点，具体范围见UI检查AM列。');
set(b,'A110','独立复查：五色主映射正确，飞书仍为rev637。修正10处过宽功能关联及54条误关联DEC01的依据门槛；保留133条用例、原输入及全部未执行结果。');
set(b,'A179','独立复查修正');b.getRange('B179:H179').merge();set(b,'B179','主颜色映射不变；功能配套收紧到相同检查点，并明确局部覆盖。54条检查曾错误依赖DEC01，现仅保留决策表声明的真实关联，基础配置布局仍约束UI01。');
b.getRange('A179:H179').format.font={name:'Arial',size:10,color:'#25324A'};b.getRange('A179:H179').format.wrapText=true;b.getRange('A179:H179').format.verticalAlignment='center';b.getRange('A179:H179').format.rowHeightPx=95;
set(u,'A4','颜色/Review→UI case按飞书直接对应；AJ/AM为功能局部配套及覆盖范围，不把同页检查当同一覆盖。移除误关联DEC01，保留本条实际决策和执行前提；全部133条检查仍未执行。');
for(const [sh,last,end]of [[s,96,'Z'],[u,47,'AM']])for(let r=6;r<=last;r++){const vals=sh.getRange(`A${r}:${end}${r}`).values[0];const lines=vals.map((v,i)=>String(v??'').split('\n').reduce((n,l)=>n+Math.max(1,Math.ceil(l.length*12/Math.max(45,(sh.getCell(r-1,i).format.columnWidthPx||120)-18))),0));sh.getRange(`A${r}:${end}${r}`).format.rowHeightPx=Math.max(sh.getRange(`A${r}`).format.rowHeightPx||150,...lines.map(n=>n*18+28));}
const table=u.tables.items[0],style=table.style,name=table.name;table.delete();u.tables.add('A5:AM47',true,name).style=style;
for(const p of preserved)assert.deepEqual(p.sh.getRange(p.r).values,p.values,`preserved ${p.r}`);
assert.deepEqual(s.getRange('I6:I96').formulas,resultFormulas[0]);assert.deepEqual(u.getRange('I6:I47').formulas,resultFormulas[1]);
for(const [cid,{sh,r,col}]of cases){const refs=[...new Set([...sh.getRange(`${col}${r}`).formulas[0][0].matchAll(/'本批提测'!\$H\$(\d+)/g)].map(m=>Number(m[1])))].sort((a,b)=>a-b);const expected=[...decisions].filter(([,d])=>d.cases.includes(cid)).map(([r])=>r).sort((a,b)=>a-b);assert.deepEqual(refs,expected,`Exact decision edges ${cid}`);assert.equal(get(sh,`G${r}`),'未执行');}
w.recalculate();eq(b,'B6','未就绪','Final batch metadata restored');for(const c of ['B22','F22','H22'])eq(b,c,0,`Final ${c} stays zero`);eq(b,'C173',22,'Source group count unchanged');eq(b,'D173',21,'Mapped Review count unchanged');
const errors=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},maxChars:1500});assert(errors.ndjson.includes('matched 0 entries'),errors.ndjson);
await (await SpreadsheetFile.exportXlsx(w)).save(path);
await fs.writeFile(`${root}/color-repaired-verification.json`,JSON.stringify({path,sourceUnchanged:true,correctedLinks,removedDependencies:removed,groups,perCase,checks,formulaErrors:errors.ndjson,totalCases:133,allResults:'未执行'},null,2));
console.log(JSON.stringify({path,correctedLinks:correctedLinks.length,removedDependencies:removed.length,checks:checks.length,total:133}));
for(const [sheetName,range,name]of [['本批提测','A167:H173','recheck-color-summary'],['UI检查','AJ23:AM23','recheck-detail-link'],['UI检查','AJ47:AM47','recheck-inline-link'],['UI检查','AJ7:AM10','recheck-unmapped'],['冒烟用例','Y10:Z10','recheck-feedback']]){const p=await w.render({sheetName,range,scale:1.1,format:'png'});await fs.writeFile(`${root}/${name}.png`,new Uint8Array(await p.arrayBuffer()));}
console.log('Rechecked correspondence exported.');process.exit(0);
