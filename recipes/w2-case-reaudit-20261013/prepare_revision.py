import json, hashlib, re
from pathlib import Path
from collections import Counter
W=Path(__file__).parent
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
old=load(W/'input-readback.json')
d=load('./recipes/w2-frontend-cases-20261013/cases-data.json')
base={r[0]:r for r in old['cases']}
scopes={r[0]:list(map(int,r[3].split('、'))) for r in d['cases']}
rows={r[0]:r[:] for r in old['cases']}
allseq=[p[0] for p in d['packages']]
lists=[1,7,11,12,22,23,26,28,29,50,51,52,53,54,55,56,57,58,65]
forms=[3,8,13,14,15,18,25,27,28,50,51,52,53,54,55,56,57,58]
writes=[2,3,5,8,10,13,14,15,17,18,19,20,24,25,27,28,50,51,52,53,54,55,56,57,58]
reasons={}; observations={}; granularity={}
def revise(id,reason,seqs=None,**fields):
    col={'day':1,'group':2,'title':4,'pre':6,'steps':7,'expected':8,'basis':9}
    for key,value in fields.items():rows[id][col[key]]=value
    if seqs is not None:scopes[id]=seqs
    reasons[id]=reason
def append(id,seqs,title,pre,steps,expected,basis,design=False,group='专项组件'):
    rows[id]=[id,'10/13–10/16，条件齐备后执行' if not design else '10/13，评审未闭环项',group,'',title,'优先',pre,steps,expected,basis,'待评审','不适用' if design else '未执行','不适用' if design else '未执行','','','','']
    scopes[id]=seqs; reasons[id]='补漏：'+title

revise('RV01','与RV12区分：范围采纳在先，提测证据在后',steps='1.核对W2的38个UI/开工作包。\n2.逐包定位PRD与采纳设计稿、角色和承载位置。\n3.原型条目确认本期纳入或排除；不检查提测执行结果。',expected='38包范围均可追溯；UI/开表示本周阶段，不能据此认定功能已交付。执行证据由RV12检查。')
revise('RV04','服务单元历史仍是本期范围待确认；组合历史在W2序号9内',expected='序号9组合历史用自己的批准稿；序号4只有只读详情，服务单元历史是否纳入W2需书面确认后再补执行映射。Review的服务单元历史抽屉不能直接套给组合。',basis='Review rev680 review-2a5a56bb27；PRD rev8345组合历史；W2序号4/9；待确认JJRvdZkDqoccEuxvKuec0E5XnUg')
revise('RV08','同步范围必须同时覆盖汇率，c20未闭环',seqs=[50,51,58],title='费用项、汇率与财务同步本期范围',pre='PRD c20未闭环；人工维护/财务同步/异常回退资料',expected='逐对象确认本期维护与同步范围；费用项及汇率的财务审批契约独立于产品管理直接生效规则。未纳入同步不要求现场成功，纳入的须有接口与结果证据。',basis='PRD rev8345 c20、IdwedhovqoUIIAxC5XUcNXjbn9b；FE51/RV14；W2序号50/51/58')
revise('RV12','明确作为提测入口，不重复RV01封板范围',steps='1.检查本包角色、Build、入口、数据和采纳稿。\n2.检查开发已执行的主流程与证据。\n3.确定复核实例及遗留项，不把资料评审当执行。',expected='每个交付包分别具备开发自测与测试复核证据；缺入口的保留交付条件，页面观察不填写业务通过。')

