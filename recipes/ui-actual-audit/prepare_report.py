import json, pathlib, hashlib, datetime, urllib.parse, collections
from PIL import Image

root = pathlib.Path('.')
work = root / '.work/ui-actual-audit'
cases = json.loads((work/'source-cases.json').read_text(encoding='utf-8'))
evidence = json.loads((work/'evidence.json').read_text(encoding='utf-8'))
lists = json.loads((work/'list-scans.json').read_text(encoding='utf-8'))
case_map = {c['编号']:c for c in cases}
tz = datetime.timezone(datetime.timedelta(hours=8))
spec_url = 'https://example.invalid/source/b12a1bc700'
public_url = 'https://example.invalid/source/92f788d9b2'
review_url = 'https://example.invalid/source/e04459bb0b'
target_url = 'https://localhost/pcs/system-config/master-data'

valid_evidence = []
for e in evidence:
    if e.get('excluded'):
        continue
    path=pathlib.Path(e['path'])
    assert path.exists(), path
    e['imageWidth'],e['imageHeight']=Image.open(path).size
    utc = datetime.datetime.fromisoformat(e['time'].replace('Z','+00:00')) if e.get('time') else datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc)
    e['capturedAt']=utc.astimezone(tz).strftime('%Y-%m-%d %H:%M:%S')
    e['viewport']=f"{e['width']}×{e['height']} CSS px"
    e['imageSize']=f"{e['imageWidth']}×{e['imageHeight']} px"
    e['scopeNote']='可见区域截图；图片尺寸与CSS视口分别记录'
    if e['id']=='E26': e['scopeNote']='刷新启动阶段截图；未认定为页面数据加载的稳定结果'
    valid_evidence.append(e)
e_map={e['id']:e for e in valid_evidence}

def item(id,kind,scope,title,actual,basis,fix,retest,refs,ids,priority,role,selector,prerequisite='—',suggestions='—'):
    return dict(id=id,kind=kind,scope=scope,title=title,actual=actual,basis=basis,
                fix=fix,retest=retest,caseIds=refs,evidenceIds=ids,priority=priority,
                role=role,selector=selector,prerequisite=prerequisite,
                suggestionIds=suggestions,sourceUrl=public_url if id=='FE07' else spec_url,
                status='待开发修正' if kind=='实测问题' else '待UI/产品确认')

