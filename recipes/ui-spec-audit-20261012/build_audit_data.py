import json, re, hashlib, html
from pathlib import Path
from datetime import datetime
from collections import Counter
from PIL import Image

W=Path(r'.\.work\ui-spec-audit-20261012')
O=Path(r'.\outputs\frontend-audit\ui-spec-audit')
REPO=Path(r'.\pcs-front')
REVIEW_URL='https://example.invalid/source/e04459bb0b'
NORM_URL='https://example.invalid/source/b12a1bc700'
src=json.loads((W/'review-source.json').read_text(encoding='utf-8'))
ev=json.loads((W/'evidence-index.json').read_text(encoding='utf-8'))
for name,refs in [('current-su-create','RV05 / RV06'),('current-su-detail','RV07 / RV22')]:
    p=O/'evidence'/f'{name}.jpg'
    if not any(x['path']==str(p) for x in ev):
        im=Image.open(p)
        ev.append(dict(id=f'EV{len(ev)+1:02}',reviewRef=refs,recordId='',kind='本会话本地原型走查',module='服务单元',path=str(p),relativePath=f'evidence/{name}.jpg',width=im.width,height=im.height,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(W/'evidence-index.json').write_text(json.dumps(ev,ensure_ascii=False,indent=2),encoding='utf-8')
for e in ev:
    if e['id'] in ['EV47','EV48']:
        p=Path(e['path']);im=Image.open(p)
        e.update(width=im.width,height=im.height,sha256=hashlib.sha256(p.read_bytes()).hexdigest())
(W/'evidence-index.json').write_text(json.dumps(ev,ensure_ascii=False,indent=2),encoding='utf-8')
def clean(v):
    if isinstance(v,list): return ' / '.join(clean(x) for x in v)
    if v is None:return '未填写'
    return re.sub(r'<at\b[^>]*>(.*?)</at>',r'\1',str(v))
records={x['ref']:x['record'] for x in src}
def code(path,line=None):return str(REPO/path)+(f':{line}' if line else '')
proto='docs/other/SN318系统 · 产品、订单与合单配载交互原型_files/saved_resource.html'
actions=[]
def add(ref,p,module,verdict,observed,target,norm,loc,retest,roles,decision='',eids=None):
    refs=ref.split(' / ') if ref.startswith('RV') else []
    ids=eids if eids is not None else [e['id'] for e in ev if e['reviewRef'] in refs]
    actions.append(dict(id=f'UI{len(actions)+1:02}',priority=p,module=module,review=ref,verdict=verdict,observed=observed,target=target,norm=norm,location=loc,retest=retest,roles=roles,decision=decision or '无；按已读规范实施',evidence=' / '.join(ids) or '源文本或代码定位',owner='',status='待安排',result='未执行',version=''))
add('RV01','P0','基础配置','迁移待验证','附件显示分类混在内容区；Vue 仓库未找到基础配置业务路由。','主数据 / 计价底座移到页头一级 Tabs；子项使用内容区 Tabs；新增选项位于当前列表顶部。','§5.17 Tabs；§6.1 列表页', '测试环境 /pcs/system-config/master-data；目标业务组件未在当前仓库找到','切换两级分类，确认列表与新增对象同步；分类切换不丢必要筛选；单一选中、层级和按钮归属一致。','UI / 开发','RV01 蓝湖稿仅有链接，尚未读取；以已读 Review + V1.2 实施前核对专项稿')
add('RV02','P1','左侧菜单','代码差异','AppSider 设置 accordion=true；手动展开被限制为单组。','区分手动展开与跨分类选择：手动允许多组；点击另一组子菜单时收起其他组；选中项祖先保持展开。','RV02 专项交互；§5 导航',code('src/layout/components/AppSider.vue',13),'手动展开两组；点击另一组子项；刷新当前子页；分别检查展开组、选中高亮及导航路径。','UI / 开发')
add('RV03','P1','全局行内编辑','需求缺口','当前 Review 建议及问题为空；仅写 UI 产出行内编辑规范，状态修改中。','补齐可编辑字段、进入方式、保存/取消、校验、并发和失败恢复；规范确认后再实现组件。','RV03；§5 表单与反馈（不能代替专项规范）','业务列表与行内编辑组件，当前无可核对专项稿','UI 确认专项稿后建立用例；覆盖 Enter/Esc、失焦、失败保留值、权限及多行编辑策略。','UI / 产品 / 开发','需 UI 补齐专项规范；当前不能认定某套编辑交互合规')
add('RV04','P0','全局文案','原型差异','原型混入流程说明、原型说明及冗余解释；需产品逐页确认去留。','产品逐页删去展示无关的原型/流程说明；保留必需业务规则、字段帮助、错误反馈及风险提示。','§8 文案；RV04',code(proto),'逐页检查页头、弹窗、空态、辅助文字；删文案后仍能理解必填、费用、状态及禁用原因。','产品 / 开发','项目要求既有产品文案不得擅改；由产品给出最终文本')
add('RV05','P0','服务单元限制选择','原型差异','本地新建弹窗同时显示复选框、选中标签与已选计数。','保留可勾选列表反馈，删除重复选中标签/数量汇总；保证勾选与实际提交值一致。','RV05 专项建议；§5 多选',code(proto,17185),'勾选、取消、全选/部分选、重新进入，检查仅保留单套反馈且保存值不变。','UI / 开发',eids=[e['id'] for e in ev if e['reviewRef']=='RV05']+['EV47'])
add('RV06','P1','新增服务单元','原型差异','当前新建服务单元仍由长弹窗承载。','使用独立完整表单页，复用 FormView；分组展示基础信息、限制与价卡相关内容，底部操作明确。','§6.4 表单页；RV06',code(proto,17185)+'；复用 src/views/demo/FormView.vue','由列表进入、填写长内容、校验、保存/取消、返回列表；表单页滚动与未保存提示均可用。','开发',eids=[e['id'] for e in ev if e['reviewRef']=='RV06']+['EV47'])
add('RV07 / RV22','P0','服务单元详情','需求冲突','RV07 要独立页面；RV22 要右侧 Drawer；本地原型实际为居中详情弹窗。','先由产品/UI 确认唯一承载方案；建议列表快速查看用 Drawer，完整操作是否保留独立页需明确入口和职责。','§6.2 详情页 / §6.3 详情抽屉；RV07、RV22',code(proto,17026)+'；未来 SU 业务路由未找到','决策后点击详情：核对列表上下文、分组、长内容滚动、关闭返回、刷新/深链；不得同时做两套重复详情。','产品 / UI / 开发','独立页与 Drawer 必须择定或明确不同用途；RV07 原记录角色/状态缺失',eids=[e['id'] for e in ev if e['reviewRef'] in ['RV07','RV22']]+['EV48'])
add('RV08','P1','历史版本','迁移待验证','Review 标记设计完毕；附件给出 Drawer 草稿，未证明业务实现已上线。','历史版本列表与详情放同一 Drawer 内切换；详情顶部提供返回；字段按组展示，保留列表上下文。','§5 Drawer；§6.3；RV08','服务单元/价卡历史版本入口；ByDrawer 模板','查看版本列表→详情→返回；切换版本无多层弹窗；滚动、关闭、版本标识和原列表位置正确。','UI / 产品 / 开发')
add('RV09','P1','禁用编排确认','迁移待验证','Review 附件使用信息语义图标，操作实际是警示确认。','换 Warning 图标及警示语义；明确影响和取消/确认禁用动作。','§3.1 语义色；§3.7 图标；RV09','服务单元禁用编排确认弹窗','打开确认后检查 Warning、影响文案、按钮层级；取消不改变状态；确认及失败反馈另在测试环境执行。','UI / 产品 / 开发')
add('RV10','P2','侧边栏视觉','迁移待验证','Review 指向框架已有样式；模板可复用，但业务菜单尚未接入。','统一层级缩进、字重、选中范围、箭头、间距与一级图标，复用框架 Token。','§3 基础；RV10',code('src/layout/components/AppSider.vue',139),'展开/折叠、长菜单名、选中/悬停、窄屏，按设计稿对照；不把 RV02 交互与视觉混作一个验收。','开发')
add('RV11','P2','顶部导航','代码差异','模板搜索框与通知入口展示但没有对应搜索/通知动作。','复用框架顶部导航；隐藏未接功能入口；标题与页头职责明确，不重复页面标题。','RV11；§6 页面布局',code('src/layout/components/AppHeader.vue',33),'检查所有可见顶部入口均有可用动作；标题、用户菜单与展开侧栏功能正确。','开发')
add('RV12','P1','所有页面页头','迁移待验证','框架 PageHeader 存在；业务页仍需迁移核对，Review 要避免标题重复。','面包屑移至页头；唯一 H1；说明仅必要时显示且一行；操作区右对齐末行；不使用「」装饰说明。','§5 页头 N09/N10；RV12',code('src/layout/components/PageHeader.vue',1),'完整/标准/紧凑三种页头；长标题、副标题缺省、按钮较多、窄屏；检查对齐及重复标题。','产品 / 开发')
add('RV13','P2','所有筛选区','迁移待验证','Review 强调实际字段数量，不机械照抄示例列数；业务查询联动未全测。','复用筛选尺寸/间距与查询重置；保留真实字段；三项自然排列；下拉使用框架组件，操作有刷新反馈。','§6.1 列表页；RV13','业务筛选组件；参考 src/views/demo/ListView.vue','3项/多项/长选项/窄屏；查询改变结果、重置清空全部条件；日期和多选也纳入重置与请求。','开发')
add('RV14','P2','所有表格容器','迁移待验证','已有 ByTable 框架可复用，业务表格未在源码中逐一落地。','统一容器 padding、表头/行高、背景、固定列、长内容及操作区；隐藏无用工具栏仍保留间距。','§5 Table N11；RV14','ByTable；参考 src/views/components/sections/TableSection.vue','无工具栏、有工具栏、长表头、长行内容、横向滚动；检查间距和固定区无错位。','开发')
add('RV15','P1','所有分页','迁移待验证','Review 要求复用分页；总数、分页与接口对应未执行。','统一 total、当前页、页容量及跳页；可按业务配置显示，禁止另造视觉样式。','§5 Table；RV15','ByTable 分页配置；业务列表 composable','页容量变化回到合法页；删除/筛选后总数和页码一致；末页、空列表和大总数不溢出。','开发')
add('RV16','P1','表格固定列','迁移待验证','原型表格字段多，需防止核心字段与操作横向滚动丢失。','仅固定左侧选择框/必要标识及右侧操作；保留分隔线/阴影，避免大面积冻结。','N11 Table；RV16',code('src/views/demo/config/listConfig.ts',49),'横向滚动到两端与中间；核心标识、操作可达；固定列悬停/选中背景与滚动区一致。','开发')
add('RV17','P1','批量操作栏','框架能力可复用','ListBatchBar 已在普通流顶部提供按选中显示的能力；业务迁移未验证。','使用表格顶部批量栏；选中>=1显示，清空后恢复默认工具栏；禁止底部浮层遮挡列表。','N14 选择状态；RV17',code('src/components/biz/ListBatchBar.biz.vue',1),'0/1/多条/部分全选/取消全选；分页策略明确；批量栏不遮挡内容和分页。','开发')
add('RV18','P2','表格行与 Tag','迁移待验证','Review 要求行高48与整行选中；图片不能证明实时所有状态一致。','行高48；表头500字重；默认白色、hover #EBF3FD、选中 #D1E4FB，覆盖固定单元格；统一 Tag/复选框。','N11/N13；RV18','ByTable / 业务列配置与状态 Tag','普通、hover、选中、部分全选、固定列、长文本；实测行高、字重与颜色。','开发')
add('RV19','P0','列表编码链接','待产品决策','Review 指出编码蓝色可点击外观却无动作，容易误导。','产品决定编码是否进入详情；有详情则真链接并支持键盘，无动作则改普通文字。','§8 交互文案；RV19','各业务表格编码列渲染','逐个蓝色编码点击/键盘 Enter；有路径可返回列表；无动作不出现链接视觉或 tabindex。','产品 / 开发','需产品给出编码点击规则；不擅自给每个编码新增详情路由')
add('RV20','P0','AI 建档解析','迁移待验证','Review 附件显示长向导弹窗；当前仓库没有业务 AI 建档页面。','迁至独立表单页：上传、解析、人工确认、保存明确分步；桌面内容区24px；保留失败恢复和文件说明。','§6.4 / §7 反馈；RV20','服务单元 AI 文档建档入口，目标业务源码待定位','完整路径及解析失败/重试/返回上步/未保存离开；验证 AI 结果需确认后才落业务。','产品 / 开发')
add('RV21','P1','刷新与路由','待运行验证','Review 指出刷新后意外跳转；当前仅可检查模板，真实登录态业务路由未全测。','保持当前合法路由和必要状态；仅在产品约定的无权限、过期等条件跳转。','RV21；§6 页面导航','src/router；业务列表 query 与详情路由','已登录列表/详情/子 Tab 刷新；前进后退与深链；筛选分页恢复策略及无权限路径均核对。','开发','需明确哪些筛选/Tab/草稿状态应持久化；不一概保存全部字段')
add('RV23','P0','服务单元页头操作','迁移待验证','Review 附件显示按钮层级与重复列表标题；需与当前真实业务界面核对。','AI 文档建档与新增服务单元放页头右侧；删除重复“服务单元列表”卡片标题。','N09 页头；RV23','服务单元业务列表页；PageHeader actions 插槽','按钮层级与标题唯一；长标题/多按钮/窄屏不遮挡；进入正确新建及 AI 流程。','开发','该按钮规则仅针对服务单元；RV01 新增选项仍属于当前列表顶部')
add('补充','P1','基础配置筛选空态','线上观察','本会话筛选国家无结果时显示普通无数据空态及新增引导。','区分初始无数据与筛选无结果；后者显示“未找到相关结果，请调整筛选条件”及清空筛选。','§7.2 空态 N21','测试环境 /pcs/system-config/master-data 国家列表；当前仓库缺少对应源码','分别验证初始空库、筛选无结果、加载中、失败；清空筛选恢复原列表，不能引导误新增。','开发',eids=['EV43'])
add('补充','P1','国家新增/编辑字段','线上观察','本会话新增国家表单部分输入框缺少稳定可访问名称。','为真实字段标签建立 for/id 或 aria-labelledby 关联；必填和错误通过同一字段定位，不依赖 placeholder。','§5 表单；补充可用性检查（关联标签验收）','测试环境国家表单；目标 MasterDataWorkspace 未在仓库找到','检查每个控件的可访问名称；点标签聚焦；键盘导航；错误指向字段；不同语言下名称不为空。','开发',eids=['EV44'])
add('补充','P2','示例表格操作列','代码差异','listConfig.ts 操作列 align=center，而规范将操作归为左对齐。','操作列及表头左对齐；多操作间距16px；沿用固定右侧配置。','N12 对齐；N11 操作间距',code('src/views/demo/config/listConfig.ts',53),'窄/宽操作列、1/多操作、表头与文本起始位置；数值列仍右对齐。','开发')
add('补充','P1','金额精度','契约待核对','示例金额输入 precision=2；V1.2 数值展示规定金额4位。输入精度与展示规则不能直接视为同一契约。','产品明确输入、存储、计算、展示精度；展示按4位及币种/千分位；如允许4位输入，再调整字段与接口。','§9 数值格式 N22',code('src/views/demo/components/FormFields.biz.vue',50),'测试1.2345、0、负值、极值、币种切换；核对输入/保存/展示不意外舍入。','产品 / 开发','需确认金额输入与后端契约；不能仅把 precision=2 改4即认定完成')
add('RV01 衍生','P1','Tabs 键盘与语义','规范补充检查','新增 Tabs 已进入 V1.2；业务实现未找到，不能仅凭截图判定键盘能力。','两级 Tab 使用 tablist/tab/tabpanel、aria-selected 与关联 ID；支持方向键/Home/End，始终单选并即时切内容。','§5.17 Tabs 最新正文','基础配置新增 Tab 组件；目标业务实现待定位','Tab 聚焦、方向键、Home/End；读屏识别层级与所控面板；未选面板不参与交互。','UI / 开发')
add('补充','P2','Drawer 圆角','规范待决','V1.2 基础圆角写 Drawer16px；Core tokens 注释写“直角贴边”，仅凭注释不能判定实际渲染值。','UI/核心层确认靠边抽屉是否例外；更新规范或统一组件。先测 ByDrawer 的实际计算样式，禁止改 node_modules 交付。','§3.4 圆角 N07；§5 Drawer',code('node_modules/@baiyun/template-core/dist/styles/tokens.css',160),'打开真实 ByDrawer，读计算圆角及靠边边角；确认产品选定规则；如改核心层须在包仓库发布后升级。','UI / 核心层开发','基础16px 与贴边直角规则需明确适用范围')
add('补充','P2','页头高度规范文本','规范待决','V1.2 列出120/94/68px，同时描述全部为4的倍数；94并非4的倍数。Core 已使用94。','UI 确认保留94及例外说明，或给出新标准并评估迁移；业务暂沿用已列明94，禁止自行改成96。','页头 N10；§3.3 间距',code('node_modules/@baiyun/template-core/dist/styles/tokens.css',208),'规范文字与 Token 最终一致；三个档位及内容换行实测；若改变高度回归全部 PageHeader。','UI / 核心层开发','属于规范内部表述冲突，不直接给现有94px实现判失败')
add('RV22 拆分','P1','服务单元详情图标','原型差异','本地详情仍使用“📋 下单限制” emoji 标题。','用 Arco 线性图标表达下单限制，按16/20/24px语义尺寸与继承色；文案保留，装饰图标不重复读屏。','RV22 禁止 emoji；§3.7 图标 N08',code(proto,17026),'Windows/浏览器不同字体下图标一致；标题与读屏名称不重复；不要更换产品字段名称。','开发',eids=['EV48'])

checks=[]
def check(id,topic,norm,spec,scope,verdict,related,method):checks.append(dict(id=id,topic=topic,norm=norm,spec=spec,scope=scope,verdict=verdict,related=related,method=method))
check('QC01','主色与交互色','N01 / §3.1','#046EFC / hover #035ED4 / active #0242A8','全局 Token 与业务页','Core具备；业务未全测','UI10/UI18','计算样式检查按钮、链接、选中态；禁止自定义近似蓝色')
check('QC02','语义色','N02 / §3.1','成功#18A058；警示#E87D13；错误#E24B4A；信息#046EFC','确认、错误和状态','需业务复测','UI09','核对图标/色彩/文本同时表达语义')
check('QC03','中性色','N03 / §3.1','页底#EFF2F7；卡片白；表面#F7F7F7；正文#4B5564；标题#1A2130','页面背景与文本','Core具备；业务未全测','UI10/UI14','读计算样式并核对文本层级')
check('QC04','字体层级','N05 / §3.2','H1 20/500；H2 16/500；H3 14/500；正文14/400；辅助13、12；不使用600/700','标题、表格及说明','需业务复测','UI12/UI18','逐页检查字号、字重和行高')
check('QC05','间距','N06 / §3.3','4、8、16、24、32、48px；桌面页内容24px','表单、列表、按钮','需业务复测','UI13/UI14/UI20','测容器padding、控件gap、按钮间距')
check('QC06','圆角','N07 / §3.4','控件8；卡片12；Modal/Drawer16px','弹窗与抽屉','待明确Drawer例外','UI28','核对实际样式与贴边直角的适用范围')
check('QC07','图标','N08 / §3.7','Arco；行内16、操作20、装饰24；色继承；不用emoji','全局/详情','本地原型差异已见','UI09/UI30','详情标题图标及警示确认检查')
check('QC08','唯一页头','N09 / 页头','唯一H1；面包屑在页头；可选单行说明；动作右对齐末行','全部业务页','业务迁移待核对','UI12/UI22','全量路由截图逐页比对')
check('QC09','页头档位','N10 / 页头','完整120、标准94、紧凑68px；94与4倍数描述冲突','PageHeader','规范待决','UI29','UI确认后核对Token及实际高度')
check('QC10','Tab视觉','§5.17 正文','页头48px/14/500/gap24；列表40px/14/400/gap16；底线2px主色；水平padding0','基础配置','目标实现未找到','UI01','两层分类切换及计算样式对照')
check('QC11','Tab语义与键盘','§5.17 正文','单选；aria-selected；tablist/tab/tabpanel；方向键/Home/End','基础配置','未执行运行验证','UI27','键盘+可访问树检验')
check('QC12','手动多组展开','RV02 专项','手动展开不限多组；跨组选择子项才收起其他组','AppSider','代码差异','UI02','区分两种动作并检查祖先展开')
check('QC13','筛选布局及行为','RV13 / §6.1','按业务字段自然排布；查询/重置标准尺寸及刷新反馈','列表','行为未全测','UI13','多选/日期/关键词一起筛选与重置')
check('QC14','Table尺寸','N11 / Table','48px行高；表头#F7F7F7/500；分割线1px#EBEBEB','列表','待迁移验证','UI14/UI18','测行高、表头及容器padding')
check('QC15','列对齐','N12','文本/状态/时间/操作左对齐；金额/重量/数量右对齐','示例及业务表格','示例代码差异','UI25','检查操作列配置及表头对齐')
check('QC16','行状态','N13','默认白；hover#EBF3FD；选中#D1E4FB；固定列也覆盖','列表','未执行实时状态测试','UI18','hover+选中+横向滚动检查')
check('QC17','选择/批量栏','N14 / RV17','全/空/部分选择；选中>=1显示表格顶部批量栏','列表','框架能力可复用','UI17','0/1/多选、切页、取消，检查不遮挡')
check('QC18','固定列','N11 / RV16','左选择+必要标识；右操作；分隔阴影；避免过度冻结','宽表格','需业务复测','UI16','滚动两端/中间与固定区同色')
check('QC19','分页','RV15 / Table','复用total/page/pageSize/jump；按业务配置显示','列表','接口未验证','UI15','边界页、筛选后页码、页容量变化')
check('QC20','空态区分','N15/N21 / §7.2','初始无数据→新增；筛选无结果→调整/清空筛选；无权限→联系管理员','国家筛选','线上差异已见','UI23','复测三种空态及失败/加载')
check('QC21','Drawer基础','N16/N17','480/640px、全高靠右；标题16/500；内边距24；固定底部；遮罩.45','详情/历史版本','承载决策及实现待核对','UI07/UI08','长内容、关闭、遮罩、内部滚动与列表恢复')
check('QC22','Drawer状态','N18','打开250ms ease-out；关闭200ms ease-in；loading头部可关闭','详情/历史版本','未执行动效验证','UI08','慢请求/失败/长内容与返回列表')
check('QC23','新建编辑表单','N20 / §6.4','标题新增XXX/编辑XXX；长复杂任务独立页；必填与校验明确','服务单元','本地仍长弹窗','UI06','字段分组与完整保存/取消路径')
check('QC24','AI流程','RV20 / §6.4/§7','独立页；上传/解析/人工确认；失败可恢复','AI建档','待业务实施验证','UI20','不跳过人工确认；重试保留材料和状态')
check('QC25','金额与单位','N22 / §9','展示金额4位+币种+千分位；重量3位KG；数量整数；比例2%；体积4位CBM','列表/表单','输入契约待核对','UI26','边界数值与完整保存回显')
check('QC26','可操作视觉','RV19','蓝色链接有动作；无动作普通文字','编码/入口','需产品决策','UI19/UI11','鼠标+键盘逐个检查可见入口')
check('QC27','路由刷新','RV21','合法当前路由与必要状态保留；特殊跳转产品约定','业务各页','未执行登录态回归','UI21','刷新、深链、返回/前进、过期/无权限')
check('QC28','文案及字段名称','§8 / RV04；补充标签检查','删无关原型说明；保留必要帮助；控件有稳定字段名称','业务页/国家表单','局部差异已见','UI04/UI24','人工扫文案及可访问名称、错误关联')

mapping={ref:[a['id'] for a in actions if ref in a['review']] for ref in records}
assert len(actions)==30 and len(checks)==28
assert all(mapping[r] for r in records if r!='RV24')
assert not mapping['RV24']
data=dict(created=datetime.now().astimezone().isoformat(timespec='seconds'),reviewUrl=REVIEW_URL,normUrl=NORM_URL,reviewRevision=680,normRevision=5256,commit='66a11b60e756454108a9bd396ed4db74b64f0c61',actions=actions,checks=checks,evidence=ev,review=[dict(ref=x['ref'],fields={k:clean(v) for k,v in x['record'].items() if k not in ['截图','框架/规范依据/设计稿截图']},actions=' / '.join(mapping[x['ref']]) or '仅保留空白占位，未生成修改项',evidence=' / '.join(e['id'] for e in ev if e['reviewRef']==x['ref'])) for x in src],counts=dict(priorities=dict(Counter(a['priority'] for a in actions)),verdicts=dict(Counter(a['verdict'] for a in actions))))
data['reviewFetchedAt']=datetime.fromtimestamp((W/'review-records.manifest.json').stat().st_mtime).astimezone().isoformat(timespec='seconds')
(W/'audit-data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
# Keep inspectable source snapshots without credentials or attachment download tokens.
(O/'审查数据.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(O/'规范摘录.json').write_text((W/'norm-tables-values.json').read_text(encoding='utf-8'),encoding='utf-8')
H=lambda s:html.escape(str(s))
cards=[]
for a in actions:
    pics=''.join(f'<a href="{H(e["relativePath"])}" target="_blank"><img loading="lazy" src="{H(e["relativePath"])}" alt="{H(e["id"])} {H(e["kind"])}"><span>{H(e["id"])} · {H(e["kind"])}</span></a>' for e in ev if e['id'] in a['evidence'].split(' / '))
    cards.append(f'''<article data-priority="{a['priority']}"><header><b>{a['id']}</b><em class="{a['priority']}">{a['priority']}</em><h2>{H(a['module'])}</h2><small>{H(a['verdict'])} · {H(a['review'])}</small></header><p><strong>观察：</strong>{H(a['observed'])}</p><p><strong>修改：</strong>{H(a['target'])}</p><p><strong>验收：</strong>{H(a['retest'])}</p><div class="meta"><p>规范：{H(a['norm'])}</p><p>位置：{H(a['location'])}</p><p>承接：{H(a['roles'])} · 前置：{H(a['decision'])}</p></div><div class="pics">{pics}</div></article>''')
rows=''.join(f'<tr><td>{H(r["ref"])}</td><td>{H(r["fields"].get("页面/模块"))}</td><td>{H(r["fields"].get("优先级"))}</td><td>{H(r["fields"].get("框架适配判断"))}</td><td>{H(r["fields"].get("确认状态"))}</td><td>{H(r["actions"])}</td></tr>' for r in data['review'])
gallery=''.join(f'<a href="{H(e["relativePath"])}" target="_blank"><img loading="lazy" src="{H(e["relativePath"])}" alt="{e["id"]}"><span>{e["id"]} · {H(e["reviewRef"])} · {H(e["kind"])}<br>{e["width"]}×{e["height"]}</span></a>' for e in ev)
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SN318 UI 规范审查与修改清单</title><style>*{box-sizing:border-box}body{margin:0;background:#eff2f7;color:#1a2130;font:14px/1.65 "Microsoft YaHei",sans-serif}main{max-width:1320px;margin:auto;padding:28px}h1{font-size:26px;margin:0}h2{font-size:18px;margin:0}p{margin:8px 0}.hero,article,.panel{background:white;border:1px solid #ddd;border-radius:12px;padding:24px;margin-bottom:20px}.stats{display:flex;gap:16px;flex-wrap:wrap;margin:20px 0}.stats div{background:#ebf3fd;padding:14px 24px;border-radius:8px}.stats b{font-size:26px;display:block;color:#046efc}.notice{background:#fff7e6;padding:14px 18px;border-left:4px solid #e87d13}nav{position:sticky;top:0;background:#fff;padding:12px;display:flex;gap:12px;flex-wrap:wrap;z-index:1;border-bottom:1px solid #ddd}button,input{font:inherit;border:1px solid #ddd;border-radius:8px;padding:7px 14px;background:white}button.active{background:#046efc;color:white}input{min-width:270px}article header{display:flex;gap:12px;align-items:center;flex-wrap:wrap}em{font-style:normal;border-radius:5px;padding:3px 10px}.P0{background:#fdecec;color:#b42318}.P1{background:#fff7e6;color:#995000}.P2{background:#ebf3fd;color:#035ed4}small,.meta{color:#4b5564}.meta{font-size:12px;border-top:1px solid #ebebeb;padding-top:8px;overflow-wrap:anywhere}.pics,.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:16px}.pics a,.gallery a{background:#f7f7f7;color:#4b5564;text-decoration:none;padding:8px}.pics img,.gallery img{width:100%;height:180px;object-fit:contain;background:white}.pics span,.gallery span{display:block;font-size:12px;margin-top:6px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{padding:10px;text-align:left;border-bottom:1px solid #ebebeb}th{background:#ebf3fd}a{color:#046efc}footer{color:#4b5564;font-size:12px}details summary{cursor:pointer;font-weight:bold}article[hidden]{display:none}@media(max-width:680px){main{padding:12px}.hero,article,.panel{padding:16px}nav{position:static}input{min-width:0;width:100%}table{display:block;overflow:auto}}</style><main>'''
page+=f'''<section class="hero"><h1>SN318 前端 UI 规范审查</h1><p>基于最新 Review、V1.2 规范、当前仓库及本会话页面走查，交付可分派的修改清单。</p><p><a href="{REVIEW_URL}">Review 视图</a> · revision 680 · 24条记录（23条非空、1条占位）<br><a href="{NORM_URL}">通用设计规范 V1.2</a> · revision 5256 · 提取相关22个规范表格及 Tabs 正文</p><div class="stats"><div><b>30</b>修改项</div><div><b>{data['counts']['priorities'].get('P0',0)}</b>建议 P0</div><div><b>28</b>规范检查维度</div><div><b>{len(ev)}</b>截图证据</div></div><div class="notice"><b>待定：详情独立页 / Drawer</b>（RV07与RV22冲突）；行内编辑专项稿缺失；Drawer圆角及页头94px规范表述需澄清。颜色表示框架适配判断，设计完毕表示设计状态，均不等于实现通过。</div><p>仓库为模板/原型，未找到测试环境基础配置业务组件；业务迁移项须在真实实现处复测。已构建成功不代表真实登录、接口或业务流程验收通过。</p><a href="SN318_前端UI规范审查与修改清单.xlsx">下载可编辑 Excel 修改清单</a></section>'''
page+='<nav><button class="active" data-p="all">全部修改</button><button data-p="P0">P0</button><button data-p="P1">P1</button><button data-p="P2">P2</button><input id="q" placeholder="搜索模块、Review、代码位置"><a href="#source">Review对照</a><a href="#gallery">全部截图</a></nav><section id="actions">'+''.join(cards)+'</section>'
page+='<section id="source" class="panel"><h2>原始 Review 对照</h2><p>优先级、框架适配与确认状态保留原值；上方建议优先级由本次审查单独给出。</p><table><thead><tr><th>来源</th><th>模块</th><th>原优先级</th><th>框架适配</th><th>确认状态</th><th>修改项映射</th></tr></thead><tbody>'+rows+'</tbody></table></section>'
page+='<section id="gallery" class="panel"><details><summary>48 张证据截图（点击查看原图）</summary><p>42张来自飞书Review附件，6张来自本会话线上/本地走查；附件为源记录截图，不能当作最新部署画面。</p><div class="gallery">'+gallery+'</div></details></section>'
page+=f'''<footer>生成：{H(data['created'])} · 源码：{data['commit']} · 只读审查，未修改业务源码、未写回飞书。开发状态与复测结果均等待实际执行填写；完整来源/证据哈希保存在审查数据.json。</footer></main><script>let p='all';function filter(){{const q=document.querySelector('#q').value.toLowerCase();document.querySelectorAll('#actions article').forEach(a=>a.hidden=(p!=='all'&&a.dataset.priority!==p)||!a.textContent.toLowerCase().includes(q))}}document.querySelectorAll('button[data-p]').forEach(b=>b.onclick=()=>{{p=b.dataset.p;document.querySelectorAll('button[data-p]').forEach(x=>x.classList.toggle('active',x===b));filter()}});document.querySelector('#q').oninput=filter;</script></html>'''
(O/'SN318_UI审查报告.html').write_text(page,encoding='utf-8')
print(json.dumps({'actions':len(actions),'checks':len(checks),'evidence':len(ev),'priority':data['counts']['priorities'],'coverage':len(mapping)-1},ensure_ascii=False))