revise('FE01','group/resource仅基础配置使用，不能强加38包',pre='本批真实路由清单；合法账号；基础配置费用项和币种/汇率路径已可见',expected='返回目标路由及该路由实际需要的参数；基础配置group/resource不串对象，其他模块按自己的参数契约；登录返回路径符合批准方案。')
revise('FE04','消除与FE46深链接/API越权验证重叠',title='权限刷新后菜单、旧缓存与展开状态',steps='1.高权限角色查看对象。\n2.切受控低权限角色，刷新权限。\n3.观察菜单、展开和旧视图缓存；深链/API改由FE46验证。',expected='失效菜单和展开状态清理；旧对象与缓存不在低权限视图残留；本条仅覆盖权限切换后的前端状态恢复。')
revise('FE09','只读包不能强制拥有编辑/新建页',pre='本模块实际交付的列表、详情或编辑承载；不要求每包都具备三类页面',steps='1.按交付清单逐个进入实际支持的承载。\n2.核对H1、面包屑、返回和按钮归属。',expected='唯一主标题与当前对象一致；仅校验实际支持的动作，序号11策略只读详情不要求新增/编辑按钮。')
revise('FE10','普通对象切换按钮不能当Tabs执行通过，也不能因现状未实现删除设计要求',pre='RV01已记录采纳的Tabs设计；实际tab/tabpanel组件；费用项/币种/字典当前是普通按钮',expected='采纳Tabs的页面验证选中、方向键/Home/End和ARIA关联；当前基础配置普通按钮只在FE11核查。若采纳设计要求Tabs但页面未实现，登记差异，不直接标不适用。',basis='UI规范 rev5256 §5.17；Review rev680 review-67fb39add5；设计采纳待确认')
revise('FE11','与FE10分离：本条覆盖当前普通按钮及对象数据作用域',pre='费用项、币种、汇率及五类业务字典；当前可见对象切换按钮',basis='PCS本轮P01/P05/P06/P08/P10/P11–P20；Review基础配置方案另见FE10')
revise('FE13','不存在的日期条件不应强制造数据',pre='该页实际支持的关键词/状态/日期条件；多页测试对象（若已交付分页）',expected='所有已支持条件恢复批准默认值；实际有日期条件时也清空；页码、总数与当前对象一致。')
revise('FE15','以10/13实测替代历史视觉差异，规格采纳与实际执行分开',basis='UI规范 rev5256；UI20/21/22；本轮P01/P06/P08/P11–P20：行高48px、操作居中gap4px，数字左对齐。视觉规格是否采纳须记录。')
revise('FE16','固定列与全文展现按实际批准需求，避免要求窄字典所有列固定',expected='批准的固定标识/操作列保持可见；按钮不被裁切、层不穿透；有省略内容时按批准方案显示全文。不支持固定列且无该要求的页面只检查滚动可达。')
revise('FE17','只读列表和禁止创建页面不强制空态新增按钮',pre='无筛选且确定真实无记录；当前页创建权限与创建功能范围已确认',expected='加载结束后真无数据文案正确；有创建能力/权限才要求新增引导，纯只读列表按采用空态显示。')
revise('FE18','本次重现筛选无结果，更新证据来源',basis='UI规范rev5256 §7；本轮P02费用项查无结果显示“暂无费用项数据”及新增，P04恢复后取消读回；仅页面观察')
revise('FE22','无PRD明确排序列时不把所有列表列为固定执行包',seqs=[],pre='RV01确认本批某列表支持排序，补排序列、空值、同值与分页契约；当前可见基础配置未有排序控件',expected='只对批准排序的列执行升/降/默认及查询分页组合。尚无具体W2包的排序列依据，本条保留为条件能力，批准后更新包映射；不把列表展示序号当排序能力。')
revise('FE26','移除导入/生成/复制和不具备不可变编码契约的表单',seqs=[3,13,50,51,52,53,54,56],pre='有编辑回显且明确存在创建后不可变编码的对象；51仅币种编码，56仅批准带编码字典',expected='编辑对象回填正确；契约声明不可变的编码不可改，异步回填后再判空。51汇率无业务编码，转BP51/FE52；组合编码稳定身份在BP08核查，不假定与费用项同一输入机制。',basis='PRD rev8345 doxcnIfDa45s0FvaJkff1LVRGDf、W8zSdgSjYofBqNxltzicv1OJn9g、PSWLdxM9HojqJLxDnDBcT5uZnAe、XyJ3dkiZFoMFSIxF5y7cOJ9bnfc、PLXkdRIKGowzcVxcgYLcq5oPnVe、Ckz3du4qxo8ICrx0uTpcg7WSnSb；币种/字典不可变编码契约需补。P03/P07/P12/P14/P16/P18/P20为现状。')
revise('FE27','普通字段校验与向导/文件校验拆开',seqs=forms,pre='本包普通编辑表单或明细编辑字段；原型18/25/28/58先补合同；向导及文件校验由各BP/FE43–45检查')
revise('FE28','限长校验仅文本表单字段，导入/复制不套用',seqs=forms,pre='该对象实际文本字段；L来自字段PRD或批准补充合同，未定义限长先待依据；中文/粘贴/全空格')
revise('FE29','剔除费用项及服务段/要素/方式等纯文本对象的数值映射',seqs=[3,8,14,15,27,51],pre='仅实际数值字段：服务单元抛比/KG-CBM、组合容量/优先级、计费明细、燃油比例、币种小数位与汇率。合法零与空值规则逐字段确定。',steps='1.按字段合同测试允许零、禁止零、空值及边界。\n2.区分整数与小数、负数与单位。\n3.保存读回与展示分开核对；汇率特有规则见FE52/RV14。',expected='整数不收非法小数；空不当0、允许0不当缺失；单位、输入/存储/展示精度按本字段规则。51币种小数位与汇率不可共用同一边界。')
revise('FE30','限定普通表单脏字段，文件队列取消由FE43覆盖',seqs=forms,pre='普通表单改名称或一个非编码可编辑字段为W2_CANCEL，不提交；导入队列/覆盖摘要分别由FE43/BP20核查',basis='UI48；本轮P03/P04费用项取消重开恢复“运费”；其余对象与关闭/返回尚须实际执行')
revise('FE31','补批量及向导最终动作防重，避免套普通保存字段',seqs=writes,title='最终写入动作加载与防重复',steps='1.触发本包实际最终动作（保存/批量/导入确认/覆盖等）。\n2.慢响应期间重复点击或Enter。\n3.按批准结果范围读回ID及数量。',expected='本包实际最终动作有加载反馈与防重；一次操作只产生一份批准结果。向导中间步骤不作为保存，只读包不强制写入。')
revise('FE32','补最终写入结果验证，向导不套关联普通表单保存',seqs=writes,title='最终写入成功提示与结果持久化',steps='1.完成本包批准的最终写入并记ID/范围。\n2.刷新或重入实际承载。\n3.仅在声明有关联影响时读取关联处。',expected='最终值、对象数和声明的关联关系持续存在；中间预览、Toast、本地数组或healthz不能判业务通过。')
revise('FE33','通用失败重试与组合明确并发契约分开，防止要求全站版本冲突',seqs=writes,title='最终写入失败后的恢复与重试',pre='本包受控失败响应及合成写入对象；输入/摘要恢复规则已批准',steps='1.让本包最终写入失败。\n2.核对草稿或确认摘要与错误定位。\n3.合法重试并读回，已成功对象不重复产生。',expected='失败反馈清楚；输入/队列按批准恢复规则保留或重置，重试结果一致。组合双会话版本冲突由BP10执行；未声明并发契约的对象不强制套该预期。')
revise('FE34','未批准Drawer的承载按RV03先确认',pre='慢详情响应；本包批准采用Drawer（4先RV03、9按组合稿、23按自身稿）',expected='实际Drawer加载中可关闭；A响应不重开、不串B；列表可操作。批准整页的序号4使用FE35乱序断言，本条不强制Drawer。')
revise('FE36','移除W2只读详情包4的未确认历史功能执行映射',seqs=[9],pre='序号9组合至少两个批准历史版本；服务单元历史是否纳入W2由RV04确认后再补映射',basis='PRD rev8345服务组合版本规则；W2序号9；服务单元Review UI51只作为RV04范围判断')
revise('FE38','危险动作须分场景；字典删除不必一律引用阻断',expected='取消不变更；按批准影响范围提示并读回。5是禁用编排，10是组合引用删除，15是明细行删除；50费用项引用价卡禁止删并显示引用数；52/53/55按各自合同阻断；56字典删除后新表单不再选择、历史单据保留；57先闭环最后一项规则。51汇率不套普通删除。',basis='PRD rev8345 BZHedArBlo9AFwx4hnSczZnynoe、GN99dpKtLopV12xJ4Xuc6RHInxb、RuWSdnetVoFzomxkb6UcHKlenEb；UI04/46；RV06')
revise('FE39','补费用项/汇率的币种字典下拉；下单规则重复反馈单列FE48',seqs=[3,8,16,22,23,25,50,51,55,57],pre='实际声明关联选择器；A/B近似名称不同ID；50费用类型/默认币种，51汇率源/目标币种',basis='PRD rev8345 P3MudzZbOo8mNVxz8VLcMesWnTh、YRHBd0vGYoT0ysxI8LZcs8LVnvb、TPJ7deqHmojpicxplf3c898EnCe；50专用字段见FE50；3规则冗余反馈见FE48')
revise('FE40','现状自然日不能被当作最终PRD裁决',pre='各字段已批准日期/时区/区间口径；51先闭环RV14；空结束日若有合同才测试',expected='分别按字段合同核对自然日或分钟/秒、端点包含及结束可空规则。51当前是自然日区间，但正文/待确认/页面有冲突，未裁决前只记录现状，不自行批准。',basis='PRD rev8345 RYktdcppmomJlUxyPbecof1enfb；UI30；PCS P08–P10；RV14')
revise('FE41','以本轮字典/费用项表单标签证据更新可访问性',basis='UI规范 rev5256 §5.17；本轮P03/P05/P07/P10/P12/P14/P16/P18/P20输入无id/labels/aria-label关联；完整键盘路径仍待执行')
revise('FE43','文件取消与FE30普通草稿分开',pre='已批准的文件类型/大小/数量和合成文件；本条检查文件队列/进度，不重复普通字段取消',expected='错误明确；取消后文件队列与进度按契约清理；业务阈值来自本包合同。字段草稿见FE30，正式行写入见FE44。')