findings = [
item('FE04','实测问题','Zone列表·横向滚动初始位置；1440/1280桌面视口','固定操作列裁切删除按钮',
     '初始scrollLeft=0时，Zone右固定操作列宽230px，含查看详情/编辑/停用/删除四个按钮。1440px量测最后按钮右边界1401px，单元格右边界1391px，截图显示右侧裁切。1280px初始位置仍可复现。',
     'SPEC §5.8：操作列固定最右，文字按钮间距16px；§4.5及UI24要求支持视口内关键操作可见可达。',
     '按实际按钮文字、框架Text按钮内边距和16px间距计算操作列最小宽度；修正固定列与裁切容器的宽度/overflow。以当前按钮尺寸计算约需292px，实际值随按钮规格复核。保留右固定能力。',
     '1440与1280分别在横向滚动初始/中间/最右端检查四个按钮完整显示、点击目标正确；右操作列和左核心标识保持定位。',
     ['UI10','UI12','UI21','UI24'],['E20','E24','E30','E31'],'优先','前端、UI',
     '.arco-table-col-fixed-right / .master-data-page__actions / .arco-table-content-scroll-x'),
item('FE05','实测问题','Zone详情·基本信息/成员Tabs；航线区域同类组件需回归','Tabs缺少ARIA语义，End键未切到末项',
     '实际Tabs为带tabindex的div，role=tablist/tab/tabpanel数量均为0，aria-selected缺失。在基本信息聚焦后按End，仍停留基本信息；鼠标点击成员可以切换。',
     'SPEC §5.17交互与响应式：tablist/tab/tabpanel语义、aria-selected同步；Tab进入，左右键切换，Home/End到首末项。',
     '为Tabs及面板补完整角色、ID关联和选中属性；实现左右键、Home/End及合理的焦点管理。使用符合规范的Tabs封装，避免仅增加视觉选中样式。',
     '检查AX能识别页签名称/选中态；鼠标与键盘选中、焦点及面板一致；End到成员、Home到基本信息，左右键可切换。',
     ['UI34','UI49'],['E21','E22','E25'],'优先','前端、UI',
     '.arco-drawer .arco-tabs-tab / .arco-tabs-content','列表Tab40px与触达44px的冲突另见DQ03，不据此改高。','INT08'),
item('FE01','实测问题','国家列表·关键词搜索无匹配结果','搜索空态误用无数据文案和新增引导',
     '国家已有中国/CN记录。输入UI_AUDIT_NO_MATCH_20261012并查询，列表0条却显示“暂无国家数据”及“新增国家”；重置后恢复1条。',
     'SPEC §7.2，内嵌2xUUpH!A3:C3：搜索/筛选无结果应说明未找到并引导清空条件；无数据才引导新增。',
     '按是否存在有效查询/筛选条件区分两类空态；无结果时显示调整条件的文案和重置/清空筛选入口；无数据时保留新增引导。建议在共用列表组件修正。',
     '分别验证真实无数据、关键词无结果、状态筛选无结果及重置；文案/引导正确，重置恢复数据与有效页码。',
     ['UI09','UI23','UI43'],['E01','E05'],'优先','前端、UI',
     '基础配置共用列表空态；.arco-table / empty-state区域','其他17对象尚未逐个触发筛选空态，修复后按对象回归。','INT03、INT10'),
item('FE07','实测问题','国家/航空公司/费用项/币种等已打开表单的字段控件','输入控件没有程序化关联字段名',
     '国家表单input.id为空、associatedLabels=0，aria-label和aria-labelledby均缺失。航空公司、币种等已查输入节点亦未配置id/aria-label/aria-labelledby；国家AX输入框没有字段名称。视觉标签本身存在。',
     '公共库§5.3的标签可读性、键盘核心操作；原UI49；通用规范§5.7规定字段名与输入控件对应，需以可访问名称实现这一对应。',
     '为每个字段生成稳定唯一ID，并用label[for]或aria-labelledby关联；Select/数字控件的聚焦节点也传递字段名，错误提示按需要用aria-describedby关联。',
     'AX/读屏能读出国家编码、中文名称等字段名与值；键盘焦点可见、顺序正确；label关联不因新增/编辑或条件字段切换而丢失。',
     ['UI25','UI44','UI49'],['E10','E14','E28','E32'],'优先','前端、UI',
     '.arco-form-item-label 与对应input/select聚焦节点','本次未进行完整读屏软件测试，名称缺失来自AX和DOM关联检查。','INT05、INT08'),
item('FE02','实测问题','币种“小数位”、汇率“直接倍率”列','数值列未按规范右对齐',
     '币种小数位2、汇率直接倍率7.20000000的表头及单元格内层text-align均为left。',
     'SPEC §5.8列对齐表tkqkxw!A5:C5：数字/金额/重量右对齐。这里只核实际出现的数值字段，未验证金额场景。',
     '按字段语义配置小数位和直接倍率的表头/单元格右对齐；统一数字列渲染，展示精度保持批准口径。',
     '零值、大数及不同位数样本右对齐；表头与单元格一致；币种符号、编码等字段按各自类型验证。',
     ['UI20','UI29'],['E15','E16'],'常规','前端',
     '币种/汇率Table列配置及.arco-table-cell-align-*'),
item('FE03','实测问题','国家、航空公司、币种、汇率等列表操作列','操作列居中，按钮组间距4px',
     '操作单元格使用arco-table-cell-align-center，justify-content:center；master-data-page__actions的gap=4px。国家和航空公司已量测，币种/汇率对齐也已核。',
     'SPEC §5.8：tkqkxw!A4:C4规定操作列左对齐；IOfbnI!A7:B7规定文字按钮间距16px。',
     '对齐操作列表头及内容到左侧；按钮组采用规范16px间距，并同时校正Text按钮自身padding。与FE04一起重新计算操作列宽度，避免增大间距后更严重裁切。',
     '各对象默认/横向滚动/窄视口下左对齐、间距一致，按钮不挤压或遮挡，固定列规则保留。',
     ['UI20','UI21'],['E01','E15','E16','E20'],'常规','前端、UI',
     '.arco-table-cell-align-center / .master-data-page__actions'),
item('FE06','实测问题','航线区域详情、Zone详情/成员编辑抽屉','抽屉外观未使用规范圆角',
     '航线区域和Zone可见Drawer面板的border-radius均为0px；Zone的header/body/footer也为0。页面采用右侧640px抽屉。',
     'SPEC §3.4圆角表jYqjvY!A4:C4：弹窗、抽屉使用border-radius-modal=16px。',
     '将可见抽屉面板边缘接入16px圆角Token，并使header/body/footer及裁切一致；若本项目要求贴边抽屉例外，先记录UI批准口径。',
     '详情与成员编辑切换、内容滚动、1280/1440下可见边缘圆角一致；内部内容不溢出，固定标题和底部操作仍可达。',
     ['UI39'],['E19','E21','E23','E25'],'样式统一','前端、UI',
     '.arco-drawer及可见面板边缘','是否采用贴边抽屉项目例外，需要UI确认。'),
item('DQ01','待确认事项','基础配置分类层级与新增入口','当前分组按钮结构与红色专项Review不同',
     '当前主数据/计价底座是非交互分组文字，下面共5个胶囊分类按钮；对象侧栏独立，新增按钮在页头右侧。Review要求主数据/计价底座一级Tabs、子项内容区以及列表区域顶部新增。',
     '原UI01、DEC01；Review review-67fb39add5（rev650，来源设计完毕）；SPEC §5.17适用性与Tabs形态。',
     'UI/产品确认本批采用的专项稿和例外。若采纳Review，改为批准的一级Tabs/子项层级并移动当前对象新增入口；若保留现结构，记录批准方案。',
     '按最终方案检查结构、切换的对象/标题/列表/新增目标、键盘与返回上下文。',
     ['UI01','UI33','UI34'],['E01','E13','E24','E29'],'先确认','产品、UI，前端跟进',
     '.master-data-workspace__group / __resource / 页头新增','未取得本批批准专项稿/Build，不以来源“设计完毕”认定系统已通过。'),
item('DQ02','待确认事项','邮编、省市等关联展示；航线区域国家关系；Zone成员/服务商范围','关联ID、名称与枚举跨视图显示口径不一致',
     '邮编国家列为1，编辑最终为中国CN。Zone成员列表为country/1/include，编辑为国家/中国CN/包含；列表服务商范围common，详情为通用。航线区域国家关系DOM读到1，但未切换关系页签留证。',
     '原UI41、UI45及DEC18的字段映射口径；SPEC §9数据可读性；本次实际列表/详情/编辑对照。',
     '产品明确名称/编码/ID与枚举标签映射。建议同一字段统一可识别中文标签与必要编码；取不到名称时清楚标记兜底，不把内部ID当作名称。',
     '对同一关联对象验证列表、详情、编辑及搜索候选显示一致；原始关联ID保持正确，空值和加载兜底有区分。',
     ['UI41','UI45'],['E06','E08','E19','E20','E22','E23','L02','L06'],'先确认','产品、前端、UI',
     '关联字段formatter / label映射 / 远程选择器已保存值回显','目前只确认展示差异，不能据此判定业务关联数据错误。'),
item('DQ03','待确认事项','表头颜色、详情Tabs触达及页头高度','规范内部口径冲突需统一',
     '已观察表头为#F7F7F7，详情Tabs高度40px。原表已记录：表头#F7F8FA/#F7F7F7、列表Tab40px/触达≥44px、页头94px/4倍数说明的冲突。',
     '原DEC18；SPEC §4.5、§5.8、§5.17、§4.2。',
     'UI维护统一采用值或项目例外，再让前端使用同一Token和组件规则；本次不凭其中任一冲突数值单独判失败。',
     '将批准数值和例外写入执行基线，按本批支持模板/设备逐项量测。',
     ['UI20','UI33','UI40'],['E01','E21','E25'],'先确认','UI、产品',
     '规范Token与本批批准组件','页头94px冲突沿用原表；本次未完成所有页头模板高度量测。'),
item('DQ04','待确认事项','配置对象卡片标题','标题层级与字号采用值待UI确认',
     '配置对象使用master-data-workspace__resources-title，computed font-size=13px、font-weight=500；H1与弹窗标题另已观察为20px/500、16px/500。',
     'SPEC §3.2 s4NgFa!A3:F4：模块/卡片标题H2为16px/500，卡片内分组H3为14px/500；辅助字为13px/400。',
     'UI确定配置对象属于模块标题、分组标题或批准的辅助标题，再接入对应字体Token；不要从当前CSS倒推验收值。',
     '18对象切换时标题层级与字体一致，无额外无依据字重。',
     ['UI19'],['E01','E12','L01','L14'],'先确认','UI、前端',
     '.master-data-workspace__resources-title','具体标题语义层级未取得专项采用结论。'),
item('DQ05','待确认事项','应用刷新启动/页面数据加载','全页Spin所属阶段及Skeleton要求待分层确认',
     '刷新Zone时捕获整页“加载中…”Spin。随后恢复正确group/resource并加载数据。该帧是否属于应用鉴权启动，当前证据不能区分；未据此认定所有列表加载缺少骨架。',
     'SPEC §7.1 OWeLZt!A2:C5：页面初始化Skeleton、局部刷新Spin、按钮loading、长任务Progress；原UI23/UI47。',
     '产品/UI区分应用鉴权启动与页面数据加载的表现；按批准场景接入Skeleton/区域Spin，并在可控慢响应中核对完整出现和结束过程。',
     '分别覆盖鉴权启动、列表初载、局部刷新、按钮提交及失败恢复；不出现假空态/假成功或永久loading。',
     ['UI23','UI47'],['E26'],'先确认','UI、产品、前端',
     '应用启动加载层与基础配置列表加载层','本次未注入慢网/失败，也未验证提交防重。','INT07'),
]

