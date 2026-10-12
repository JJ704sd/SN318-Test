import datetime as dt
import hashlib
import json
from pathlib import Path

from PIL import Image

WORK = Path(__file__).parent
OUT = Path('./artifacts/ui-audit/W2')
OUT.mkdir(parents=True, exist_ok=True)
def read(name):
    return json.loads((WORK / name).read_text(encoding='utf-8-sig'))

scope = read('w2-scope.json')
schedule = read('schedule-values.json')
reviews = [json.loads(s) for s in (WORK / 'review-live.ndjson').read_text(encoding='utf-8-sig').splitlines()]
manifest = read('review-live.manifest.json')
norm_revision = read('ui-norm-live.json')['data']['document']['revision_id']
evidence = read('evidence.json')
metrics = {r['id']: r for r in read('metrics.json')}
assert len(scope) == 38 and len(reviews) == manifest['records_count'] == 24
assert manifest['has_more'] is False
assert len(evidence) == 22
assert '暂无费用项数据' in next(e['visibleText'] for e in evidence if e['id'] == 'W03')
assert read('cancel-readback.json')[1]['value'] == '运费'
assert read('length-boundary.json')['length'] == 500
for e in evidence:
    with Image.open(e['path']) as im:
        e['imageWidth'], e['imageHeight'] = im.size
        e['mime'] = Image.MIME[im.format]
    e['capturedAt'] = dt.datetime.fromisoformat(e['time'].replace('Z', '+00:00')).astimezone(dt.timezone(dt.timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S')
    e['viewport'] = f"{e['width']}×{e['height']} CSS px"
    e['imageSize'] = f"{e['imageWidth']}×{e['imageHeight']} px"

criteria = {
 1: ('列表与查询', '筛选控件按栅格排布；查询/重置反馈；表格行高、固定列、数字对齐、分页和筛选空态。', '§5.8、§6.1、§7.1–7.3'),
 2: ('勾选与批量栏', '勾选后顶部批量栏、取消后恢复；选中底色覆盖固定列；数量与可操作状态一致。', '§5.5、§5.8、§6.1；Review 批量栏/固定列'),
 3: ('新增/编辑入口', '按采纳设计确定整页或弹窗；字段分组、必填、提示、焦点、取消和保存区可达。', '§5.7、§5.10、§6.4；Review服务单元新增'),
 4: ('只读详情', '先裁定整页/抽屉方案；分组展示、长内容滚动、只读样式、返回与列表上下文保持。', '§6.2、§6.3；Review服务单元详情两条'),
 5: ('启用/禁用编排', '风险图标/语义色匹配；引用关系说明清楚；确认/取消明确；不同状态操作可见性一致。', '§5.1、§5.10、§7.3；Review禁用编排'),
 7: ('组合列表', '名称/标识固定、字段排版与操作列统一；长文本可读；筛选、分页及空态区分。', '§5.8、§6.1、§7.2'),
 8: ('组合表单', '成员选择、顺序与分组信息层级清晰；错误与对应字段关联；返回/取消/保存可达。', '§5.3、§5.7、§6.4'),
 9: ('详情/历史版本', '历史列表与版本详情切换有返回入口；只读分组清晰；采用批准承载稿，不直接套服务单元方案。', '§6.2、§6.3；Review review-2a5a56bb27仅为服务单元设计资料'),
 10: ('引用/并发提示', '删除引用阻断、冲突信息及返回刷新入口清楚；无数据丢失误导。需可控引用/并发样本。', '§5.10、§7.3；业务规则以PRD为准'),
 11: ('策略列表/详情', '列表/详情入口明确；状态标签与字段分组统一；只读与可编辑界面可区分。', '§5.8、§5.12、§6.2'),
 12: ('成本价卡列表', '金额列右对齐、币种/单位明确；固定关键标识/操作列；筛选、分页、空态可用。', '§5.8、§6.1、§7.2'),
 13: ('价卡头表单', '按信息层级分组；日期/关联字段控件统一；标签、必填与错误提示对应；底部操作区可达。', '§5.2、§5.3、§5.7、§6.4'),
 14: ('计费明细字段', '字段分组和单位清楚；数字右对齐；条件字段切换后标签/错误不串位。', '§5.7、§5.8、§6.4'),
 15: ('明细行操作', '行内编辑的编辑/保存/取消/错误状态明确；按钮间距和对齐统一；待行内编辑规范定稿。', '§5.7、§5.8；Review全局行内编辑规范修改中'),
 16: ('起终点分区选择', '搜索结果、已选状态和起终点层级清楚；键盘可操作；不以基础配置参考Zone替代。', '§5.3、§5.5、§5.7'),
 17: ('模板批量生成五步', '先确认PRD范围与承载入口；若纳入，步骤导航、上一步/下一步、错误定位和结果反馈完整。', '阶段共识第2/3/12项；§6.4、§7.3'),
 18: ('计费要素模板', '先确认原型功能是否纳入PRD；若纳入，模板字段分组及编辑/预览/保存反馈统一。', '阶段共识第2/3/12项；§5.7、§6.4'),
 19: ('Excel/AI导入四步', '上传类型/限制和错误清楚；步骤与回退、解析进度、预览和确认状态完整。未上传或触发AI。', '§5.6、§6.4、§7.1–7.3'),
 20: ('高级复制/覆盖', '先确认范围与导航入口；若纳入，复制范围、覆盖风险和确认摘要清楚，不只依赖原型说明。', '阶段共识第3/9/12项；§5.10、§6.4'),
 21: ('价卡校验', '先确认范围与入口；若纳入，错误定位到行/字段，修复/重试路径可达。', '阶段共识第3/9/12项；§5.7、§7.3'),
 22: ('地点与邮编页签', '页签选中/键盘/ARIA一致；地点关联显示名称/编码，筛选后空态正确；核对价格维护承载。', '§5.8、§5.17、§7.2'),
 23: ('价格维护Zone清单', '核对所属服务商/分区上下文；Zone成员可读；固定列/长文本/操作完整。基础配置参考Zone不替代。', '§5.8、§6.1、§6.3'),
 24: ('地点/邮编导入', '文件要求与行级错误可读；进度、取消、结果摘要清楚；需授权测试文件才能验证写入。', '§5.6、§7.1–7.3'),
 25: ('可复用邮编组', '先确认PRD与入口；若纳入，邮编成员、搜索和已选反馈清楚；保留编辑与只读差异。', '阶段共识第3/9/12项；§5.3、§5.7'),
 26: ('燃油费规则列表', '比例/金额右对齐；生效区间可读；筛选/状态/操作和空态一致。', '§5.8、§5.12、§6.1、§7.2'),
 27: ('燃油费规则表单', '关联对象与生效区间分组清楚；数值单位和错误就近提示；取消/保存与滚动可达。', '§5.2、§5.3、§5.7、§6.4'),
 28: ('分区维护', '先确认独立页面入口；若纳入，Zone与分区类型层级及编辑路径清楚，避免与参考Zone混同。', '阶段共识第9/12项；§5.17、§6.1'),
 29: ('分区价格/引用', '先确认承载入口；若纳入，金额与单位对齐，价卡引用入口有实际跳转，返回保持上下文。', '阶段共识第9/12项；§5.8、§6.2'),
 50: ('费用项', '列表、关键词无结果与重置、编辑/新增表单、取消回显和1280/1440布局已核；提交未执行。', '§5.7、§5.8、§5.10、§7.2；UI09/20/21/25/49'),
 51: ('币种与汇率', '两个列表、币种/已生效汇率编辑、数字列、水平滚动与只读字段已核；多页/区间写入未执行。', '§5.7、§5.8、§5.10；UI20/21/29/49'),
 52: ('服务段配置', '服务段列表/编辑入口及引用信息清楚；不将航空/运输字典当作服务段配置。', '§5.7、§5.8、§6.1'),
 53: ('计费要素', '字段定义、单位、条件配置与关联关系分组清楚；不以费用项页面替代。', '§5.7、§5.8、§6.4'),
 54: ('计费方式', '模式枚举、提示及条件字段清楚；不以运输方式字典替代。', '§5.3、§5.7、§6.4'),
 55: ('下单限制', '限制条件与已选规则反馈明确；状态/错误/禁用展示统一；不假定服务单元配置即参数配置页。', '§5.3、§5.5、§5.7'),
 56: ('业务字典', '航空/运输/货物/包装/监管5列表已核，航空/货物编辑已开；货物501字输入截至500且取消恢复空值。', '§5.7、§5.8、§7.2；UI20/21/44/49'),
 57: ('可接货型', '确认业务限制配置的独立入口与展示；货物类型字典仅是选项基础，不等同可接货型配置。', '§5.3、§5.5、§5.7'),
 58: ('财务配置', '确认财务参数承载页面；检查单位/数字/币种样式与表单反馈，不以币种汇率页替代整项。', '§5.7、§5.8、§6.4'),
 65: ('操作日志', '筛选、时间格式、对象/操作人长文本、详情入口和权限态可读；需真实日志页面与角色样本。', '§5.8、§6.1、§7.2–7.3'),
}
observed = {
50: ('W01–W05、W20–W22', '费用项列表/编辑/新增可访问；存在搜索空态、操作组及字段标签问题。'),
51: ('W06–W10', '币种/汇率列表和编辑可访问；存在数字对齐、操作组及字段标签问题。'),
56: ('W11–W19', '5类字典列表、航空/货物编辑可访问；限长与取消局部已核，存在字段标签问题。'),
}
scope_rows = []
for p in scope:
    seq = int(p['seq'])
    scene, checks, basis = criteria[seq]
    r = schedule[p['row']-1]
    seen = observed.get(seq)
    p.update(status='部分已走查' if seen else '未获得入口', scene=scene, checks=checks, basis=basis,
             evidence=seen[0] if seen else 'W02（当前导航范围）',
             actual=seen[1] if seen else '当前PCS M1账号导航仅系统配置/基础配置，未获得本工作包业务页面入口。',
             remaining=('缺多页/跨页、可控异常、提交/启停/删除及其他角色样本。' if seen else '待明确本批部署入口、可访问角色与Build，再执行页面检查。') + (f" 原排期备注：{p['note']}" if p['note'] else ''))
    scope_rows.append([seq,p['row'],p['level1'],p['level2'],p['feature'],p['priority'],p['source'],p['status'],p['actual'],p['checks'],p['basis'],p['evidence'],p['remaining'],' / '.join(str(x) for x in r[23:26])])

items = []
def add(id,kind,priority,packages,page,title,actual,basis,fix,retest,evidence,refs='—',case='—',role='前端'):
    items.append(dict(id=id,kind=kind,priority=priority,packages=packages,page=page,title=title,actual=actual,basis=basis,fix=fix,retest=retest,evidence=evidence,refs=refs,case=case,role=role))
add('W-F01','实测问题','优先',[50],'费用项列表','搜索无结果误用无数据空态',
 '费用项已有FRT/运费1条。查询UI_W2_NO_MATCH_20261012得0条，却显示“暂无费用项数据”与“新增费用项”；重置恢复1条。',
 'UI规范§7.2；2xUUpH!A3:C3明确搜索无结果引导清空筛选；排期表02-阶段共识第13项区分三类空态。',
 '共用列表组件按有效筛选条件区分“无结果”和“从未有数据”；无结果显示调整条件文案及清空/重置入口，真实无数据保留新增入口。文案最终按批准PRD。',
 '费用项及其他字典分别检查无数据、关键词无结果、状态筛选无结果、重置恢复；页码和总数一致。', ['W02','W03'],case='UI09、UI23、UI43',role='前端、产品')
add('W-F02','实测问题','常规',[51],'币种/汇率列表','数字列左对齐',
 '币种“小数位”值2与汇率“直接倍率”7.20000000的表头/单元格内层均为left；币种横向滚动后可见数字列。',
 'UI规范§5.8；tkqkxw!A5:C5：数字/金额/重量右对齐。',
 '按列字段语义给小数位、直接倍率的表头及数据单元格配置右对齐；保持批准的精度和单位口径，不改底层数值。',
 '零值、大数与不同位数的数字右对齐；编码/币种名称仍按文本列规则；1280横向滚动后样式一致。', ['W06','W07','W09'],case='UI20、UI29')
add('W-F03','实测问题','常规',[50,51,56],'费用项、币种、汇率列表及业务字典共用操作组件','操作组居中且gap仅4px',
 '费用项、币种、汇率已量测.master-data-page__actions：justify-content=center，gap=4px。字典页面使用同类操作组，截图可见。',
 'UI规范§5.8；tkqkxw!A4:C4操作列左对齐；IOfbnI表格规范文字按钮间距16px。',
 '将操作组改为左对齐并使用16px间距；同步按按钮实际尺寸调整右固定列宽度，避免增大间距后裁切。保留固定列与危险操作语义色。',
 '1280和1440各对象列表在初始/最右滚动位置操作完整、可点击；按钮间距16px、左对齐；新增操作项后不溢出。', ['W02','W07','W09','W11','W13','W21'],case='UI20、UI21')
add('W-F04','实测问题','优先',[50,51,56],'费用项、币种、汇率、航空及货物编辑表单','字段名未程序化关联输入控件',
 '已量测费用项/币种/汇率/航空input的id为空、labels=0、aria-label/aria-labelledby缺失；货物说明textarea同样缺关联。AX中的输入节点未带相应字段名。视觉标签存在。',
 '公共用例库§5.3标签与键盘可读性；原UI49；UI规范§5.7字段名对应输入控件。关联缺失来自DOM与AX，未做完整读屏软件测试。',
 '生成稳定唯一字段ID，用label[for]或aria-labelledby关联实际聚焦节点；Select/数字输入透传名称。条件字段和新增/编辑复用时避免重复ID，错误说明按需要关联aria-describedby。',
 'AX/读屏能读出字段名、值和只读/禁用状态；点击标签聚焦正确；键盘顺序、焦点和错误关联在不同表单状态下保持一致。', ['W04','W08','W10','W12','W15','W22'],case='UI25、UI44、UI49',role='前端、UI')

add('W-C01','待确认设计项','先定稿',[50,51,56],'基础配置','分类层级与新增入口需按采纳稿统一',
 '实测仍为主数据/计价底座分组文字、下方胶囊按钮，新增入口在页头。Review要求一级Tabs及列表区域新增，状态为设计完毕。尚未核实本批采用的专项稿。',
 'Review review-67fb39add5；UI规范§5.17；阶段共识第15项。',
 'UI/产品确认本批采用稿与例外后，按批准稿调整分类层级和新增入口；保留现有设计则登记差异及理由。',
 '逐级切换后的标题/对象/列表与新增目标一致；键盘切换和返回上下文正确。', ['W02','W21'],refs='review-67fb39add5',role='UI、产品、前端')
add('W-C02','待确认设计项','先定稿',[3],'服务单元新增/编辑','新增承载方式等待专项稿收敛',
 '本轮未访问服务单元页面。当前Review记载新建弹窗内容过长，建议改独立页面，状态修改中。此为设计资料，不是本轮实测缺陷。',
 'Review review-de7057751b；UI规范§6.4；阶段共识第15项。',
 'UI完成新增/编辑页面稿并标注字段分组、底部操作和返回路径；前端按定稿改承载。是否同时调整编辑须在稿中明确。',
 '获得页面后核对信息层级、滚动、返回、取消和保存入口；覆盖1440/1280及错误态。', [],refs='review-de7057751b',role='UI、产品、前端')
add('W-C03','待确认设计项','先裁定',[4],'服务单元详情','整页与Drawer两条建议存在适用冲突',
 '最新Review review-331da30eb4已改为“服务单元详情”，仍建议新页面且确认状态为空；review-f828afea0f建议Drawer且待确认。本轮没有访问实际详情。',
 'UI Review上述两条；UI规范§6.2/§6.3；阶段共识第8/15项。',
 'UI/产品按连续查看场景和信息量明确本批唯一承载稿，更新两条记录的适用范围；前端据此实现，不同时按两种候选改同一入口。',
 '选定承载后验证只读分组、长内容滚动、标题/底部操作可达和返回列表上下文。', [],refs='review-331da30eb4；review-f828afea0f',role='UI、产品')
add('W-C04','待确认设计项','常规',[5],'服务单元禁用编排','风险确认图标待统一',
 'Review记录普通信息图标不符合“禁用编排”风险语义，建议Warning，状态待确认；本轮未打开业务确认弹窗。',
 'Review review-c79c73690c；UI规范§5.10、§7.3。',
 '在采纳风险确认稿后统一Warning图标/语义色和确认/取消层级；关联影响说明使用PRD批准文案。',
 '验证风险提示语义、键盘默认焦点、取消返回；状态/引用影响分支需独立样本。', [],refs='review-c79c73690c',role='UI、产品、前端')
add('W-C05','待确认设计项','常规',[3],'服务单元下单规则选择','已选信息重复反馈待产品/UI裁定',
 'Review记录Checkbox、顶部Tag及底部数量反馈重复，建议删除重复信息，状态待确认。本轮未访问该配置。',
 'Review review-24220c26b9；UI规范§5.5。',
 '按采纳稿保留清晰的选中反馈；先明确跨搜索、跨页已选项的查看需求，再决定是否移除Tag/汇总，避免删除必要反馈。',
 '无选择、全选、筛选后选择、跨页和取消选择时，已选项可核对且状态不丢失。', [],refs='review-24220c26b9',role='产品、UI、前端')
add('W-C06','待确认设计项','先定稿',[15],'计费明细行内编辑','共用行内编辑规范尚在修改',
 'UI Review全局行内编辑记录状态修改中；没有可用于本轮的最终交互细节。计费明细行操作页面未访问。',
 'Review review-294de09d51；UI规范§5.7/§5.8。',
 '补齐编辑/保存/取消/校验错误/处理中及冲突状态稿，明确键盘行为、焦点回落和受影响行范围，前端按批准组件实现。',
 '逐状态验证焦点、按钮可用性、错误就近提示和其他行的阅读/操作；需可控错误/冲突样本。', [],refs='review-294de09d51',role='UI、产品、前端')
add('W-C07','待确认设计项','先裁定',[],'全局表格、Tabs与页头','规范内参数冲突需统一批准值',
 '既有用例DEC18记载表头#F7F8FA/#F7F7F7、列表Tabs40px/触达至少44px、页头94px/4倍数的规范冲突；当前规范文档仍为rev5256。未任取一值判失败。',
 '原DEC18；UI规范§4.2/§4.5/§5.8/§5.17及内嵌表。',
 'UI维护者给出场景适用值或批准例外并更新Token/规范；前端再统一组件，不依据相互冲突参数单独修尺寸。',
 '按批准参数在对应视口与设备场景复核；将版本和例外同步记录在复测Build资料。', [],refs='DEC18',role='UI')
add('W-A01','访问条件项','补入口',[int(p['seq']) for p in scope if int(p['seq']) not in observed],'其余35个W2工作包','当前环境未获得业务页面入口',
 '已登录账号显示PCS M1全量授权，展开桌面导航后仅系统配置/基础配置。未见服务管理、价格维护、其他参数配置及操作日志入口；不能据此断言未实现或权限配置错误。',
 'W2排期01-排期周视图J列；阶段共识第9/12/17项；W02实测导航截图。',
 '交付对应工作包的环境/入口/可访问角色/Build清单，再逐项执行W2范围表中的检查点。对原型待确认/无入口项先确认PRD范围与承载位置。',
 '38个工作包均能定位角色、入口、关键操作及预期界面；未进入的页面保持未走查，不以基础配置对象替代。', ['W02'],role='项目/产品、开发')

review_rows=[]
for i,r in enumerate(reviews,1):
    join=lambda k: '、'.join(r.get(k,[])) or '未填写'
    review_rows.append([f'R{i:02}',r['record_id'],join('页面/模块'),join('优先级'),join('框架适配判断'),join('确认状态'),r.get('当前原型问题') or '未填写',r.get('Review 建议') or '未填写',r.get('后续处理建议') or '未填写',join('当前处理角色'),'原型/设计记录；不表示页面已交付或本轮实测失败。'])

source_hash=json.loads(Path('./recipes/ui-actual-audit/source-hash.json').read_text(encoding='utf-8'))
assert hashlib.sha256(Path(source_hash['path']).read_bytes()).hexdigest()==source_hash['sha256']
sources=[
 ['排期与阶段共识','SN318项目-排期周视图与阶段共识-20260929-v4','rev988；W2=2026-10-12至10-16，J列UI/开共38项','https://example.invalid/source/7cdefbaffe'],
 ['通用UI规范','AI与数字化中心-通用设计规范V1.2',f'rev{norm_revision}；组件、页面模板和状态呈现','https://example.invalid/source/b12a1bc700'],
 ['UI Review','原型审查五色判断',f"rev{manifest['rev']}；完整读取24条，状态和意见在本表保留",'https://example.invalid/source/e04459bb0b'],
 ['公共用例库','通用公共用例基准库V1.2','rev95；§5.3标签可读性和键盘操作','https://example.invalid/source/92f788d9b2'],
 ['原UI case','已提供的冒烟/UI用例工作簿','UI编号和DEC18仅用于对照；未改原正式执行字段',source_hash['path']],
 ['当前环境','PCS M1全量授权','资源index-_UhGeUBF.js；该路径不是部署Build；未提供Build号','https://localhost/pcs/system-config/master-data'],
]
result=dict(items=items,scope=scope,scopeRows=scope_rows,reviews=review_rows,evidence=evidence,sources=sources,
            counts=dict(workPackages=38,partial=3,noEntry=35,issues=4,designPending=7,accessItems=1,screenshots=22,listObjects=8,editForms=5,newForms=1,reviewRecords=24),
            revisions=dict(schedule=988,norm=norm_revision,review=manifest['rev'],publicBaseline=95),start=evidence[0]['capturedAt'],end=evidence[-1]['capturedAt'])
(WORK/'report-data.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result['counts'],ensure_ascii=False))