revise('BP01','服务单元列表关键词不是独立编码与名称筛选条件',steps='从关键词分别按已知编码/名称搜索，再叠加实际批准的覆盖范围/服务商/状态条件，打开命中对象。',expected='关键词口径、交集、标识与详情身份按PRD；不强制独立编码和名称输入框。实际有详情动作才使用链接态。')
revise('BP02','补批量启用/禁用编排/导出各自范围，导出不以Toast代验',steps='同/异状态对象逐个及全页勾选，核对批量启用、禁用编排与导出选中可用性；先取消风险动作，再执行批准样本；文件验证复用FE42。',expected='选择数量、动作允许性及逐对象结果一致；导出真实文件范围可核对。服务组合的选择规则不能直接套给服务单元。')
revise('BP03','补服务单元名称格式及历史未改名称例外，普通必填不覆盖该规则',pre='RV02已采用；服务商/覆盖范围/抛比/KG-CBM等合法字段；历史名称未改与新名称非法两组对象',steps='按批准承载创建合法服务单元，核对“文本-文本-文本”名称及允许字符；编辑历史名称未改与主动改名分别验证；保存读回编码/自动成本卡关联。',expected='名称校验保留PRD历史未改例外；编码系统生成不可改；必填、字段分组、保存区和自动关联正确。采用独立页或弹窗以RV02裁决为准。',basis='W2序号3；PRD rev8345 doxcnb09DgLCmSJt7GClZLq6HI6、doxcnTeBsM7ikABPc4fuWDnLN7d、E4GAdtFlIoZuCox6PNWc9lE4n07；Review review-de7057751b')
revise('BP08','补稳定编码身份、无变化不增版本；不套只读编码输入字段',expected='成员去重、顺序、角色、优先级、容量与汇总一致；新增编码可填/空由系统分配，后续配置变更保持稳定身份；无有效变更不误增版本。',basis='W2序号8；PRD rev8345 ZykzdPYWao0UJxxnHDecG5oLnSb、D4LodrSUFoLLcrx7Xk7cO357nyc；SM31/32/65')
revise('BP13','补名称作用域唯一性与保存/启用状态，避免自造审批',expected='只读自动编码、名称必填且服务单元内唯一、绑定及合法时间按PRD；显示精度不错误退化自然日。保存/启用直接生效与待生效含义复用FE53。',basis='W2序号13；PRD rev8345 W8zSdgSjYofBqNxltzicv1OJn9g、GDBgdsZ7Ho5TfFxzo3pcw6GrnIe、doxcnDkMdybt1CZaC1uBloBtlxe')
revise('BP50','分组编码不直接代替费用项类型；补数据源、审批与引用删除检查',title='费用项类型/币种、取消与引用关系',pre='费用项PRD字段清单；已知FRT及合成合法/被价卡引用对象；真实写入条件齐备后执行',steps='查无结果→重置→编辑名称取消重开；对照费用项类型及默认币种数据源（FE50）；合法维护读回、类型/币种审批生效（FE51）；检查价卡引用删除保护。',expected='空态、取消、编码/名称64字边界正确；费用项类型及币种不由当前文本框自行替代；类型/币种变更与普通名称编辑按各自规则生效；引用禁止删除并显示数量。',basis='W2序号50；PRD rev8345 AkILdFJiNoD2xCxehV8c2OgInme、ZkN5doR3fogXQnxQJUDcM0LGnzg、P3MudzZbOo8mNVxz8VLcMesWnTh、BWU0dO5WHoRNWYxWTPHcy4cDnfc、BZHedArBlo9AFwx4hnSczZnynoe；P01–P05')
revise('BP51','汇率现状不当批准规则；编辑/版本、精度、乘除、审批先裁决',pre='币种与汇率对象分别建数据；RV14裁决普通编辑/新增版本、日期、精度、乘除及审批；裁决前仅页面核对',steps='币种编辑回显/取消；切汇率核对现有只读和结束日字段；裁决后分别执行新增/调整流程及FE52专用校验，刷新读回。',expected='币种与汇率不共用普通CRUD；不要求汇率普通删除。当前7.20000000和自然日只是现状；最终输入/展示精度、区间、版本与审批按RV14结论。',basis='W2序号51；PRD rev8345 Vn2MdKcaBoZ8bHxRF9gcL1QnnTe、TNkwdVW6Oo4YsJxZJcIch8jOnVb、待确认BQoxdnmSNozllGxaiQgc3x31ngb；P06–P10')
revise('BP52','名称64与编码唯一可直接定位；历史编排保护纳入专包',expected='编码必填唯一、创建后不可改；名称必填最多64字。修改名称/说明不覆盖历史产品编排版本；删除保护按合同。航空/运输字典不是服务段。',basis='W2序号52；PRD rev8345 XyJ3dkiZFoMFSIxF5y7cOJ9bnfc、MGG8dU14OoZVurxYi3Wc0BNQnze、DkMDd8aVVoJFSjxJKF5c1ngTnfc')
revise('BP53','补单位修改不覆盖历史价卡及计费快照',expected='编码必填唯一且不可改；名称最多64字，单位保存/引用同源；名称/单位修改不覆盖历史价卡和历史计费快照。费用项不是计费要素。',basis='W2序号53；PRD rev8345 PLXkdRIKGowzcVxcgYLcq5oPnVe、VsDWdCD6RoS3KMxnrWQc0MPRnzg、XpJ6drCn0o2GhXxZE8hcC2hLnof')
revise('BP54','新增方式枚举与列表历史枚举不能一律相同',expected='名称/编码/类型必填，编码唯一不可改；新增可选固定/条件/单价/首续重，列表可包含区间总价/均摊，不因列表更多就要求新增可选全部；适用要素按RV07结论。',basis='W2序号54；PRD rev8345 ISDldtgVLotbzQx5OYrc6hu9nAe、M3cedlHecoNO78xaq3nccdodnhh、Jpqvdw8vTozsRLxpa94c9lFknzd；c19')
revise('BP56','五个现有字典不等于本期完整字典范围；普通选项不强制带编码',title='字典范围、对象字段与下游选项',pre='批准字典分类清单；当前航空/运输/货物/包装/监管五类只是已见子集；费用类型/结算币种/限制类型等来源需逐项定位',steps='对照批准分类清单登记已有/缺入口项；逐已见对象开编辑核对字段并取消；普通选项与带编码选项分别维护读回；在实际下游选择器核对。',expected='五类专用字段不串用；普通字典选项值必填，带编码字典编码/显示名必填。删除后新表单不再选择、历史单据不受影响；仅五类页面可见不能认定全包完成；货物类型不代验BP57。',basis='W2序号56；PRD rev8345 Z71Fdh4BNoc2DaxX0YQczqDVnKO、KhcFdV9jwos2ypxTyO1coVmVnE9、UUQLdCg7hoMZr4xig7zc3Y5fnKe、VME3dIq0toi6IdxkoZ1cv9Ysnme、RuWSdnetVoFzomxkb6UcHKlenEb；P11–P20；分类c15采纳另确认')