# Case coverage records observations rather than formal pass/fail: no release Build was supplied.
coverage_detail = {
 'UI01':('观察差异，待确认','分类/对象切换及国家新增入口已查，当前结构与专项Review不同。',['E01','E29','L01','L14'],['DQ01'],'批准专项稿、采纳范围与本批Build。'),
 'UI02':('部分已核','当前会话仅见系统配置→基础配置；1280折叠与1440展开被观察。', ['E01','E24'],[],'多个一级分类切换/手动同时展开尚无场景。'),
 'UI03':('本次URL未覆盖','下单限制属于服务单元，未使用基础配置对象代验。',[],[],'需服务单元入口、DEC22及专用数据。'),
 'UI04':('本次URL未覆盖','禁用编排风险提示不在所查基础配置对象。',[],[],'需对应服务单元场景。'),
 'UI05':('部分已核','页头和分类说明已记录；没有产品批准的删留文案清单。',['E01','E13'],[],'产品文案删留清单；不自动删除必要规则。'),
 'UI06':('部分已核','当前系统配置菜单图标/选中路径及折叠形态可见。',['E01','E24'],[],'所有菜单层级与各状态未完整量测。'),
 'UI07':('部分已核','顶部系统名、账号入口可见，未见搜索/消息占位入口。',['E01'],[],'账号菜单真实去向和其他页面导航未查。'),
 'UI08':('部分已核','基础配置面包屑/标题/新增按钮已查。',['E01','E29'],[],'其他模板及副标题采用结论。'),
 'UI09':('有实测问题','国家关键词无结果及重置已执行；空态有误。',['E01','E05'],['FE01'],'各对象组合条件/局部加载反馈未完整测。'),
 'UI10':('有实测问题','18对象列表已查看；Zone固定操作区域裁切。',['L01','L18','E30','E31'],['FE04'],'长数据样本、隐藏工具栏与列适配全矩阵。'),
 'UI11':('部分已核','现有1—2条、默认20条/页；非法0/-1/1.5后跳页输入清空。',['E01','E15'],[],'缺超过一页数据；多页/尾页/跨页筛选未覆盖。'),
 'UI12':('有实测问题','Zone横向scrollLeft由0到163，左右核心标识/操作固定；初始位置操作裁切。',['E30','E31'],['FE04'],'无勾选列，不代验勾选固定规则；其他长表回归。'),
 'UI13':('本页未提供选择能力','18列表未见勾选或批量操作入口。',['L01','L18'],[],'若本批交付要求该能力，需补入口后验证，不判全项目不适用。'),
 'UI14':('本页未提供选择能力','Zone滚动时观察hover，未有复选框选中行场景。',['E31'],[],'勾选/取消及固定区选中态未覆盖。'),
 'UI15':('部分已核','编码普通文本；航线区域/Zone以查看详情按钮打开正确对象。',['E18','E20','E21'],[],'编码是否作为入口仍按产品范围；服务单元未查。'),
 'UI16':('本次URL未覆盖','未查AI完整建档流程。',[],[],'需AI建档入口、批准状态和材料。'),
 'UI17':('部分已核','Zone刷新后仍为routing/reference_zone，数据恢复。',['E26','L18'],[],'筛选、弹层、未保存输入的刷新保持规则未完整验证。'),
 'UI18':('本次URL未覆盖','该case专指服务单元Drawer；本次两类基础配置Drawer由UI39等覆盖。',[],[],'需服务单元详情入口，不用Zone代验。'),
 'UI19':('观察差异，待确认','H1/弹窗标题局部符合；配置对象标题13px/500需确认。',['E01','E10','E12'],['DQ04'],'完整六层字体、OS实际字族与各页面采用值。'),
 'UI20':('有实测问题','桌面行高48、表头500已量测；数值/操作对齐有差异。',['E01','E15','E16'],['FE02','FE03','DQ03'],'选中态无场景；表头采用值冲突需确认。'),
 'UI21':('有实测问题','操作固定最右；内层居中、gap4；Zone裁切。',['E20','E24','E31'],['FE03','FE04'],'各对象所有操作/更多状态回归。'),
 'UI22':('本次URL未覆盖','基础配置只查到倍率、币种位数，未以倍率代验金额。',[],[],'需实际金额字段和DEC10。'),
 'UI23':('有实测问题','国家搜索空态误用；刷新启动Spin另待分层确认。',['E05','E26'],['FE01','DQ05'],'失败、403/404/500和完整加载时序未测。'),
 'UI24':('有实测问题','1440与1280代表场景已查；Zone操作初始裁切。',['E20','E24','E28','E30'],['FE04'],'所有模板/端/浏览器矩阵与更窄端未覆盖。'),
 'UI25':('有实测问题','已查字段默认/禁用/焦点与可访问名称；国家标签未关联。',['E02','E03','E28','E32'],['FE07'],'错误触发、合法保存/失败、全部联动状态未测。'),
 'UI26':('部分已核','说明输入501字被限到500；取消后重开为空。',['E12','E27'],[],'未保存长值；列表Tooltip/详情三行/备注两行未全测。'),
 'UI27':('部分已核','已打开表单label间距8、项间距24、双列间距24局部符合。',['E02','E10','E14'],[],'完整页面/组件间距Token矩阵未量测。'),
 'UI28':('部分已核','新增/查询主按钮及删除文字危险色可见；未提交变更。',['E01','E13','E20'],[],'hover/active、防重和真实成功反馈未测。'),
 'UI29':('有实测问题','空值—、真实整数值可見；实际数字列左对齐。',['E15','E16','E20'],['FE02'],'金额、重量、体积、百分比完整样本不在本页。'),
 'UI30':('部分已核','汇率生效日2024-01-01，未使用斜线。',['E16','E17'],[],'分钟/秒、时区、跨日与其他字段场景未测。'),
 'UI31':('部分已核','1440双列上下排；1280币种单列，Modal内容滚动且标题/底部可达。',['E10','E14','E28'],[],'其他表单/长字段及宽度例外未全查。'),
 'UI32':('取证已记录','截图原图、URL、CSS视口、像素尺寸、源版本和DOM量测均留存。',['E01','E25','E32'],[],'未提供部署Build；未设整页像素相似度门槛。'),
 'UI33':('观察差异，待确认','详情Tabs40px及适用上下文已观察；触达冲突另处理。',['E21','E25'],['DQ01','DQ03'],'页头/列表变体密度、数值徽标全矩阵未测。'),
 'UI34':('有实测问题','Zone点击可切内容；缺ARIA语义，End未到末项。',['E21','E22','E25'],['FE05'],'Home/左右键和加载/数量/跨端回归需完整补测。'),
 'UI35':('本次URL未覆盖','服务单元独立新建页不在此次基础配置URL。',[],[],'需对应入口和DEC23。'),
 'UI36':('本次URL未覆盖','服务单元人工/AI创建入口未查。',[],[],'需服务单元列表交付入口。'),
 'UI37':('本次URL未覆盖','未执行AI生成、确认、执行链路。',[],[],'需批准AI状态及材料；本次未调用外部模型。'),
 'UI38':('本次URL未覆盖','未发现/验证该URL的材料上传流程。',[],[],'需材料上传入口、类型/大小基线和材料。'),
 'UI39':('有实测问题','页面/卡片、输入/Modal圆角部分符合；两类Drawer为0px。',['E19','E21','E23','E28'],['FE06'],'其他语义色/图标/hover全部矩阵未核。'),
 'UI40':('部分已核','已查输入外框32、必填左*、默认上下排；未触发错误提交。',['E02','E14','E28'],['DQ03'],'页头全部模板、错误定位与项目例外未全测。'),
 'UI41':('观察差异，待确认','列表关联ID/枚举与详情/编辑标签不同。',['E06','E08','E19','E22','E23'],['DQ02'],'需字段批准映射；不判真实关联错误。'),
 'UI42':('本次URL未覆盖','18对象使用表单编辑，未获得该全局行内编辑组件场景。',[],[],'需批准组件规范DEC30及实际入口。'),
 'UI43':('部分已核','国家关键词查询/重置已测；18列表未观察排序入口。',['E01','E05','L18'],['FE01'],'多条件、多页条件保持和排序需交付/数据确认。'),
 'UI44':('部分已核','只读编码、默认必填样式、501→500前端限长已核。',['E02','E27','E28'],['FE07'],'未点保存触发错误；唯一性/范围/时机按批准字段规则。'),
 'UI45':('观察差异，待确认','邮编/Zone成员异步最终选择名称已查，列表标签差异待确认。',['E08','E23','E28'],['DQ02'],'搜索/清空/级联变更/失败/保存未测。'),
 'UI46':('未执行写入风险操作','未点击删除/启停/批量，未验证危险确认和真实写回。',['E01','E20'],[],'需批准可清理专用数据和明确确认契约。'),
 'UI47':('部分已核','查询完成与重置返回已观察；其他加载层级待确认。',['E01','E05','E26'],['DQ05'],'可控慢响应、失败、防重、保存/真实读回未测。'),
 'UI48':('部分已核','国家临时名称、货物说明输入取消后重开恢复原值；Zone成员取消返回上下文。',['E03','E04','E23','E27'],[],'关闭/返回/刷新、草稿及全模块保存保护未完整测试。'),
 'UI49':('有实测问题','输入Tab可前进、焦点可见；Tabs End失败与字段名称缺失。',['E03','E25','E32'],['FE05','FE07'],'完整读屏/核心键盘、多语言、帮助/应用快键未覆盖。'),
}
coverage=[]
for c in cases:
    state,observed,imgs,issues,gaps=coverage_detail[c['编号']]
    coverage.append([c['编号'],c['模块／页面'],c['检查点'],state,observed,'、'.join(imgs) or '—','、'.join(issues) or '—',gaps,c.get('框架适配判断') or '通用规范补充'])

