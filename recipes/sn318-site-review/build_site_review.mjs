import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const root='./recipes/sn318-site-review';
const out='./artifacts/smoke-ui';
const input=`${out}/SN318_提测前冒烟与UI规范_二次复核修正.xlsx`;
const path=`${out}/SN318_提测前冒烟与UI规范_网站对照修订.xlsx`;
const observations=JSON.parse(await fs.readFile(`${root}/site_observations.json`,'utf8'));
observations.observations=observations.observations.filter(e=>!['WEB09','WEB10'].includes(e.id));
observations.observations.push(
 {id:'WEB09',object:'航线区域列表与国家关系详情',url:'https://localhost/pcs/system-config/master-data?group=routing&resource=air_region',facts:'列表为编码、名称、状态、操作；行有查看详情、编辑、停用、删除，页头新增航线区域，关键词编码或名称、状态筛选。详情含基本信息及国家关系子列表，子列表为国家、状态、操作，具查询/重置/刷新及编辑/停用/删除；当前国家显示数字1。主表和子表同名操作必须区分作用域。',boundary:'只读打开详情；未核主记录或国家关系编辑表单、成员新增入口及保存/删除/关联历史。'},
 {id:'WEB10',object:'Zone列表、主记录编辑与成员详情',url:'https://localhost/pcs/system-config/master-data?group=routing&resource=reference_zone',facts:'列表为编码、名称、服务商范围、方案编码、版本、状态、操作；关键词编码、名称、服务商或方案编码。行有查看详情/编辑/停用/删除，页头新增Zone。编辑主记录：编码只读，名称/服务商范围/方案编码/状态标必填，备注0/500；服务商范围样本通用。详情基本信息＋成员表，列为成员类型、成员对象、包含关系、展示名称、操作；样本country / 1 / include / —，成员有编辑/删除。',boundary:'主记录编辑已取消，未保存。成员编辑入口一次未成功打开，表单未核实。未证明默认待生效、版本递增、历史版本、包含排除冲突、真实匹配、成员新增路径及删除保护。'}
);
await fs.writeFile(`${root}/site_observations.json`,JSON.stringify(observations,null,2),'utf8');
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(input));
const b=w.worksheets.getItem('本批提测'),s=w.worksheets.getItem('冒烟用例'),u=w.worksheets.getItem('UI检查'),t=w.worksheets.getItem('需求对照');
const set=(sh,a,v)=>sh.getRange(a).values=[[v]],get=(sh,a)=>sh.getRange(a).values[0][0];
const preserved=[[b,'B7:B17'],[b,'D40:G61'],[b,'D115:G117'],[b,'B33:B36'],[s,'D6:H93'],[s,'M6:R93'],[u,'D6:H45'],[u,'M6:V45']].map(([sh,r])=>({sh,r,values:sh.getRange(r).values}));
const decisionRows=new Map([...b.getRange('A40:A61').values.map((v,i)=>[v[0],40+i]),...b.getRange('A115:A117').values.map((v,i)=>[v[0],115+i])]);
const caseMap=new Map(),deps=new Map(),changes=[];
for(const [sh,last,col] of [[s,93,'V'],[u,45,'AF']])for(let r=6;r<=last;r++){
 const id=get(sh,`A${r}`);caseMap.set(id,{sh,r,col});
 deps.set(id,[...new Set([...sh.getRange(`${col}${r}`).formulas[0][0].matchAll(/'本批提测'!\$H\$(\d+)/g)].map(m=>[...decisionRows].find(([,n])=>n===Number(m[1]))?.[0]).filter(Boolean))]);
}
function change(id,{module,check,steps,expected,web,note,append=false}){
 const {sh,r}=caseMap.get(id),isUi=id.startsWith('UI');
 if(module)set(sh,`B${r}`,module);if(check)set(sh,`C${r}`,check);
 if(steps)set(sh,`J${r}`,append?`${steps}\n原需求验收分支（按映射后入口执行）：\n${get(sh,`J${r}`)}`:steps);
 if(expected)set(sh,`K${r}`,append?`${expected}\n原需求预期（仍须保留）：\n${get(sh,`K${r}`)}`:expected);
 set(sh,`L${r}`,`${String(get(sh,`L${r}`)).replace('本轮未访问业务环境，不能由旧观察推断当前登录可用。','此前复核未访问业务环境；本版已只读查看已有会话，登录流程仍待实测。')}\n网站只读对照 ${web}，2026-10-12；具体URL及未验证范围见「网站详情对照」。当前实现不替代批准需求。`);
 set(sh,`${isUi?'AG':'W'}${r}`,'网站对照修订');set(sh,`${isUi?'AH':'X'}${r}`,note);
 set(sh,`${isUi?'AE':'U'}${r}`,`${get(sh,`${isUi?'AE':'U'}${r}`)||''}\n增加网站证据：记录group/resource、对象名称、主/子列表作用域及字段回显；写入/权限/持久化另取本批执行证据。`);
 if(isUi)set(sh,`AC${r}`,`网站对照修订：${note}`);
 changes.push({id,web,note});
}
change('SM01',{steps:'前置：取得本批测试账号及Build，记录账号别名、角色和本批目标对象。\n操作：打开本批深链接，若要求登录则完成登录并核对返回路由。裸入口本轮落至行政与地点/国家；国家深链接group=location&resource=country，航空公司为group=dictionary&resource=airline，不把后者作为所有批次默认入口。',expected:'使用正确身份，进入批准的本批目标分组/对象，URL、对象标题和内容一致。本次已有会话可见页面不代表新账号登录、超时或受限账号已通过。',web:'WEB01—03',note:'用当前国家默认入口纠正历史航司固定入口；本轮已访问页面，登录流程仍未实测。'});
change('SM03',{check:'基础配置分组、对象与深链接',steps:'从基础配置导航依次选择本批对象，核对group/resource、分组说明、左侧对象、列表列与页头新增按钮。目录：业务字典5项、行政8项、航线区域/Zone、费用项、币种/汇率。以国家→航空公司→汇率→Zone检查对象切换；只有交付的对象纳入本批。',expected:'分组、对象、URL、字段列及新增目标一致，无前一对象残留。裸入口国家只是本次观察；主数据/计价底座当前为分组文字与导航按钮，是否改一级Tabs按UI01/DEC01批准方案判断。',web:'WEB01—10',note:'补实际双层对象目录、对象特有新增按钮和路由。'});
change('SM06',{module:'基础配置列表',steps:'按本批对象选已知样本和不命中关键词，执行查询并分别记录结果及总数；国家编码/中文或英文名，航空公司IATA/ICAO/名称，货物类型编码/名称/说明，费用项编码/名称/分组/币种，Zone编码/名称/服务商/方案。字段是否实际参与检索须执行验证，提示文案本身不证明检索正确。',expected:'已知样本及查询结果符合批准字段匹配规则；无结果空态不残留旧数据，总数正确。查询匹配方式、大小写、模糊/精确及状态范围依本批确认。',web:'WEB02—05、WEB10',note:'按真实对象搜索提示拆分数据，不能套统一选项值检索。'});
change('SM07',{module:'基础配置列表',steps:'普通对象用关键词+状态（本次默认全部）；邮编另核国家筛选，汇率另核源币种、目标币种、生效日期。分别查询、组合筛选、重置、刷新；航线区域国家关系与Zone成员先明确详情子列表再操作。地点/Zone即时查询与按钮语义按DEC09批准后逐项验。',expected:'查询字段、筛选组合、重置默认、刷新范围与批准规则一致；不串主表/子表或前后对象。存在查询按钮不证明只按钮触发，也不取消正文即时查询要求；需DEC09确认。',web:'WEB02—10',note:'补汇率/邮编额外筛选及主子列表作用域。'});
change('SM08',{module:'基础配置列表',steps:'准备至少21条受控记录，记录当前筛选总数。当前页面显示20条/页及页码输入；翻页检查不重不漏，变更已提供的页容量，按批准规则核对越界页码、筛选后页码与详情子列表独立分页。',expected:'总数/页码/容量/实际记录一致，跨页不串对象。当前1—2条样本不足以通过分页用例；可选容量及跳页规则按实际交付，不硬加10/50/100。',web:'WEB02—10',note:'采用观察到的20条默认容量，补超过一页前提。'});
change('SM09',{check:'仅名称普通字典的适用与必填',steps:'先在DEC26确认交付对象是否是PRD仅维护选项值/名称的普通字典及真实入口，再执行空值、有效新增和保存读回。国家、航空公司、货物类型等本次有编码的表单不得直接套本条；映射不同应选对应带编码用例。',expected:'仅对批准的普通字典执行选项值必填和保存核查。未确认入口属于该模型时记录依据待确认，不把有编码表单强行判为只填名称即可保存。',web:'WEB02—04',note:'收窄name-only模型，保留需求并防止误用。'});
change('SM10',{check:'航空公司编码、名称与扩展字段',steps:'使用专用航空公司数据；新增入口为新增航空公司。按DEC06批准格式分别缺IATA编码、名称、状态再补齐；填写ICAO、英文名称、国家后保存读回。编辑已有项核对IATA禁用、各扩展字段回显及国家候选来源；新增和编辑分别取证。',expected:'按批准规则校验编码/名称/状态及IATA/ICAO格式、国家来源；合法数据保存回显完整，编码编辑只读。本次星号及disabled仅是UI观察，服务器必填、格式、唯一性未验证；不能用通用编码+名称忽略ICAO/国家。',web:'WEB03',note:'用实际IATA/ICAO/国家表单修订航空公司分支。'});
change('SM11',{module:'基础配置对象',steps:'按当前分组/对象点击页头对应新增按钮（新增国家/航空公司/货物类型/费用项/币种/汇率/邮编/航线区域/Zone），核对表单对象，再用批准的专用数据保存、重新查询、刷新读回。只选本批交付对象；每个纳入对象分别留证。',expected:'创建目标正确、保存和读回一致、刷新后仍存在。对象特有必填、候选来源及审批须相应用例/决策已确认；一次对象保存不能代表其他对象全部通过。',web:'WEB01—10',note:'新增入口按具体对象命名，不写不存在的统一新增选项。'});
change('SM12',{module:'基础配置对象',steps:'分别记录专用测试项原值，打开行编辑，核对回显和可编辑字段。已观察国家编码、IATA、货物类型编码、费用项编码、ISO4217编码、邮编、Zone编码只读；汇率已生效记录源/目标/倍率/生效日另按SM85。仅修改批准可编辑字段，保存并重查；关联字段同时核列表/详情/表单。',expected:'回显及只读状态符合批准对象契约；保存只改变目标对象及预期字段，编码不被隐式重写。列表与编辑关联值可追溯；版本/历史及财务影响需专项证据。',web:'WEB02—10',note:'补对象特有只读字段，汇率生命周期单独处理。'});
change('SM13',{module:'基础配置对象',steps:'打开本批专用测试项编辑，记录原值，改变可编辑内容后分别取消及右上关闭，再重新打开并查询。Zone详情关闭与编辑取消分别操作；成员编辑若未核实入口，不推测其表单。',expected:'取消/关闭未保存修改，原值保持；关闭提示及是否保留未保存输入按批准方案。只打开表单并取消的本次观察不替代含修改的完整本条执行。',web:'WEB02—10',note:'区分详情关闭与编辑取消，不升级为完整取消测试通过。'});
for(const id of ['SM14','SM15'])change(id,{steps:'适用范围：只对本批已交付普通删除的对象及获准清理的测试项执行；当前汇率无普通删除入口，应按SM85结束旧区间/新增处理。航线区域或Zone必须明确删除主记录还是成员关系。\n原普通字典分支按下列步骤执行：',expected:'普通字典删除合同保留；汇率及关联对象按各自批准生命周期/引用保护执行，不因不存在普通删除按钮而运行通用删除步骤。',append:true,web:'WEB02—10',note:'普通删除按对象限定，汇率排除；关联主表/成员分开取证。'});
change('SM16',{steps:'在DEC06确认航空公司IATA/ICAO各自唯一性范围、大小写归一和重码处理；国家、币种、费用项、货物类型编码等另按各自批准契约。在新增专用记录时构造重复编码，不对disabled编辑编码做无效提交；读回总数和原项。',expected:'按照已批准唯一键和重码规则拒绝/提示/处理，原数据不误改；不自行假定IATA、ICAO、名称都全局唯一。',web:'WEB02—07',note:'重复编码使用真实新增路径，区分各对象唯一键。'});
change('SM17',{steps:'当前基础配置显示固定分组和对象目录，本轮未看到分类新增/改名/删除入口。先由DEC07/DEC26明确分类管理是否交付、是否有其他页面，再对交付入口执行原分类操作及引用影响检查。',expected:'已交付分类操作符合批准方案；未交付记录明确理由。固定菜单可切换不等于分类CRUD已通过，本页面未见入口也不能推出全站不支持。',web:'WEB01、WEB03',note:'区分固定目录切换和分类自身CRUD。'});
for(const id of ['SM19','SM20','SM58','SM72'])change(id,{steps:'网站映射前提：本页面把国家/省州/城市/区县/邮编/机场/港口/仓库分为独立对象；本轮只打开国家和邮编表单。DEC28需给出PRD统一地点ID/类型/ISO2/邮编属性与当前对象的映射及版本入口，再在对应入口执行下列原需求分支。当前邮编页面专项先见SM90；无批准映射不得向不存在的通用地点表单填数据。',expected:'PRD地点/邮编/版本/实际命中合同仍保留；当前独立邮编对象不能自行替代地点匹配属性，更不能取消精确/前缀/区间或历史快照要求。没有可执行映射时依据待确认，当前表单读回不代表真实Zone命中已通过。',append:true,web:'WEB02、WEB08、WEB10',note:'保留原地点与匹配合同，增加独立对象映射及可执行前提。'});
change('SM43',{steps:'当前入口：航线区域与Zone→Zone，group=routing&resource=reference_zone。主记录编辑核编码只读、名称/服务商范围/方案编码/状态、备注；查看详情分别核基本信息与成员列表（类型/对象/包含关系/展示名称）。DEC29确认国家范围维护入口、成员新增/编辑字段、默认状态、版本递增与历史，DEC28确认邮编引用映射后，再执行原合同分支；成本价卡返回仅在该来源入口交付时纳入。',expected:'当前主记录与成员关系核对分开；成员对象ID、显示名称及关联对象一致。本轮只看到版本列，未证明递增/历史；未核成员编辑表单，不能编造字段。批准模型须保留原国家范围/包含排除/启用命中与历史要求，不能以现有表单自动覆盖需求。',append:true,web:'WEB10',note:'补真实Zone主/成员路径；版本、国家范围和返回成本卡按批准映射。'});
for(const id of ['SM83','SM86'])change(id,{steps:'本轮页面对象目录未见服务段、计费要素或价卡计费方式入口；只限本页面观察，不能称全站不存在。DEC26及交付清单先给出实际入口/对象映射；确认交付后保留下列原验收分支。不得把货物类型、费用项或Zone替代这些对象。',expected:'仅对本批已确认入口的原对象验收；未交付可按交付理由排除，未明确范围应依据待确认。原字符边界、类型/单位和引用历史规则仍保留。',append:true,web:'WEB01—10',note:'补本页面未见对象的范围条件，避免指定错误入口。'});
change('SM84',{check:'费用项真实字段、字典映射与财务生效',steps:'入口：费用项分组→页头新增费用项/行编辑。字段为费用项编码、名称、英文名称、分组编码、默认币种、状态，编码编辑只读；分组编码和默认币种本次为文本框。DEC27先确认分组编码是否对应PRD费用项类型、币种来源与合法值/空旧值，DEC25确认财务生效入口。\n在专用数据上按批准映射执行编码/名称/类型或分组/默认币种/状态必填、重复编码、名称63/64/65；测试非法分组/币种与合法值读回。再核修改类型/默认币种审批前后新价卡默认带出，引用删除保护、取消与未引用删除及历史快照。',expected:'PRD编码/名称/类型/默认币种必填、编码唯一且创建后不可改、名称最多64字符仍是验收依据。类型字典与结算币种来源不能因当前文本框而取消；文本输入须映射批准合法值。当前旧样本分组空不证明可合法保存。类型/默认币种变更须按批准财务流程生效；引用删除拦截及引用数量提示、新明细默认币种和旧快照分别留证，未批准差异不得判通过。',web:'WEB05',note:'以真实分组编码/默认币种文本框改步骤，保留字典与审批合同差异。'});
change('SM85',{check:'汇率自然日区间、只读生效项与倍率精度',steps:'入口：币种与汇率→汇率。查询含关键词、状态、源/目标币种、生效日期；列表倍率样本显示8位小数、行只有编辑/停用。页面声明按自然日区间保存；已生效编辑的源/目标/倍率/生效日只读，结束日和状态可操作。\nDEC24先确认直接倍率乘除方向、自然日区间端点、旧记录结束与新记录衔接/重叠、4位输入与8位展示/计算精度、唯一键及默认同币种例外；DEC25确认财务流程。新增专用记录分别缺源/目标/倍率/生效日/状态，测0/负/非数/4与5位小数、同币种对、重复币种对+生效日和不同日期。已生效记录通过批准的结束旧区间＋新增路径调整，不直接改只读倍率；核审批前后有效版本、命中日期及历史快照。仅批准另有删除入口时单独验引用拦截，不在当前列表强行找删除按钮。',expected:'PRD汇率>0、最多4位小数、币种对+生效日期唯一，普通源目标不同及预置CNY→CNY=1例外仍须DEC24统一；预置样本未在当前列表观察到，执行前须准备已确认记录。8位展示不等于输入/存储/计算8位。已生效四字段只读，无普通删除；通过批准自然日区间流程调整，不能重叠/漏配或误用旧版本。财务确认生效、真实倍率计算方向、历史引用及旧计费快照分别取证，页面说明不证明已实现。',web:'WEB07',note:'移除当前不可执行的普通删除和直接修改倍率步骤，补自然日区间和显示精度差异。'});
change('SM87',{check:'货物类型与可接货型映射、回显及历史',steps:'当前业务字典→货物类型有编码/名称/说明/状态，编辑编码只读，说明显示0/500。DEC26先确认它是否对应PRD仅名称的可接货型及服务单元货物准入同源范围。批准后用专用数据分别核新增必填/重名/合法保存、说明按批准长度边界；编辑名称及说明再核候选联动，取消删除、确认删除及历史保留。',expected:'若映射为PRD可接货型，名称必填、不能重复创建、同源选项联动及删除不影响历史合同保留；编码新增规则另按批准方案。本轮计数500只说明前端提示，不证明服务器限长；编码只读不等于编码唯一已验证。名称归一/长度及货型同源映射未批准时不能判通过。',web:'WEB04',note:'实际货物类型有编码与说明，不能直接套仅名称可接货型模型。'});
change('UI01',{steps:'记录当前主数据/计价底座分组文字、5个导航分组按钮、对象侧栏及页头对象特有新增按钮；切換对象核标题/选中态/列表/新增目标。对照DEC01批准现行结构：若采纳Review一级Tabs及右侧列表顶部新增，按批准稿量测和定位；若批准保留当前结构，留批准稿及采用理由。',expected:'结构必须符合本批批准方案。Review提出主数据/计价底座页头一级Tab、子项内容区及右侧列表顶部新增，当前DOM为分组导航和页头新增，存在待确认差异；不能因菜单能切换就认为Tabs方案已完成。Tabs尺寸/交互见UI33/34，仅适用实际采用Tabs的组件。',web:'WEB01—10',note:'写明当前导航与Review Tabs/新增位置差异，保留批准口径。'});
change('UI09',{steps:'按当前对象核关键词/状态控件，邮编另国家，汇率另源/目标/生效日；量测尺寸、间距、顺序与查询/重置/刷新反馈。详情国家关系和Zone成员独立核筛选及按钮作用域。地点/Zone即时查询与按钮语义按DEC09。',expected:'保留原布局与即时查询规则；当前字段数各对象不同，不强制3字段模板。额外筛选和主子列表操作不串对象，控件样式及响应按批准框架；本轮只观察控件，未验证实际触发和反馈。',append:true,web:'WEB02—10',note:'增加对象特有筛选与详情子列表范围，不把按钮存在当功能已验证。'});
change('UI11',{steps:'当前主列表及航线区域/Zone详情列表显示20条/页、总数和页码输入。准备>20条数据，再核框架布局、切页/已提供容量/跳页及子列表独立分页；仅1—2条样本不能完成能力验收。',expected:'默认20仅为当前观察，批准容量及跳页规则按原用例；总数、记录与分页组件一致，主/子列表互不误操作。',append:true,web:'WEB02—10',note:'补真实20条分页和跨页数据前提。'});
change('UI12',{steps:'当前已观察基础配置表格没有勾选列；仅在本批提供横向滚动时测核心识别字段与操作列固定。若批准新增批量勾选，再执行原勾选固定分支，不把Checkbox强加到现有单行操作页。',expected:'无勾选页面不因缺Checkbox判失败；横向滚动固定字段和右侧操作仍须按批准组件验收。',append:true,web:'WEB02—10',note:'明确当前无勾选列，保留条件固定列规则。'});
change('UI15',{steps:'基础配置当前编码为普通文本；航线区域/Zone用行“查看详情”按钮打开对应详情。分别核文本无错误链接暗示、详情目标和关闭返回；其他模块仍按DEC04批准编码入口及原合同执行。',expected:'本页面不强制所有编码为详情链接；真实查看详情按钮须打开对应主记录及正确成员范围。服务组合等已明确编码入口的合同保留。',append:true,web:'WEB02—10',note:'使用真实详情按钮，编码链接规则按模块限定。'});
change('UI17',{steps:'网站对照新增路由范围：国家location/country、航空公司dictionary/airline、汇率finance/exchange_rate、Zone routing/reference_zone。刷新前记录group/resource、菜单/对象选中态及批准保留状态；详情刷新是否保留弹层另先批准，不默认要求。',expected:'路由和选中对象保持批准范围，不能刷新回错误对象。本轮对象切换观察不等于已执行刷新或前进/返回。',append:true,web:'WEB01—10',note:'补实际双参数路由与弹层刷新范围。'});
change('UI26',{steps:'网站长文本场景补货物类型说明、Zone备注、航线区域/Zone详情普通字段与关联成员展示；编辑textarea的0/500计数属输入提示，详情普通字段3行、备注/描述2行及列表1行分别取证。',expected:'原场景行数/展开规则保留；计数器不替代截断或服务端限长验证。详情内容滚动及关闭、成员操作不遮挡，先定位实际容器。',append:true,web:'WEB04、WEB09、WEB10',note:'补真实说明/备注/成员内容场景，不混输入长度与展示行数。'});
const added=[
 {id:'SM89',module:'币种',check:'ISO4217回显、小数位配置与业务引用',steps:'币种与汇率→币种。用批准专用币种新增/编辑；核ISO4217编码、名称、英文名称、符号、小数位数、状态，编码编辑只读。先批准编码格式/唯一性、小数位合法范围及必填，再测空、边界/非法值、合法保存读回、停用候选与汇率/费用默认币种引用。',expected:'字段回显、只读和保存值与批准币种契约一致；小数位数不能接受超批准范围的值。当前CNY/USD小数位2不决定全站金额展示2位，金额按DEC10；没有审批或关联生效证据时不推断币种变更已经影响历史。',web:'WEB06',decisions:[],critical:'是'},
 {id:'SM90',module:'独立邮编对象',check:'国家回显、邮编范围与地点映射',steps:'行政与地点→邮编。核关键词邮编/结束邮编和国家筛选；用专用国家、含前导零邮编和批准范围新增，编辑核邮编只读、国家和结束值。DEC28批准起止端点、文本归一及与PRD地点属性/版本的映射后，执行空值、反向范围、合法保存、国家关联列表/表单读回；真实命中和历史走SM72。',expected:'国家/邮编/状态按批准必填，编码与国家关联保持，邮编不能因数字转换丢前导零；范围处理按批准口径。当前列表国家1与表单中国CN需核对展示定义和真实关联，不能只看数字就判业务关联错误。独立邮编页保存不代表PRD地点版本和Zone匹配已通过。',web:'WEB08',decisions:['DEC28'],critical:'是'},
 {id:'SM91',module:'航线区域',check:'主记录与国家关系详情的作用域和关联',steps:'航线区域与Zone→航线区域。使用本批专用区域，核编码/名称/状态列表，点该行查看详情，分别核基本信息和国家关系列表。先取得未核实的新增/编辑字段及成员维护入口和批准关系约束；执行合法主记录/成员新增保存读回、取消、状态及引用删除保护。子列表查询/编辑/停用/删除必须限定当前详情，不操作同名主表按钮。',expected:'主记录和国家关系关联到正确区域，关闭详情回原列表；国家ID、名称/编码、状态与批准展示及真实关联一致。成员必填、重复、删除/停用及历史规则须先确认，不从现有按钮推导允许删除被引用成员；本轮仅查看详情，未核字段或保存。',web:'WEB09',decisions:[],critical:'是'}
];
for(const e of added){const r=Number(e.id.slice(2))+5;s.getRange(`A${r}:X${r}`).copyFrom(s.getRange('A93:X93'),'all');s.getRange(`A${r}:X${r}`).values=[[e.id,e.module,e.check,'待选择',e.critical,'待确认','未执行',null,null,e.steps,e.expected,`网站 ${e.web}，2026-10-12；批准需求/交付规则及映射确认后执行；详情来源见网站详情对照。`,null,null,null,'专项回归',null,null,'网站观察＋待批准契约','按实际对象字段分别核输入、保存读回与引用；不以静态回显判整条通过。','记录批准字段规则、原值/新值、Build、路由、列表与表单证据；未保存的本轮观察不作为实测结果。',null,'网站对照补充','新增对象专项；本批范围和字段合同待确认，全部未执行。']];caseMap.set(e.id,{sh:s,r,col:'V'});deps.set(e.id,e.decisions);changes.push({id:e.id,web:e.web,note:'网站对象专项补充'});}
u.getRange('A46:AH46').copyFrom(u.getRange('A45:AH45'),'all');u.getRange('A46:AH46').values=[['UI41','关联字段展示','关联ID、名称与编码跨视图一致性','待选择','是','待确认','未执行',null,null,'分别核邮编列表国家1与编辑中国CN、航线区域国家关系1、Zone成员country/1/include/—以及主记录common与详情通用。定位每个字段是ID、名称、编码还是枚举；取得批准展示规则后对照关联对象，核空值、长名称及编辑/详情/列表一致性。','字段标题、展示值和真实关联对应批准方案；名称字段不误以内部ID替代，编码/ID字段清楚标识，空名是否允许按批准规则。枚举原值与中文标签须映射一致；不因数字1或英文枚举本身就宣称业务关联错误。','网站WEB08—10，2026-10-12；SPEC字段可读性/空值；具体批准标签映射依DEC18；URL见网站详情对照。',null,null,null,'待确认','待确认','按批准组件','UI、产品、开发','UI核对',null,null,'网站观察＋批准UI基线',null,null,null,null,null,'网站补充；关联显示值与真实对象分开核对。','比较相同关联字段的ID/编码/名称及枚举标签，不仅比较字符串。','记录关联对象证据、批准字段标题和标签映射、三个视图截图/值及空值方案。',null,'网站对照补充','当前已观察显示差异；未执行批准后的UI验收，来源状态和测试结果独立。']];caseMap.set('UI41',{sh:u,r:46,col:'AF'});deps.set('UI41',['DEC18']);changes.push({id:'UI41',web:'WEB08—10',note:'关联字段跨视图回显补充'});
const newDecisions=[
 ['DEC26','基础配置对象映射/交付：仅名称普通字典与带编码货物类型、PRD可接货型同源；本页面未见服务段/计费要素/计费方式的实际入口，不推断全站缺失','SM09、SM17、SM83、SM86、SM87','待选择','产品、开发、测试','待确认',null],
 ['DEC27','费用项分组编码是否对应类型字典、默认币种文本的合法来源/校验、必填及旧空分组处理；不能由文本框取消字典合同','SM84','待选择','产品、财务、开发','待确认',null],
 ['DEC28','行政独立对象/邮编与统一地点ID/类型/ISO2/邮编属性的映射；范围端点/前导零/表达式、版本入口和真实Zone命中/历史','SM19、SM20、SM58、SM72、SM90','待选择','产品、开发、测试','待确认',null],
 ['DEC29','当前Zone主记录/成员模型与国家范围必填、默认待生效、版本递增/历史、包含排除约束及价卡来源返回的映射；成员新增/编辑入口需补证','SM43','待选择','产品、开发、测试','待确认',null]
];
b.getRange('A154:H154').merge();set(b,'A154','网站对照｜新增待确认事项（按关联用例自动纳入）');b.getRange('A155:H155').values=b.getRange('A39:H39').values;b.getRange('A156:G159').values=newDecisions;
for(const [i,e]of newDecisions.entries())decisionRows.set(e[0],156+i);
set(b,'B40','基础配置当前导航分组/对象侧栏/页头新增，与Review一级Tabs/右侧列表顶部新增位置的采用方案；现实现不等于批准稿');
set(b,'B45','航空公司IATA/ICAO格式及唯一性、名称/状态必填、国家候选来源和编码只读；当前字段已观察但保存/服务端未验证');
set(b,'B46','当前固定对象目录与分类新增/改名/删除的交付范围、实际入口；仅本页面未见分类CRUD');
set(b,'B48','地点/Zone正文即时查询与当前查询按钮的触发、重置/刷新语义及主子列表范围，未实际执行检索');
set(b,'B49','金额项目2位/规范4位冲突；币种小数位配置与业务金额显示/计算精度分别确认，不从CNY/USD样本2推全站');
set(b,'C57','UI01—41');
set(b,'B116','汇率自然日区间、已生效四字段只读及结束旧区间+新增；直接倍率乘除、4位输入/8位展示/计算、唯一键、端点/重叠及默认同币种例外；页面声明未证明实现');
const parseIds=v=>[...String(v).matchAll(/(SM|UI)(\d+)(?:[—–-](?:SM|UI)?(\d+))?/g)].flatMap(m=>Array.from({length:Number(m[3]??m[2])-Number(m[2])+1},(_,i)=>`${m[1]}${String(Number(m[2])+i).padStart(2,'0')}`));
const deferred=new Set(['DEC01','DEC02','DEC03','DEC23']);
for(const [id,r]of decisionRows){
 const ids=parseIds(get(b,`C${r}`));const linked=ids.map(cid=>{assert(caseMap.has(cid),cid);const ui=cid.startsWith('UI'),sh=ui?'UI检查':'冒烟用例',last=ui?46:96;return `COUNTIFS('${sh}'!$A$6:$A$${last},"${cid}",'${sh}'!$D$6:$D$${last},"是")`;}).join('+')||'0';
 const adopt=`IF(AND(F${r}="已确认",LEN(TRIM(G${r}))>0),"已确认",IF(AND(F${r}="已记录后置",LEN(TRIM(G${r}))>0),"${deferred.has(id)?'已记录后置':'核心依据不可后置'}","待确认"))`;
 b.getRange(`H${r}`).formulas=[[`=IF(AND((${linked})>0,D${r}="否"),"范围矛盾",IF(OR(D${r}="是",(${linked})>0),${adopt},IF(D${r}="否","不涉及","库内待选择")))`]];
 for(const cid of ids)deps.set(cid,[...new Set([...(deps.get(cid)||[]),id])]);
}
for(const [id,{sh,r,col}]of caseMap){
 const invalid=[`LEN(TRIM('本批提测'!$B$10))=0`,`LEN(TRIM('本批提测'!$B$11))=0`,`'本批提测'!$B$12<>"已确认"`,`F${r}<>"已确认"`,...(deps.get(id)||[]).map(d=>{const dr=decisionRows.get(d);assert(dr,d);return deferred.has(d)?`AND('本批提测'!$H$${dr}<>"已确认",'本批提测'!$H$${dr}<>"已记录后置")`:`'本批提测'!$H$${dr}<>"已确认"`;})];
 sh.getRange(`${col}${r}`).formulas=[[`=IF(D${r}="否","不适用",IF(D${r}<>"是","未纳入本批",IF(OR(${invalid.join(',')}),"待确认","已确认")))`]];
 const ui=id.startsWith('UI'),mapping=ui?'U':'Q',baseline=ui?'V':'R';
 sh.getRange(`I${r}`).formulas=[[`=IF(D${r}="否","不适用",IF(D${r}<>"是","未纳入本批",IF(AND(E${r}<>"是",E${r}<>"否"),"关键项待分类",IF(${col}${r}<>"已确认","依据待确认",IF('本批提测'!$B$6<>"已就绪","批次未就绪",IF(OR(H${r}<>'本批提测'!$B$8,G${r}="",G${r}="未执行"),"未执行",IF(${baseline}${r}<>'本批提测'!$B$18,"基线已变，需复测",IF(LEN(TRIM(${mapping}${r}))=0,"交付未映射",IF(AND(OR(G${r}="通过",G${r}="失败"),LEN(TRIM(M${r}))=0),"缺少证据",IF(AND(OR(G${r}="通过",G${r}="失败"),LEN(TRIM(O${r}))=0),"缺少执行人",IF(OR(G${r}="通过",G${r}="失败",G${r}="受阻",G${r}="依据待确认"),G${r},"结果待填写")))))))))))`]];
}
// Extend the existing summaries and keep all recorded user inputs intact.
const bf=b.getRange('A1:H151').formulas;for(let r=0;r<bf.length;r++)for(let c=0;c<bf[r].length;c++){const f=bf[r][c];if(!f)continue;const nf=f.replace(/('冒烟用例'![^,()+]*\$)93\b/g,(_,p)=>p+'96').replace(/('UI检查'![^,()+]*\$)45\b/g,(_,p)=>p+'46');if(nf!==f)b.getCell(r,c).formulas=[[nf]];}
for(const [cell,labels]of [['F30',['待确认','范围矛盾','核心依据不可后置']],['F31',['库内待选择']],['H31',['已记录后置']]]){b.getRange(cell).formulas=[[b.getRange(cell).formulas[0][0]+labels.map(l=>`+COUNTIFS($H$156:$H$159,"${l}")`).join('')]];}
set(b,'A3','2026-10-12 网站对照修订｜91功能＋41UI；28冒烟＋63专项；完整用例全部未执行');
set(b,'A83','当前库：28冒烟＋63专项＋41UI，132检查点；保留前轮统计/基线修正，网站仅只读查看，不把浏览观察计为用例通过。');
set(b,'F14','2026-10-12已只读访问基础配置分组/对象、列表与部分编辑/详情；未提交/启停/删除。页面Build未显示，仍需本批填写。');
set(b,'A110','本版结合当前基础配置：修订真实字段/只读/筛选/详情/生命周期；保留PRD差异待确认。新增3功能+1UI，132条均未执行，未计算实际像素拟合率。');
set(b,'D124','本版28冒烟/63专项，计价核心20KG正向仍为SM52冒烟；20.1→21归SM79，非法/缺失归SM78；新增币种、独立邮编、航线区域3条专项按交付纳入。');
set(b,'A162','网站复核范围');b.getRange('B162:H162').merge();set(b,'B162','五个分组、18个可见对象目录；打开国家、航空公司、货物类型、费用项、币种、汇率、邮编、航线区域、Zone的列表或详情，表单范围见网站详情对照。');
set(b,'A163','执行边界');b.getRange('B163:H163').merge();set(b,'B163','当前版本/交付清单未取得，成员表单等未核实；保存、权限、启停、删除、跨页、真实匹配、版本/历史与UI量值仍待本批批准依据后的实测。');
// Add focused source evidence, without copying current implementation into approval cells.
const web=w.worksheets.add('网站详情对照');web.showGridLines=false;web.tabColor='#64748B';web.freezePanes.freezeRows(5);
web.getRange('A1:H1').merge();set(web,'A1','网站详情对照｜可见事实、需求差异与待验证边界');web.getRange('A2:H2').merge();set(web,'A2','观察日期：2026-10-12；只读浏览当前会话。未显示Build；无业务写入、无完整功能或像素验收。');web.getRange('A3:H3').merge();set(web,'A3','对象目录18项；编辑/详情仅按下表已观察范围。网站事实用于修订步骤，验收预期仍取批准需求/UI基线。');
web.getRange('A5:H5').values=[['观察ID','对象/场景','页面可见事实','未验证范围','关联用例','需求/UI差异及修订','关联决策','来源URL']];
const mapping={WEB01:['SM01、SM03、SM11、SM17、SM83、SM86、UI01','当前分组导航与Review一级Tabs不同；本页未见的对象需实际入口映射','DEC01、DEC07、DEC26'],WEB02:['SM01、SM06—16、SM19、UI15','国家独立表单与统一地点/普通字典模型需区分','DEC28'],WEB03:['SM03、SM06—16','IATA/ICAO/国家真实字段补入，新增规则仍待批准','DEC06'],WEB04:['SM06—16、SM87、UI26','货物类型有编码/说明，与仅名称可接货型须映射','DEC26'],WEB05:['SM06—16、SM84','分组编码/默认币种文本输入与需求字典来源及财务审批差异','DEC27、DEC25'],WEB06:['SM89、UI29','小数位配置不直接决定所有金额展示精度','DEC10'],WEB07:['SM07、SM12、SM14、SM15、SM85、UI09、UI29','自然日区间、已生效只读、无删除及8位展示与原编辑/删除/4位输入差异','DEC24、DEC25'],WEB08:['SM19、SM20、SM58、SM72、SM90、UI09、UI41','独立邮编与地点属性映射；列表国家1/表单中国CN回显定义','DEC28、DEC18'],WEB09:['SM91、UI15、UI26、UI41','详情国家关系与主表分开；成员国家1展示规则需确认','DEC18'],WEB10:['SM43、UI15、UI26、UI41','主记录/成员模型、版本、国家范围及common/通用/成员ID展示需确认','DEC29、DEC28、DEC18']};
web.getRange('A6:H15').values=observations.observations.map(e=>{const m=mapping[e.id];return[e.id,e.object,e.facts,e.boundary,m[0],m[1],m[2],e.url];});
web.tables.add('A5:H15',true,'SiteEvidence').style='TableStyleMedium2';
web.getRange('A1:H15').format.font={name:'Arial',size:10,color:'#25324A'};web.getRange('A1:H15').format.wrapText=true;web.getRange('A1:H15').format.verticalAlignment='center';
for(const [c,width]of [['A',95],['B',200],['C',560],['D',410],['E',240],['F',370],['G',170],['H',420]])web.getRange(`${c}1:${c}15`).format.columnWidthPx=width;
web.getRange('A1:H1').format.fill='#213B62';web.getRange('A1:H1').format.font={name:'Arial',size:15,bold:true,color:'#FFFFFF'};web.getRange('A1:H1').format.rowHeightPx=48;web.getRange('A2:H3').format.rowHeightPx=38;web.getRange('A5:H5').format.rowHeightPx=48;web.getRange('A5:H5').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};web.getRange('A5:H5').format.fill='#213B62';
for(let r=6;r<=15;r++)web.getRange(`A${r}:H${r}`).format.rowHeightPx=230;
// Append only the new coverage to the existing traceability table.
const traceRows=added.map((e,i)=>[`TR${115+i}`,`${e.module}：${e.check}`,e.id,'对象字段/保存读回/引用按批准契约逐项取证','2026-10-12网站补充','网站观察＋批准需求',(e.decisions||[]).join('、')||'本批对象字段合同',observations.observations.find(v=>v.id===e.web).url]);
traceRows.push(['TR118','关联字段跨视图展示','UI41','字段标题/ID/编码/名称及枚举中文映射','2026-10-12网站补充','网站观察＋批准UI基线','DEC18','https://localhost/pcs/system-config/master-data']);t.getRange('A120:H123').values=traceRows;
for(const [sh,last,end,start]of [[s,96,'X',94],[u,46,'AH',46],[t,123,'H',120]]){const table=sh.tables.items[0],style=table.style,name=table.name;table.delete();const nt=sh.tables.add(`A5:${end}${last}`,true,name);nt.style=style;nt.showFilterButton=true;sh.getRange(`A${start}:${end}${last}`).format.font={name:'Arial',size:10,color:'#25324A'};sh.getRange(`A${start}:${end}${last}`).format.wrapText=true;sh.getRange(`A${start}:${end}${last}`).format.verticalAlignment='center';}
for(const [sh,start,last]of [[s,94,96],[u,46,46]])for(const [c,vals]of [['D',['待选择','是','否']],['E',['是','否']],['F',['待确认','已确认']],['G',['未执行','通过','失败','受阻','依据待确认']]])sh.getRange(`${c}${start}:${c}${last}`).dataValidation={rule:{type:'list',values:vals}};
for(const c of ['D','F'])b.getRange(`${c}156:${c}159`).dataValidation={rule:{type:'list',values:c==='D'?['待选择','是','否']:['待确认','已确认','已记录后置']}};
b.getRange('A154:H163').format.font={name:'Arial',size:10,color:'#25324A'};b.getRange('A154:H163').format.wrapText=true;b.getRange('A154:H163').format.verticalAlignment='center';b.getRange('A154:H155').format.fill='#213B62';b.getRange('A154:H155').format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};b.getRange('A154:H155').format.rowHeightPx=44;b.getRange('A156:H159').format.rowHeightPx=210;b.getRange('D156:G159').format.fill='#FFF4D6';b.getRange('A162:H163').format.rowHeightPx=94;b.tables.add('A155:H159',true,'SiteDecisions').style='TableStyleMedium2';
for(const change of changes){const {sh,r}=caseMap.get(change.id),end=change.id.startsWith('UI')?'AH':'X';const vals=sh.getRange(`A${r}:${end}${r}`).values[0];const lines=vals.map((v,i)=>String(v??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length*12/Math.max(45,(sh.getCell(r-1,i).format.columnWidthPx||120)-18))),0));sh.getRange(`A${r}:${end}${r}`).format.rowHeightPx=Math.max(160,...lines.map(n=>n*18+28));}
t.getRange('A120:H123').format.rowHeightPx=125;
for(const sh of [s,u])set(sh,'A4','本版结合网站只读详情修订步骤；完整用例全部未执行。按交付选是，确认需求/UI及关联决策；执行前提、Build/基线、交付映射和逐分支证据满足后才能计有效结果。');
for(const p of preserved)assert.deepEqual(p.sh.getRange(p.r).values,p.values,`preserved ${p.sh.name} ${p.r}`);
const checks=[];const eq=(sh,a,v,label)=>{assert.equal(get(sh,a),v,label);checks.push(label);};
// Verify the new rows enter the original statistics and unresolved differences remain blocking.
const state=[[b,'B7:B17'],[b,'D40:G61'],[b,'D115:G117'],[b,'D156:G159'],[s,'D6:H96'],[s,'M6:R96'],[u,'D6:H46'],[u,'M6:V46']].map(([sh,r])=>({sh,r,values:sh.getRange(r).values}));
set(s,'D95','是');set(s,'F95','已确认');eq(b,'H20',1,'New postal code case included in regression count');eq(b,'H158','待确认','Postal mapping auto included');eq(s,'V95','待确认','Mapping unresolved cannot confirm case');
for(const [a,v]of [['B7','复核模拟'],['B8','AUDIT-BUILD'],['B9','复核模拟交付'],['B10','复核模拟需求'],['B11','复核模拟UI'],['B12','已确认'],['B15','复核模拟账号'],['B16','2026-10-12'],['B17','已核对']])set(b,a,v);
set(b,'F158','已确认');set(b,'G158','复核模拟批准邮编映射');eq(s,'V95','已确认','Approved postal mapping activates basis');set(b,'D158','否');eq(b,'H158','范围矛盾','Selected mapped case cannot exclude its decision');eq(s,'V95','待确认','Contradictory mapped scope blocks basis');set(b,'D158','是');set(b,'F158','已记录后置');eq(b,'H158','核心依据不可后置','Core mapping cannot be postponed');set(b,'F158','已确认');
for(const [a,v]of [['G95','通过'],['H95','AUDIT-BUILD'],['M95','复核模拟结果'],['O95','复核模拟执行人'],['Q95','复核模拟交付'],['R95',get(b,'B18')]])set(s,a,v);
eq(s,'I95','通过','New valid complete case can pass');eq(b,'H22',1,'New valid pass included in statistics');set(s,'E95','');eq(s,'I95','关键项待分类','New case inherits critical classification guard');set(s,'E95','是');set(b,'B15','');eq(s,'I95','批次未就绪','New case inherits execution readiness guard');set(b,'B15','复核模拟账号');
set(u,'D46','是');set(u,'F46','已确认');eq(b,'F20',1,'New UI case included in statistics');eq(u,'AF46','待确认','New UI case requires approved UI decision');set(b,'F57','已确认');set(b,'G57','复核模拟UI批准');eq(u,'AF46','已确认','New UI case links approved UI basis');
for(const p of state)p.sh.getRange(p.r).values=p.values;
w.recalculate();eq(b,'B6','未就绪','Final original batch metadata restored');for(const c of ['B22','F22','H22'])eq(b,c,0,`Final ${c} remains zero`);
assert.equal(caseMap.size,132);assert.equal(s.getRange('P6:P96').values.filter(v=>v[0]==='冒烟').length,28);assert.equal(s.getRange('P6:P96').values.filter(v=>v[0]==='专项回归').length,63);
for(const [id,{sh,r,col}]of caseMap){assert.equal(get(sh,`G${r}`),'未执行',id);for(const d of deps.get(id)||[])assert(sh.getRange(`${col}${r}`).formulas[0][0].includes(`'本批提测'!$H$${decisionRows.get(d)}`),`${id} links ${d}`);}
for(const p of preserved)assert.deepEqual(p.sh.getRange(p.r).values,p.values,`final preservation ${p.r}`);
const errors=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},maxChars:1200});assert(errors.ndjson.includes('matched 0 entries'),errors.ndjson);
await (await SpreadsheetFile.exportXlsx(w)).save(path);
await fs.writeFile(`${root}/site-verification.json`,JSON.stringify({path,changes,checks,counts:{functional:91,smoke:28,regression:63,ui:41,total:132,decisions:29,web:10},errors:errors.ndjson},null,2));
console.log(JSON.stringify({path,changedCases:changes.length,checks:checks.length,total:132}));
for(const [sheetName,range,name]of [['网站详情对照','A5:D8','site-facts'],['冒烟用例','J90:L90','site-fx-case'],['冒烟用例','J95:L95','site-postal-case'],['UI检查','J46:L46','site-ui-association'],['本批提测','A154:H159','site-decisions']]){const blob=await w.render({sheetName,range,scale:1.1,format:'png'});await fs.writeFile(`${root}/${name}.png`,new Uint8Array(await blob.arrayBuffer()));}
console.log('Site review export and previews saved.');process.exit(0);