append('RV13',allseq,'原型说明与必要帮助文案采用清单','Review白色说明文案待确认；真实用户所需单位/提示/错误说明','逐页标注原型演示说明、用户帮助、业务规则与错误提示；产品确认删留及替换稿。','只删除已确认的原型说明，保留必要帮助和规则；不因“说明类”自动删全部文案。','Review rev680 review-5cb0b5dcb6；W2全包；规范rev5256',True,'设计准出')
append('RV14',[51],'汇率编辑/版本、精度、乘除与审批裁决','PRD正文4位/普通编辑/财务审批；待确认段不编辑/新增版本/乘除；PCS8位展示/自然日区间','1.逐项列正文、待确认和页面三列。\n2.产品/财务确定本期采纳：输入与展示精度、编辑/版本、区间/时区、乘除及审批。\n3.回写FE29/40/52与BP51，未裁决前不选一种现状作为验收。','冲突有书面采纳版本和明确排除项；页内结束旧区间说明不证明已具备完整版本流；财务同步范围同步RV08。','PRD rev8345 Vn2MdKcaBoZ8bHxRF9gcL1QnnTe、TNkwdVW6Oo4YsJxZJcIch8jOnVb、IdwedhovqoUIIAxC5XUcNXjbn9b、待确认BQoxdnmSNozllGxaiQgc3x31ngb；P08–P10',True,'设计准出')
append('FE48',[3],'服务单元下单规则选择与重复反馈','批准下单规则选择器及选中反馈；Review蓝色待确认；批准跨页规则','在服务单元表单打开规则选择，跨页/搜索选两条再取消一条；核对勾选、标签与计数；重开读取已保存选择。','选中ID与实际保存一致、不重复；仅勾选/标签/数量的组合按采纳稿。PRD要求的数量不得因Review建议直接删；规则维护本体仍由BP55执行。','Review rev680 review-24220c26b9；UI03；PRD服务单元下单规则选择；W2序号3')
append('FE49',lists+[4,9],'链接外观、实际动作与键盘可达','列表/详情中实际表现为可点击的编码或引用；明确目标路由或Drawer','逐项点击和键盘激活链接态标识，核对目标ID及返回路径；无批准动作的标识核对采用的纯文本外观。','链接态有真实同对象动作且键盘可达；无动作不得伪装链接。当前FRT等纯文本不因编码字段而强制有链接；版本/引用身份分别核对。','Review rev680 review-a7e8b941e2绿色待确认；PRD组合XipbdJTDwoQVNSxrfI9cOD26nNh；UI49')
append('FE50',[50],'费用项类型与默认币种数据源','PRD类型9类与结算币种来源清单；当前分组编码/币种文本框对应方案待明确','对照费用项类型控件、实际值/ID、默认币种下拉及可选来源；选择合法类型/币种，保存重开，并在新价卡明细读带出值。','类型必填且取业务字典费用类型，币种必填且取结算币种；新明细带出默认币种。若采用字段改名/控件变更，需批准映射；当前分组编码和自由文本不能直接视为符合。','PRD rev8345 VFgBdRLqiofNwqxu4RIcQyRSnSh、ZkN5doR3fogXQnxQJUDcM0LGnzg、P3MudzZbOo8mNVxz8VLcMesWnTh、SxYVdsnN4ozb86xu4v2cl22jn5b；P03/P05')
append('FE51',[50],'费用项类型/币种变更审批与生效','本期财务审批及状态合同；受控名称改动/类型改动/币种改动三组对象','分别仅改名称、改类型、改默认币种；对照保存后、审批前、批准后与拒绝后显示及下游取值。','类型/币种变更财务审批后才生效；普通名称修改不套同一审批预期。审批前后有效值与下游一致；未交付审批承载/状态合同记录依赖，不凭按钮认定通过。','PRD rev8345 BWU0dO5WHoRNWYxWTPHcy4cDnfc；RV08；产品管理无审批规则不得覆盖此费用项专用约定')
append('FE52',[51],'汇率币种对与生效日期唯一校验','RV14已裁决；新建普通汇率及预置CNY→CNY=1.0000；重复三元组和合法不同日期样本','测试源=目标的普通新增、系统预置默认记录；已有源/目标/生效日期重复新增；不同日期、缺日期、0/负倍率分别提交再修复。','普通新增源目标不同，预置同币种默认记录保留例外；三元组不能重复，倍率>0且日期必填；精度/乘除/版本端点按RV14裁决。错误可定位且不写入非法结果。','PRD rev8345 RNyFdDCX5o4s39xPItacz3EtnMh、Y0C1dasmLoewZcxSB8WcQ0yunHg、FJ2pdm9AUolgmZxQVK3cme2Fnnb；P10')
append('FE53',[3,5,8,13,14,15],'产品管理保存/启用与待生效反馈','已批准产品管理状态与生效时间；未来/当前/尚未启用对象','分别保存、提交、启用，并刷新读取状态及生效时间；未来生效与未启用对象核对文案。','服务单元/成本价卡/组合本系统内直接生效，不创建审批工单；待生效表达未启用或未到生效时间。费用项/汇率财务审批另按FE51/RV14，不用同一状态解释。','PRD rev8345 doxcnDkMdybt1CZaC1uBloBtlxe、doxcnEcXtzDMJPegiw7D9MWUsjr、Yq7qdf58fotZfRxgkFJcm0eyndc；W2服务/价卡相关包')