pages=[]
for r in lists:
    pages.append([r['label'],r['url'],r['width'],r['height'],len(r['rows']),'、'.join(r['headings']),r['evidence'],'列表只读查看；不等于该对象全部case通过'])
forms=[
 ['国家编辑','E02、E03、E04、E32','禁用编码、字段样式、取消回显、label关联'],
 ['邮编编辑','E08','异步国家名称回显；未保存/清空/级联'],
 ['航空公司编辑','E10','字段与必填/只读及双列布局'],
 ['货物类型编辑','E12、E27','说明501→500；取消后重开值为空'],
 ['费用项编辑','E14','分组/币种文本输入、label颜色与布局'],
 ['已生效汇率编辑','E17','源/目标/倍率/生效日只读；未改结束日/状态'],
 ['币种编辑','E28','CNY编码只读、数值显示、1280单列及内部滚动'],
 ['Zone成员编辑','E23','最终标签回显；取消返回成员上下文，未改字段'],
 ['国家新增','E29','当前对象入口、编码可输入、默认状态；未保存'],
 ['航线区域详情','E19','右Drawer基本信息；国家关系DOM已读，未单独切到关系页留证'],
 ['Zone详情','E21、E22、E25','基本信息/成员切换、标签映射、ARIA/End与边缘样式'],
]

