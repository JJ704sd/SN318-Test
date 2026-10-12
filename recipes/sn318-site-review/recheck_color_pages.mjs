import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='./recipes/sn318-site-review',dir='./artifacts/smoke-ui';
const source=`${dir}/SN318_功能冒烟与界面交互验证_覆盖复核.xlsx`,path=`${dir}/SN318_冒烟与UI用例_飞书五色及实际页面复核.xlsx`;
const readJson=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const live=(await fs.readFile(`${root}/ui-color-page-recheck-live.ndjson`,'utf8')).replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(JSON.parse);
const manifest=await readJson(`${root}/ui-color-page-recheck-live.manifest.json`),field=await readJson(`${root}/color-field-live.json`),prd=await readJson(`${root}/product-color-page-live.json`),spec=await readJson(`${root}/spec-color-page-live.json`);
assert.equal(manifest.rev,642);assert.equal(manifest.records_count,22);assert.equal(manifest.has_more,false);assert.equal(prd.data.document.revision_id,8340);assert.equal(spec.data.document.revision_id,5256);
assert(field.data.field.description.includes('不需要 UI 出稿'));assert(field.data.field.description.includes('必要时 UI 补充布局'));
const clean=v=>(Array.isArray(v)?v.join('、'):String(v??'')).replace(/<at[^>]*>(.*?)<\/at>/g,'$1').trim(),level=r=>clean(r['框架适配判断']).replace(/^[^\u4e00-\u9fff]+/,'');
const valid=live.filter(r=>['页面/模块','当前原型问题','Review 建议','后续处理建议'].some(k=>clean(r[k])));
assert.equal(valid.length,21);
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const b=w.worksheets.getItem('本批提测'),u=w.worksheets.getItem('UI检查'),s=w.worksheets.getItem('冒烟用例'),site=w.worksheets.getItem('网站详情对照'),walk=w.worksheets.getItem('UI走查'),dev=w.worksheets.getItem('开发冒烟'),issues=w.worksheets.getItem('UI修改清单');
const get=(sh,a)=>sh.getRange(a).values[0][0],set=(sh,a,v)=>sh.getRange(a).values=[[v]],append=(sh,a,v)=>set(sh,a,`${get(sh,a)}\n${v}`),formula=(sh,a,v)=>sh.getRange(a).formulas=[[v]];
const preserved=[[b,'B7:B17'],[b,'D40:G61'],[b,'D115:G117'],[b,'D156:G160'],[u,'D6:I54'],[u,'M6:O54'],[u,'U6:V54'],[s,'D6:I96'],[s,'M6:O96'],[dev,'G7:M22'],[dev,'Q9:R9'],[walk,'H7:R55'],[walk,'U7:Y55'],[walk,'A62:N70'],[issues,'A7:U37']].map(([sh,a])=>({sh,a,v:sh.getRange(a).values,f:sh.getRange(a).formulas}));
const palette=new Map([['无法覆盖',['#FDE7E9','#991B1B']],['业务交互、信息待明确',['#F3F4F6','#374151']],['组合复用',['#E0F2FE','#075985']],['调整后复用',['#FEF3C7','#854D0E']],['直接复用',['#DCFCE7','#166534']]]);
const mapping=new Map();for(let r=6;r<=54;r++){const rid=get(u,`AB${r}`);if(rid){assert(!mapping.has(rid));mapping.set(rid,{id:get(u,`A${r}`),row:r});}}
assert.equal(mapping.size,21);assert.deepEqual([...mapping.keys()].sort(),valid.map(r=>r.record_id).sort());
for(const rec of valid){const {row}=mapping.get(rec.record_id);for(const [col,k]of [['P','优先级'],['Q','确认状态'],['S','当前处理角色'],['X','Review 类型'],['Y','当前原型问题'],['Z','Review 建议'],['AA','后续处理建议']])assert.equal(clean(get(u,`${col}${row}`)),clean(rec[k]),`${rec.record_id} ${k}`);assert.equal(get(u,`R${row}`),level(rec));}
// Conditional capability branches retain the source tier; missing controls do not become defects by assumption.
append(u,'J7','本次可见左侧仅系统配置/基础配置，先核实际展开、收起与当前路径；跨一级分类及手动多分类场景需至少2个含子菜单分类。本批入口未具备时记录测试条件受阻，不用基础配置的对象切换替代，也不直接认定全站不支持。');
append(u,'J14','主子列表定位前先激活对应详情页签并确认面板实际可见；Zone需切到成员后核查询/重置/刷新，不能点击DOM快照中未激活面板的同名按钮。');
append(u,'J16','Zone详情需先切到成员页签并确认表格可见，再核成员列表独立分页；不可仅从DOM快照含有分页文字就认定当前面板可操作。');
set(u,'J18','前置：按本批交付逐页确认是否提供勾选与批量操作；当前重新查看的国家、Zone列表没有勾选列，不能直接执行批量步骤。\n1.在实际提供该能力的服务单元/服务组合等批准页面记录未选中时Table顶部默认工具栏。\n2.勾选1行及多行，核批量按钮、操作对象、整行反馈和跨页范围。\n3.取消部分及全部选择，核恢复默认工具栏、页面底部和末行不被遮挡。\n不提供该能力的页面登记裁剪依据；本页面未见能力不能代表其他模块无能力。');
set(u,'K18','有勾选/批量能力的页面：至少选1行后在Table顶部显示批准批量操作；取消全部后恢复默认，不新增底部悬浮操作条。实际对象和跨页范围按SM28/DEC08。没有勾选/批量入口的当前页面不强加该组件，也不以普通编辑/停用代表批量验收；本批范围由交付确认。');
set(u,'J19','1.逐页核默认/hover背景、行高及字体；有Tag/Checkbox等实际组件时再核其规范。\n2.仅有行选择能力时勾选并比较主区及实际固定区同步选中；取消后核恢复。\n3.国家、Zone当前无勾选列：默认/hover和字体仍可查，勾选分支写明裁剪，不能把无Checkbox直接判失败。固定区检查须当前表格确有固定列/横向滚动。');
set(u,'K19','默认/hover、行高、字体及已有组件按批准框架；有选择能力时整行及固定区选中底色同步，取消恢复。没有选择、Tag或固定列的页面只裁剪对应分支，不自行新增组件或跳过仍适用的默认视觉检查。量值按UI20/批准基线。');
set(u,'J40',String(get(u,'J40')).replace('取得专项布局','确认本批标准组件组合布局；复杂布局必要时参考UI补充图，不以另出红色专项稿作为蓝色项的统一前置'));
set(u,'AI8','蓝色组合复用：开发按现有标准组件组合，必要时UI补充布局；核选中反馈、搜索/跨页及保存对象。PRD明确下单限制支持模糊搜索和跨页多选，数量呈现冲突按DEC22裁决，不因基础配置没有Checkbox而裁掉该业务能力。');
set(u,'AI40','蓝色组合复用：开发组合标准表单组件，必要时UI补充布局；按DEC23采用方案核新建独立页、滚动、返回及保存。需要确认采用布局，不能统一要求红色专项设计流程。');
set(walk,'E9','蓝色：开发组合标准选择组件，必要时UI补充布局；按DEC22核数量呈现，保留PRD明确的模糊搜索、跨页多选及保存对象。当前菜单未提供服务单元入口，不以国家/Zone列表代验。');
set(walk,'E41','蓝色：采用标准新建表单模板和批准组合布局，必要时UI补充图；按DEC23核独立页与返回/保存，不把专项UI出稿统一设为前置。当前需补服务单元入口。');
append(u,'J37','实际激活页签和面板后留截图；核截图可见组件与DOM一致。DOM快照可能含未激活面板，不能据隐藏面板内容判功能可见。异步关联字段分别记录加载中与加载完成，完整验收用最终状态，瞬时占位或已保存值不自动判展示错误。');
append(u,'J38','实际Tabs补充：Zone详情的基本信息/成员页签已在截图中确认；对其按本批Tabs规范检查。基础配置分组仍是导航按钮，不能用Zone详情有Tabs证明UI01一级分类已采用Tabs。');
append(u,'J39','Zone详情：先点击成员并核面板实际显示，再返回基本信息；核选中标记/内容同步和主子列表上下文。交付后的键盘及ARIA状态仍需按批准规范执行，单次点击观察不代替完整case。');
append(u,'J46','补核Zone成员编辑：先激活成员，再点击当前成员行编辑；右侧弹层的成员类型、成员对象、包含关系标必填，展示名称未标必填；标识不证明服务端约束。成员对象最初显示已保存值提示，加载完成后中国CN；分开记录加载中/最终值，按关联对象ID核最终名称/编码，加载失败恢复规则由本批批准方案确定。');
append(u,'K46','关联候选尚未加载完成时不把临时已保存ID直接判为最终展示缺陷；加载结束后以正确关联名称/编码核对。若失败/过期或无法解析，核批准的提示与重选路径，不凭数字/英语值本身推断关联错误。');
append(u,'J47','当前国家/Zone列表的行编辑及Zone成员编辑使用右侧编辑弹层；没有观察到表格单元格行内进入编辑。弹层编辑仅覆盖UI25/41/44/45/48对应分支，不作为本红色行内组件的覆盖证据；实际适用页面待DEC30确定。');
append(u,'J50','Zone成员编辑补充：按实际必填类型、对象与包含关系控件核默认值及异步候选回显；本次只读打开时成员对象最终中国CN。类型变化、候选搜索/清空、失败及保存读回须批准规则与专用数据后执行；不可把打开表单观察记作完整通过。');
append(u,'J53','Zone成员编辑取消后返回原Zone详情/成员上下文已观察，但未改字段；仅核入口返回，不证明修改后取消的数据保护。对编辑弹层、服务单元独立页、行内编辑分别按各自规则执行。');
append(s,'J48','实际成员入口已补核：详情先激活成员页签，再点击当前成员行编辑，打开右侧编辑弹层；成员类型/对象/包含关系标必填，展示名称未标必填。对象加载完成中国CN。只读取消回到详情，未保存；服务端约束、新增/合法修改/类型切换/包含排除/版本及真实命中仍按DEC28/29确认后执行。');
// Update stale overview facts, without recategorizing supplementary cases.
set(b,'B176','补充28条：UI19—UI34、UI37—UI41、UI43—UI49，来自UI规范、网站及公共基准，没有直接Review记录，独立归类。实际Zone详情Tabs可配套UI33/34；行编辑弹层不可代验红色UI42。');
set(b,'B177','2026-10-12重新读取飞书视图revision642及框架适配字段说明：22记录、21有效、绿色1空不生成case。颜色描述和角色分工保持来源；绿色不需另出UI稿，蓝色必要时补布局。https://example.invalid/source/e04459bb0b');
set(b,'F170','开发组合既有标准组件，必要时UI补充布局；核组合状态、选择反馈、返回及保存。不把红色专项设计流程套在蓝色项上。');
b.getRange('A196:H196').merge();set(b,'A196','飞书五色与实际页面再次复核');
for(const [r,text]of [[197,'有效来源映射21条全部一一对应：红3、白灰1、蓝2、黄1、绿14；补充28条独立，不冒充来源五色。原始绿色15含1空记录。PRD revision8340、UI规范revision5256、Review revision642已重新读取。'],[198,'本轮修正：UI13批量按实际能力适用；UI14保留默认视觉并按能力裁剪选择/固定区；UI35蓝色组合无需统一红色专项稿；补齐UI32可见面板与异步回显取证。'],[199,'网站补核：当前菜单仅见系统配置/基础配置；国家/Zone未见勾选列；Zone详情需先切成员页签，成员编辑为右侧弹层，最终对象中国CN；不是行内编辑。未提交或修改业务数据。'],[200,'本批页面执行明细补齐21个五色case的候选范围，并加入Zone详情Tabs与成员弹层相关补充case。服务单元/AI/行内页面入口未取得，保留待验证，不因本页未见而判全站不适用。所有正式执行记录仍未执行。']]){b.getRange(`A${r}:H${r}`).merge();set(b,`A${r}`,text);}
const url='https://localhost/pcs/system-config/master-data',zone=`${url}?group=routing&resource=reference_zone`,country=`${url}?group=location&resource=country`;
const observations=[
 ['WEB11','当前菜单与无选择的列表','本次展开左菜单截图仅系统配置/基础配置；内容区主数据/计价底座文字、5分组按钮、对象侧栏及页头新增保持。国家与Zone列表未见勾选列。','没有至少2个一级分类，UI02跨分类场景测试条件未具备；本账户可见菜单不证明全站未交付服务单元/AI。单页无Checkbox不代表全站无批量。','UI01、UI02、UI06、UI13、UI14','分组导航不当一级Tabs；批量/选择分支按实际能力；默认视觉仍可核','DEC01、DEC02、DEC18',country],
 ['WEB12','Zone详情实际Tabs与成员面板','截图确认右侧详情有基本信息/成员页签。先切成员后表格实际可见，成员country/1/include/—，独立查询/重置/刷新、20条/页及跳页；操作区固定阴影可见。DOM快照会包含未激活面板。','未测>20、多页、横向实际滚动、键盘/ARIA、固定区量值；仅看到隐藏面板DOM不等于可交互。Zone详情不能代验服务单元绿色UI18。','UI09、UI11、UI12、UI15、UI32、UI33、UI34、UI41','页面能力定位需激活页签并确认截图；有Tabs不证明基础配置一级Tabs已改','DEC18、DEC29',zone],
 ['WEB13','Zone成员编辑与异步关联回显','成员面板行编辑成功打开右侧编辑弹层；成员类型/成员对象/包含关系标必填，展示名称未标必填。对象先提示已保存值，加载完显示中国CN，类型国家/关系包含。未改值，取消返回原详情。','未保存、未改字段；不证明服务端必填、合法保存、变更取消、类型级联、搜索/失败恢复、真实分区命中或历史版本。弹层不是表格行内编辑。','SM43、UI25、UI32、UI41、UI44、UI45、UI48','避免把临时ID占位当最终错误；不把右侧编辑弹层错配红色UI42','DEC18、DEC28、DEC29、DEC30',zone]
];
site.getRange('A16:H18').values=observations;
set(site,'D15','首次观察主记录编辑已取消；成员编辑当时未成功。此次先激活成员页签已补核字段与最终回显，详见WEB13。未保存或变更；默认状态、版本/历史、包含排除冲突、真实匹配、成员新增及删除保护仍未验证。');
const expand=(sh,name,area)=>{const t=sh.tables.items.find(t=>t.name===name),style=t.style;t.delete();sh.tables.add(area,true,name).style=style;};
expand(site,'SiteEvidence','A5:H18');
site.getRange('A20:H20').merge();set(site,'A20','21条五色Review与实际页面逐项对应');
site.getRange('A21:H21').merge();set(site,'A21','源色分组对应准确；本表记录当前能核的页面与欠缺条件，不是执行通过表。原型/设计完成状态不等于实现或测试通过；未获得入口的业务场景继续保留。');
site.getRange('A23:H23').values=[['UI case','飞书适配层级','来源记录与目标场景','当前实际页面核查','现状/未验证边界','按颜色执行策略','相关补充/待决口径','来源记录链接']];
const pending=new Set(['UI03','UI04','UI16','UI18','UI35','UI36','UI42']);
const actual={
 UI01:['基础配置：分组文字、导航按钮、对象侧栏、页头新增均已重新查看。','仅观察当前结构；专项一级Tabs/新增下沉方案未取得本批采用证据。','UI33、UI34；DEC01'],
 UI02:['当前左菜单仅一个一级系统配置及基础配置子项，已展开查看。','只能核当前路径；跨分类/手动多分类需新增测试条件，未完整验收。','DEC02；不能用对象菜单切换代验'],
 UI03:['当前可见菜单无服务单元入口；需求和静态新建图仍支持来源对照。','下单限制模糊搜索、跨页选择/保存未现场执行；数值显示冲突留DEC22。','SM63；DEC22'],
 UI04:['当前未取得服务单元禁用编排入口。','不得以国家/Zone普通停用按钮代替禁用编排Warning及业务影响。','UI28；SM22'],
 UI05:['基础配置有页头业务说明及分组帮助文案，可先逐项盘点。','保留/删除清单需产品明确，不能把全部说明均判多余。','产品文案清单'],
 UI06:['展开左菜单确认系统配置图标、选中子菜单及层级。','仅现有路径样本；全菜单量值/状态须批准框架及完整范围。','UI19、UI27、UI39'],
 UI07:['顶部SN318标识与账户、内容区页头可见；未见搜索/消息入口。','功能隐藏与标题取舍按交付/产品；未见入口不证明被正确实现或应该删除。','UI19、UI39'],
 UI08:['国家/Zone对象均在基础配置页头下；面包屑、说明和新增按钮可核。','全部交付页头与视口未逐页覆盖；副标题删除需采用文案口径。','UI24、UI27、UI40'],
 UI09:['国家/Zone主列表及成员子表查询、重置、刷新可见；成员需先切页签。','查询/重置触发与全对象映射未执行；主子作用域需分开。','UI43、UI47；DEC09'],
 UI10:['国家/Zone表格容器、字段、行操作可见。','框架量值/无顶部工具栏Padding/长数据/全表格尚未量测验收。','UI20、UI21、UI26'],
 UI11:['国家/Zone主表与Zone成员面板有20条/页、总数/页码/跳页。','仅1条样本；无数据、多页、非法跳页、容量变化尚未执行。','UI43；SM08仅部分'],
 UI12:['Zone成员截图有横向截列与右侧操作固定区阴影；没有勾选列。','实际左右滚动及固定列边界未执行；不强加Checkbox。','UI20、UI26；实际固定字段确认'],
 UI13:['国家/Zone当前仅单行操作，没有勾选/批量入口。','本页按能力裁剪；真正支持批量的业务页仍需执行，不由观察判全站不支持。','SM28；DEC08'],
 UI14:['当前列表默认视觉可核；无勾选列，Zone成员固定操作区可见。','保留默认/hover字体检查，勾选/Tag/固定区分支按实际能力。','UI20、UI39'],
 UI15:['编码当前普通文本；Zone查看详情打开该Zone右侧详情。','其他模块编码详情合同及完整返回路径仍需验证。','DEC04'],
 UI16:['当前可见菜单无AI建档入口。','独立表单页、24px、步骤导航/上传/解析确认尚未现场核。','UI37、UI38；DEC05/17'],
 UI17:['对象URL含group/resource，实际国家切换Zone已观察。','本轮未浏览器刷新/前进返回；切换不代替路由保持验收。','SM04；UI48'],
 UI18:['实际Zone有Drawer，但来源目标是服务单元详情，当前未取得该入口。','不能用Zone Drawer代验服务单元分组、固定操作、emoji和上下文。','UI26；DEC03'],
 UI35:['当前未取得服务单元新建入口；源图只支持静态区域。','新建独立页/保存待生效或启用/返回尚未现场操作；按组合方案确认DEC23。','UI31、UI48；DEC23'],
 UI36:['基础配置页头新增国家/Zone已观察，未取得服务单元两个创建入口。','不能用基础配置新增验证AI建档/新建服务单元页头位置及重复标题。','UI08；本批服务单元入口'],
 UI42:['国家/Zone行编辑及Zone成员编辑为右侧弹层；未见表格行内入口。','行内页面、字段、保存/取消、键盘失焦规范待DEC30；弹层不计覆盖。','UI44、UI48；DEC30']
};
const recordUrl='https://example.invalid/source/e04459bb0b';
const mappedIds=valid.map(rec=>mapping.get(rec.record_id).id);
for(let i=0;i<valid.length;i++){const rec=valid[i],{id,row}=mapping.get(rec.record_id),r=24+i,[facts,gaps,refs]=actual[id];site.getRange(`A${r}:H${r}`).values=[[id,level(rec),`${rec.record_id}\n${clean(rec['页面/模块'])}：${get(u,`C${row}`)}\n来源状态：${clean(rec['确认状态'])}`,facts,gaps,null,refs,`${recordUrl}&record=${rec.record_id}`]];formula(site,`F${r}`,`='UI检查'!AI${row}`);const [fill,ink]=palette.get(level(rec));site.getRange(`A${r}:B${r}`).format.fill=fill;site.getRange(`A${r}:B${r}`).format.font={name:'Arial',size:10,color:ink};}
site.tables.add('A23:H44',true,'ReviewPageMapping').style='TableStyleMedium2';
site.getRange('A46:H46').merge();set(site,'A46','补充28条无直接Review记录，不强行标五色。UI33/34用于实际Zone详情Tabs；UI41/45/48用于成员编辑；这些补充验证不能把同组件的不同业务目标自动标为来源case通过。');
// Fill only unused execution-plan rows; existing input/selection/evidence records stay intact.
const already=new Set(walk.getRange('B62:B111').values.map(r=>r[0]).filter(Boolean));
const targets={UI02:'左侧菜单·多分类导航',UI03:'服务单元·下单限制选择',UI04:'服务单元·禁用编排',UI05:'基础配置·业务说明清单',UI06:'左侧菜单·视觉状态',UI07:'基础配置·顶部导航',UI08:'基础配置国家·页头',UI10:'国家·列表容器',UI12:'Zone成员·横向固定列',UI13:'支持批量的业务列表·工具栏',UI14:'国家·默认/hover行样式',UI16:'AI建档·独立表单页',UI17:'基础配置Zone·刷新路由',UI18:'服务单元·详情Drawer',UI35:'服务单元·新建独立页',UI36:'服务单元列表·创建入口',UI42:'批准适用页面·行内编辑'};
const newPageEntries=[];let next=72;
for(const id of mappedIds){if(already.has(id))continue;while(get(walk,`A${next}`)||get(walk,`B${next}`)){next++;assert(next<=111);}
 const r=next++,row=Number(id.slice(2))+5,scene=targets[id],route=pending.has(id)||id==='UI13'?'需求业务入口（实际菜单/URL待取得；保留待交付验证）':id==='UI02'||id==='UI06'||id==='UI07'?`左侧/顶部框架；${country}`:id==='UI12'||id==='UI17'?zone:country;
 walk.getRange(`A${r}:N${r}`).values=[[`RVPG-${id}`,id,`${scene}·视口待补`,route,'待选择',`按case完整适用步骤执行；${actual[id][1]}\n本候选来自需求目标与本次入口核查，不是已执行记录。`,null,'未执行',null,null,null,null,null,null]];newPageEntries.push({row:r,id,scene});already.add(id);
}
for(const [id,scene,ref]of [['UI33','Zone详情·Tabs结构',zone],['UI34','Zone详情·Tabs切换',zone],['UI48','Zone成员编辑·取消返回',zone]]){while(get(walk,`A${next}`)||get(walk,`B${next}`))next++;const r=next++;assert(r<=111);walk.getRange(`A${r}:N${r}`).values=[[`WEBPG-${id}`,id,`${scene}·视口待补`,ref,'待选择','先激活实际面板；按该case全部批准分支执行。本次只读入口观察不作为完整测试结果。',null,'未执行',null,null,null,null,null,null]];newPageEntries.push({row:r,id,scene});}
set(walk,'F71','Zone详情先切成员确认可见，列表country/1/include/—与编辑加载完成国家/中国CN/包含对应；分开核临时已保存ID与最终值。成员编辑为右侧弹层，未改值取消已观察；保存、变化取消、版本及真实命中未执行。');
set(walk,'A58','当前预置30行候选：保留原10个示例，补17个五色来源场景及3个Zone补充场景；21个五色case均有候选范围。仍须按真实交付补齐全部页面/对象与状态，不代表完整覆盖，未取得业务入口也不自动判不适用。');
// Local formatting extends the existing workbook; changing steps may require more row height.
for(const [sh,area]of [[site,'A16:H18'],[site,'A20:H46'],[b,'A196:H200'],[walk,'A72:N91']]){sh.getRange(area).format.wrapText=true;sh.getRange(area).format.verticalAlignment='center';sh.getRange(area).format.font={name:'Arial',size:10,color:'#25324A'};}
for(const [sh,area]of [[site,'A20:H20'],[site,'A23:H23'],[b,'A196:H196']]){sh.getRange(area).format.fill='#213B62';sh.getRange(area).format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};sh.getRange(area).format.rowHeightPx=55;}
site.getRange('A16:H18').format.rowHeightPx=240;site.getRange('A21:H21').format.rowHeightPx=75;site.getRange('A24:H44').format.rowHeightPx=200;site.getRange('A46:H46').format.rowHeightPx=75;
for(let i=0;i<valid.length;i++){const r=24+i,[fill,ink]=palette.get(level(valid[i]));site.getRange(`A${r}:B${r}`).format.fill=fill;site.getRange(`A${r}:B${r}`).format.font={name:'Arial',size:10,color:ink};}
walk.getRange('A72:N91').format.fill='#FFF4D6';walk.getRange('A72:R91').format.rowHeightPx=220;b.getRange('A197:H200').format.rowHeightPx=85;b.getRange('B176:H177').format.rowHeightPx=95;
for(const [sh,rows,end]of [[u,[7,14,16,18,19,37,38,39,40,46,47,50,53],'AM'],[s,[48],'AB']])for(const r of rows){const values=sh.getRange(`A${r}:${end}${r}`).values[0];const heights=values.map((v,i)=>String(v??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length*12/Math.max(45,(sh.getCell(r-1,i).format.columnWidthPx||120)-18))),0)*18+24);sh.getRange(`A${r}:${end}${r}`).format.rowHeightPx=Math.max(sh.getRange(`A${r}`).format.rowHeightPx||150,...heights);}
for(const p of preserved){const now=p.sh.getRange(p.a).values;for(let i=0;i<now.length;i++)for(let j=0;j<now[i].length;j++)if(!p.f[i][j])assert.equal(now[i][j],p.v[i][j],`preserve input ${p.a} ${i}/${j}`);assert.deepEqual(p.sh.getRange(p.a).formulas,p.f,`preserve formulas ${p.a}`);}
w.recalculate();
const counts={};for(const rec of valid)counts[level(rec)]=(counts[level(rec)]||0)+1;assert.deepEqual(counts,{'无法覆盖':3,'直接复用':14,'业务交互、信息待明确':1,'组合复用':2,'调整后复用':1});
for(const rec of valid){const {row}=mapping.get(rec.record_id);assert.equal(get(u,`R${row}`),level(rec));assert.equal(get(u,`AB${row}`),rec.record_id);}
assert.equal(u.getRange('AB6:AB54').values.filter(r=>r[0]).length,21);assert.equal(newPageEntries.length,20);for(const id of mappedIds)assert(walk.getRange('B62:B111').values.some(v=>v[0]===id));
assert.equal(get(b,'B6'),'未就绪');for(const a of ['B22','F22','H22'])assert.equal(get(b,a),0);assert.equal(get(dev,'E4'),0);assert.equal(get(walk,'E4'),0);assert.equal(get(issues,'E4'),0);
for(const [sh,end]of [[u,54],[s,96]])for(let r=6;r<=end;r++)assert.equal(get(sh,`G${r}`),'未执行');for(let r=62;r<=111;r++)assert.equal(get(walk,`H${r}`),'未执行');
assert(String(get(u,'J40')).includes('必要时'));assert(!String(get(u,'J40')).includes('取得专项布局'));assert(String(get(u,'J18')).includes('没有勾选列'));assert(String(get(u,'J46')).includes('加载完成'));assert(String(get(u,'J47')).includes('不作为本红色行内组件'));assert(String(get(b,'B176')).includes('28'));
const errors=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},maxChars:1800});assert(errors.ndjson.includes('matched 0 entries'),errors.ndjson);
await (await SpreadsheetFile.exportXlsx(w)).save(path);
await fs.writeFile(`${root}/color-page-review-verification.json`,JSON.stringify({path,reviewRevision:642,prdRevision:8340,uiSpecRevision:5256,counts,sourceRows:22,validMappings:21,supplementary:28,pageCandidates:30,observations,newPageEntries,allUnexecuted:true,formulaErrors:0},null,2));
for(const [sheetName,range,name]of [['网站详情对照','A23:F28','color-page-map-red'],['网站详情对照','A39:F44','color-page-map-tail'],['网站详情对照','A16:D18','color-page-observations'],['UI检查','J18:K19','color-page-capability-cases'],['UI检查','J40:K40','color-page-blue-case'],['本批提测','A196:H200','color-page-summary']]){const p=await w.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(`${root}/${name}.png`,new Uint8Array(await p.arrayBuffer()));}
console.log(JSON.stringify({path,validMappings:21,supplementary:28,pageCandidates:30,counts,formulaErrors:0}));