# 共享检查按同一Build、角色、页面实例复用；包索引只列专项/有条件组件。
public=['RV01','RV11','RV12','RV13','FE01','FE02','FE03','FE04','FE05','FE06','FE07','FE08','FE09','FE41','FE46','FE47']
pending=[17,18,19,20,21,24,25,28,29,58,65]
for id,r in rows.items():
    if id in ['FE22']: r[3]='条件能力：批准后登记具体包'
    else:r[3]='全部W2' if scopes[id]==allseq else '、'.join(map(str,scopes[id]))
    if id.startswith('RV'):granularity[id]='本批评审；采纳版本变更再复核'
    elif id in public:granularity[id]='同Build/角色/承载复用；变体再执行'
    elif id=='FE22':granularity[id]='批准排序的物理列表实例'
    elif id.startswith('FE'):granularity[id]='实际组件实例；字段/对象变体分别留证'
    else:granularity[id]='本工作包业务对象及主流程'
    observations[id]='本轮只有50/51/56部分入口可见；本条其余包未作页面确认。' if any(n in [50,51,56] for n in scopes[id]) else '当前账号未见该业务入口；需本包角色/入口/Build及受控数据。'
    if id in public:observations[id]='当前账号仅系统配置/基础配置；公共检查按物理页面/角色/Build复用，不逐38包重复执行。'
    if any(n in pending for n in scopes[id]):observations[id]+=' 原型/正文未定位部分先补范围与合同。'
    # 全部资料本轮重读；源码事实仍保留先前提交边界，不升格为在线实现。
    r[9]=r[9].replace('Review快照rev680','Review rev680（10/13重读）').replace('PRD8345快照','PRD rev8345（10/13重读）').replace('PRD快照c18','PRD rev8345 c18（未闭环）').replace('PRD/Review快照2026-10-12','PRD rev8345 / Review rev680（10/13重读）')