sha=json.loads((work/'source-hash.json').read_text(encoding='utf-8'))
assert hashlib.sha256(pathlib.Path(sha['path']).read_bytes()).hexdigest()==sha['sha256']
assert len(cases)==49 and len(lists)==18 and len(valid_evidence)==48
assert len({f['id'] for f in findings})==12
assert collections.Counter(f['kind'] for f in findings)=={'实测问题':7,'待确认事项':5}
assert all(cid in case_map for f in findings for cid in f['caseIds'])
assert all(eid in e_map for f in findings for eid in f['evidenceIds'])
assert all(eid in e_map for _,v in coverage_detail.items() for eid in v[2])
fingerprint=json.loads((work/'app-fingerprint.json').read_text(encoding='utf-8'))
fingerprint['assetPaths']=[urllib.parse.urlparse(u).path for u in fingerprint['scripts']]
report={'findings':findings,'coverage':coverage,'pages':pages,'forms':forms,'evidence':valid_evidence,
        'sources':{'uiNorm':spec_url,'publicBaseline':public_url,'review':review_url,'target':target_url},
        'revisions':{'uiNorm':5256,'publicBaseline':95,'review':650},'sourceWorkbook':sha,
        'counts':{'issues':7,'pending':5,'cases':49,'listObjects':18,'editForms':8,'newForms':1,'detailTypes':2,'screenshots':48},
        'fingerprint':fingerprint,'start':min(e['capturedAt'] for e in valid_evidence),'end':max(e['capturedAt'] for e in valid_evidence)}
(work/'report-data.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report['counts'],ensure_ascii=False))