obs={
'FE10':'P01/P06/P08/P11：分组及对象均普通按钮，无tab/tabpanel；设计采纳仍待确认。',
'FE11':'P01/P05/P06/P08/P10/P11–P20：费用/币种/汇率/五字典标题与表单已逐对象核对；未保存。',
'FE15':'P01/P06/P08/P11–P20：48px行高；操作居中、gap4px；币种小数位和汇率倍率左对齐。',
'FE18':'P02：已证明有FRT，查无结果仍显示暂无费用项数据及新增；重置恢复。正式执行状态保持未执行。',
'FE26':'P03/P07/P12/P14/P16/P18/P20：费用/币种/五字典编辑编码disabled；P09汇率无编码且源/目标/倍率/生效日disabled。',
'FE29':'P07币种小数位可编辑；P08倍率展示7.20000000；P09倍率编辑只读；最终精度待RV14。',
'FE30':'P03/P04：费用项临时名称W2_REAUDIT_CANCEL取消后重开仍为运费；仅此对象、取消路径的页面观察。',
'FE40':'P08–P10当前自然日区间/结束可空/源目标倍率生效日编辑只读；待RV14裁决。',
'FE41':'P03/P05/P07/P10/P12/P14/P16/P18/P20：输入无id/labels/ARIA标签关联；键盘错误路径未执行。',
'BP50':'P01–P05：费用项1条FRT；分组编码/默认币种都是文本框；缺费用项类型与币种来源的批准映射，保存/审批/删除未执行。',
'BP51':'P06–P10：币种USD/CNY，汇率CNY→USD 7.20000000；编辑仅结束日/状态可变；无普通删除；正式写入及财务审批未执行。',
'BP56':'P11–P20：五字典各1条，编辑字段已逐类核对；未验证完整分类范围、下游同源、保存或删除；货物类型不覆盖BP57。',
'RV14':'P08页面说明结束旧区间新增调整；P09实际只编辑结束日/状态；P10新增汇率存在。完整版本/乘除/审批承载未确认。',
'FE49':'P01/P11等当前编码是普通文本；不会因没有编码链接判失败。仅批准的链接态才执行。',
'FE50':'P03/P05当前没有费用项类型控件，分组编码required但FRT编辑为空；币种为自由文本。需产品字段映射。',
'FE51':'P03仅现有编辑表单；未提交保存，审批页面/状态/流转均未核验。',
'FE52':'P10新增源币种/目标币种/倍率/生效日可填；普通同币种、重复三元组和非法倍率均未提交。',
}
observations.update(obs)
order=[r[0] for r in old['cases']]+[id for id in rows if id not in base]
prepared=[]; journal=[]
for id in order:
    r=rows[id]; prepared.append(r[:17]+[observations[id],granularity[id]])
    journal.append([id,'新增' if id not in base else ('修订' if id in reasons else '保留'),base[id][3] if id in base else '—',r[3],reasons.get(id,'未发现独立场景重复；组件与BP专项的层级不同，按实例复用避免重复执行。'),r[9],observations[id]])
packages=[]
for p in d['packages']:
    p=p[:];n=p[0]
    p[9]='、'.join(id for id in order if id.startswith('RV') and id not in public and n in scopes[id])
    p[10]='、'.join(id for id in order if id.startswith('FE') and id not in public and n in scopes[id])
    p[13]=(p[13]+'；' if p[13] else '')+'公共用例见本周执行；按实例复用，不逐包重复跑。'
    readiness='部分入口已核对；正式业务写入与关联结果未执行' if n in [50,51,56] else '当前角色未见入口；不认定功能缺失或通过'
    conditions=('RV14汇率规则裁决；币种不可变编码合同' if n==51 else '费用项类型/币种字段映射；财务审批合同；价卡引用样本' if n==50 else '批准字典范围/字段；下游引用样本' if n==56 else '封板范围/批准PRD/入口/测试数据' if n in pending else '实际交付路由/角色/Build/采纳稿及测试数据')
    packages.append(p+[readiness,conditions])

assert len(prepared)==105 and len(packages)==38
assert set(scopes)==set(rows)
for id,s in scopes.items():assert set(s)<=set(allseq) and len(s)==len(set(s))
assert scopes['FE29']==[3,8,14,15,27,51] and 4 not in scopes['FE36']
assert all(p[11]==f'BP{p[0]:02d}' for p in packages)
assert all(not set(public)&set((p[9]+'、'+p[10]).split('、')) for p in packages)
assert not any('FE22' in p[10] for p in packages)
assert all(rows[id][10:16]==base[id][10:16] for id in base)
stats={'original':97,'new':8,'total':105,'substantive_revisions':len([id for id in reasons if id in base]),'retained':len([id for id in base if id not in reasons]),'groups':dict(Counter('设计准出' if id.startswith('RV') else '组件交互' if id.startswith('FE') else '工作包专项' for id in order)),'packages':38,'visible_partial_packages':[50,51,56],'unobserved_entry_packages':35,'conditional_unmapped':['FE22'],'public':public}
facts=[
['本轮PCS入口边界','10/13已登录PCS M1全量授权；仅见系统配置/基础配置；费用项、币种/汇率、五字典部分入口已核对','3包部分可见，35包当前角色未见入口；未据此推断功能缺失。'],
['费用项字段与币种来源','P03/P05：分组编码与默认币种文本框；PRD要求费用类型与结算币种来源','FE50补字段映射；FE51补类型/币种审批；BP50补引用阻断。'],
['汇率三方规则冲突','正文4位/普通编辑；待确认段新增版本/乘除；当前8位展示、区间调整且仅结束日/状态可改','RV14先裁决；FE52专用校验；BP51不把现状当最终预期。'],
['当前表格及可访问性','P01/P06/P08/P11–P20：48px；操作居中gap4px；数字left；表单无程序化标签关联','FE15/41保留差异观察；Tabs采纳另确认，普通按钮在FE11执行。'],
['取消与筛选空态','P02筛选无结果仍引导新增；P04费用项取消重开恢复正式名称','观察只覆盖当前对象和取消路径；没有正式保存/删除/审批测试通过记录。'],
['用例范围与去重','FE26/29收窄；FE31–33覆盖最终写入；FE36仅组合历史；五字典不是完整字典包','公共16条按Build/角色/物理承载复用；FE/BP为不同层级，不逐包重复公共检查。'],
['开发框架参考','源码仍引用先前commit66a11b60，断点/骨架/Drawer/AI仅是框架参考证据','业务路由、文件、关联数据、权限及持久化在实际交付页分别留证。'],
]
sources=[
['S01','W2排期','10/13 live rev988；0sbkIa A1:Z231；UI/开38项','https://example.invalid/source/7cdefbaffe'],
['S02','产品PRD','10/13 live rev8345；正文、删除段及待确认段分别解释','https://example.invalid/source/0e963cc756'],
['S03','UI Review','10/13 live rev680；稳定record_id；设计/修改中/待确认不代表采纳或实现','https://example.invalid/source/e04459bb0b'],
['S04','UI规范','10/13 live rev5256；数值业务合同优先；视觉采纳另确认','https://example.invalid/source/b12a1bc700'],
['S05','PCS本轮页面','10/13已登录；1280×800；P01–P20截图及DOM观察；未提交保存/删除','https://localhost/pcs/system-config/master-data?group=fee&resource=fee_item'],
['S06','原97条工作簿','原文件保留；sha256='+old['sha256'],'PCS_W2前端测试用例_按任务节奏细化.xlsx；原编号及K:P执行/证据输入保持'],
['S07','框架源码历史基线','先前只读commit66a11b60e756454108a9bd396ed4db74b64f0c61；本轮未将其升格为PCS交付事实','pcs-front路由、权限、布局、demo组件；引用聊天仅背景，验收以本轮来源和实际页为准'],
]
out={'input':old['path'],'input_hash':old['sha256'],'out':'./artifacts/w2-tasks/20261013/PCS_W2前端测试用例_飞书与页面复核修订.xlsx','cases':prepared,'packages':packages,'journal':journal,'facts':facts,'sources':sources,'stats':stats,'public':public,'scopes':scopes}
(W/'revision-data.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(stats,ensure_ascii=False))
