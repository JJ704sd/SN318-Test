import json, shutil, hashlib, re
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
work=Path(__file__).parent
base=Path('./artifacts/weekly-ui')
ev=base/'evidence/template-execution-20261013'
design=json.loads(Path('./recipes/weekly-local-20261013/rewritten-cases.json').read_text('utf8'))
current=json.loads((work/'execution-update.json').read_text('utf8'))
runs=json.loads((ev/'case-results.json').read_text('utf8'))
shutil.copy2(ev/'case-results.json',work/'case-results-before-full-audit.json')
shutil.copy2(base/'SN318_W2_UI与交互测试用例_按工单用例风格重写.xlsx',work/'workbook-before-full-audit.xlsx')
rd={x['id']:x for x in runs};cd={x['id']:x for x in current['cases']}
body=json.loads((work/'norm-full-audit-live.json').read_text('utf-8-sig'))['data']['document']
rev=json.loads((work/'norm-full-audit-table-revision.json').read_text('utf-8-sig'))['data']['revision']
assert body['revision_id']==5256 and rev==3138
alltables=json.loads((work/'norm-full-audit-all-tables.json').read_text('utf8'))['sheets']
refs=json.loads(Path('.work/weekly-local-20261013/norm-sheets.json').read_text('utf8'))
tablemap={x['name']:x for x in alltables};referenced={x['sheet-id']:x['section'] for x in refs}
assert not set(referenced)-set(tablemap)
sources={'bodyRevision':5256,'tableRevision':3138,'bodySha256':hashlib.sha256(body['content'].encode()).hexdigest(),'embeddedTableCount':len(referenced),'tables':[{**tablemap[k],'section':v} for k,v in referenced.items()]}
(ev/'norm-full-audit-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),'utf8')
now=datetime.now(timezone.utc).isoformat()
audit=[];overrides={}
def add(n,source,rule,kind,decision,gap=''):
    id=f'UI-TPL-{n:03d}';r=rd[id]
    ids=re.findall(r'\b[A-Za-z0-9]{6}\b',source)
    for key in ids:
        if key[0].isdigit() or any(ch.isupper() for ch in key):assert key in referenced,key
    audit.append({'id':id,'before':r['status'],'source':source,'rule':rule,'kind':kind,'decision':decision,'remaining':gap,'evidence':'、'.join(r['evidence'])})
add(1,'3.2 s4NgFa、3.4 jYqjvY、5.1 Jhut4D、5.9 O6GcDy','H1 20/500；默认按钮32/圆角8；卡片12/内边距24。','规范明确','维持不通过，按钮2px圆角由既有量测确认。')
add(2,'4.2 FFO2Ix、0rCax8','标准页头94px、面包屑18px，标题与操作对齐。','规范明确','维持不通过；修正来源定位为4.2。')
add(3,'5.8 tkqkxw、IOfbnI；4.5.2 lfEtqB','操作左对齐、间距16px、溢出时锚点及操作固定。','规范明确','维持不通过：居中/8px，固定列已通过。')
add(4,'3.1 hezLMm；5.8 IOfbnI','普通正文#4B5564，与标题/链接/语义色区分。','规范明确','维持不通过。')
add(5,'5.8 IOfbnI、tkqkxw、hiuQkw；3.2 s4NgFa','48px行高、数字右对齐；操作亦必须左对齐。','规范明确','原通过漏计操作列居中，按003同一证据修正为不通过。')
add(6,'7.2 2xUUpH','筛选无结果与首次空态区分，保留条件并引导清空筛选。','规范明确','维持通过；文案换行/合理补充不按逐字错误处理。')
add(7,'7.2 2xUUpH；2.1一致可预期','重置可退出无结果态，恢复初始控件及列表。','规范+模板交互','维持通过；未宣称筛选持久化或数据业务正确性。')
add(8,'5.8 KJawbG','至少1项选中出现批量栏，清空后恢复。','规范明确','维持通过。')
add(9,'5.8 hiuQkw、KJawbG；4.5.2 lfEtqB','选中色#D1E4FB贯穿固定列与主体。','规范明确','维持通过。')
add(10,'5.10 WJHXDG、t5GXhY；7.3 7j2jDv；8.3 GF7nRn','危险动作先确认；取消/确认顺序、语义及取消不执行。','规范明确','维持本条交互通过；未量测的批量确认尺寸不借用组件页结果。','批量确认弹窗自身宽度等未量测，若扩展尺寸验收需补取证。')
add(11,'5.11 7nFRad、IpxRU6；6.2 qif9bA','480默认/640宽抽屉已有规则；加载在内容区，关闭可交互。','规范明确+状态缺口','取消另等宽度批准稿；640多分组/两栏符合。整条仍受阻。','只缺可稳定停留的详情加载样例及同状态截图。')
add(12,'5.7 UXf6DG；7.3 7j2jDv','已触发的必填错误应位于字段下，修正后清除并保留输入。','规范明确','前置改为保留合法默认值、清空可录入必填字段；已有3步UI证据通过。','业务类型为空组合未构造，留给功能字段校验；不宣称全部必填组合通过。')
add(13,'5.7 UXf6DG；2.1信息优先（补充）','规范规定可见标签/提示位置，未规定Input for/id、ARIA描述或目标读屏器。','补充验收待确认','保留可用性建议，不将无ARIA归为这份规范的硬差异。','本期是否纳入键盘/读屏目标及具体验收标准。')
add(14,'5.7 UXf6DG；2.1信息优先（补充）','规范未定义首错自动聚焦/滚动算法；已观察自动滚动落于顶栏下。','补充验收待确认','保留S01建议；可见错误提示规则和首错算法要求分开。','首错策略及验收口径；已观察的遮挡建议修正，不等新设计规范数值。')
add(15,'5.7 UXf6DG；模板备注上限200','上限200来自模板字段定义，规范约束计数与状态可读性。','规范+模板参数','维持通过，注明200并非所有业务备注的统一上限。')
add(16,'6.4表单模板；7.3 7j2jDv（补充）','规范要求取消/保存；不可逆删除确认不等同未保存离开确认。','业务补充待确认','保留受阻；不把重要附件删除确认套用于所有表单离开。','本表单是否需要二次离开确认及草稿策略。')
add(17,'5.7 UXf6DG；6.4表单模板；5.17正文禁止将多步流程用Tabs','步骤指示及内容同步，校验失败保持当前步。','规范+模板交互','维持此交互通过；Tablet列数差异由022/037处理。')
add(18,'5.6 PG7Wxg、AsS314；7.3 7j2jDv','选择前说明类型/大小，未选文件保存有反馈且保留弹窗。','规范明确','维持通过；规范未规定所有上传必须在此文案显示数量上限。','文件数边界与具体业务限制不在本空文件用例的通过结论内。')
add(19,'4.3内容承载与跳转决策；4.5.2导航规则；RV21专项','独立页面可按URL复访；有效会话路由与登录恢复需分开。','环境前置缺失','保留受阻，不要求刷新绕过认证；已证实Mock重新登录返回同一路由。','持久有效登录样例、demo菜单映射；未验证持续登录刷新。')
add(20,'4.5.2 JwsjUF（元素举例）；2.1状态完整；RV11范围','已接入通知的三端展示规则明确；表中未列全局搜索必配。','功能适用范围待确认','通知显示规则不再标缺设计值；未把举例表解读为新增搜索/通知功能授权。','本期搜索/通知演示或接入范围及可点击入口、结果/空态样例。')
add(21,'11.2 ZPMHjA；11.3 hXl5Vj；2.2.3以功能需求落地','入口48圆形，右/底24；面板400宽、可关闭、不挤压页面。','规范明确+环境缺口','保留受阻，只有当前AI关闭导致无入口；不再等尺寸批准。','启用助手的同一前端样例及重叠点击位置。')
add(22,'4.5.2 oppJwY；5.7 UXf6DG','Tablet单列、两侧16px；底栏可达。','规范明确','维持不通过M08。','Header Tablet48px等扩展量测尚未纳入现有证据。')
add(23,'4.5.1 cHhLBb；4.5.2 lfEtqB、7HCReU','Mobile按项目选择；纳入后卡片、触达高44px已有基线。','项目范围待确认','保留受阻；删除触达尺寸仍需批准的说法，保留是否纳入本期条件。','项目Mobile范围；若纳入，卡片及长文样例。')
add(24,'7.3 2WRfcT、CIIazx','403展示、原因、统一样式及返回入口。','规范明确','维持展示通过；不替代039初始化403链路。')
add(25,'7.3 2WRfcT、CIIazx','500展示、刷新及返回反馈。','规范明确','维持展示通过；未宣称真实500恢复。')
add(26,'5.17正文内嵌表格及Tabs示例R008','header/list规格、数量999+、7项边界、键盘/ARIA及骨架都已有依据。','规范明确+样例缺口','保留受阻；缺运行示例而非缺规范。','页头/列表Tabs、边界数据及内容加载样例。')
add(27,'4.5.2正文导航、hhnM72；RV02专项','层级、选中路径、触摸导航规则明确；多分类收起策略引用RV02。','规范+专项规则+样例缺口','保留受阻，只缺多个一级与三级/混合层级运行样例。','至少2个一级分类的菜单fixture；不得据目录缺样例判核心库不支持。')
add(28,'7.1 OWeLZt；7.3 topMRc、bkjAb2','局部Spin、超时/网络/500文案及就地重试已有规则。','规范明确+响应缺口','保留受阻；补受控响应即可，不需另等错误文案审批。','slow、timeout、offline、500和恢复成功响应切换。')
add(29,'5.5 PgGeh9、6zh2eV；5.8 KJawbG','全选/半选及批量栏规则明确；跨页保留/清空策略未统一规定。','业务选择策略待确认','已执行全选/半选/确认数量保留通过；跨页策略仍受阻。','PRD说明本页/全部数据全选范围、跨页及改筛选策略。')
add(30,'9.1 XHtuKi；9.2 dzigLS；9.4 AWFQWE','空值—；金额4位/重量3位/数量整数千分位；长文截断及展开已有规则。','规范明确+数据缺口','删除默认精度仍需批准的前置；只缺极值/长文/空值数据及未执行的末页核对。','null/空串/0/长文本/极大数值；末页第86条未核验，不能称超大列表已通过。')
add(31,'使用指引qIcanC；3–7章及R001–R010','以结构化数值及官方关联示例走查，不要求每页另交封板稿。','规范明确+部分状态缺口','移除同名业务整页稿的额外门槛，参考取得子步通过；整条仍不通过。','active/慢加载/异常状态尚缺同状态运行证据；不做整页内容像素差。')
add(32,'3.4 jYqjvY；5.1 Jhut4D、AzCyCe；7.1 OWeLZt','默认尺寸与8px圆角适用于四类按钮；五态及加载恢复有明确标准。','规范明确+部分状态缺口','补默认尺寸/圆角预期，既有四类均2px，修正不通过M01；保留未触发状态缺口。','active=true稳定取证及loading到完成、重复触发计数样例。')
add(33,'5.2 70qKQb、XDkulo；5.7 UXf6DG','六态色、边框、光晕、禁用及尺寸明确。','规范明确','维持不通过M05；已执行修正及键盘跳过不等同完整读屏验收。')
add(34,'7.2 2xUUpH；7.3 topMRc','无筛选的首次空和清空后空都适用暂无数据/新增引导；搜索无结果另文案。','规范明确+样例缺口','删除等第三套空态文案审批的门槛；只缺首次空及清空成功场景。','首次0记录、无筛选清空后0记录样例；页码恢复细则未明，不造第三套固定字符串。')
add(35,'7.3 topMRc、bkjAb2','操作403应Toast暂无操作权限，表单输入保留。','规范明确+响应缺口','保留受阻，只缺操作403到允许响应样例。','有效输入提交403与恢复；静态/403不能替代。')
add(36,'5.10 WJHXDG、H95Rke、t5GXhY；7.3 topMRc','默认480/大640、16圆角/24padding、80%最大高；加载遮罩不可关。','规范明确+状态缺口','取消宽度审批门槛；短例尺寸已核，长内容/提交中/失败未覆盖。','长内容可滚动及loading/失败/恢复响应入口。')
add(37,'4.5.1 cHhLBb；4.5.2 hhnM72、oppJwY、JwsjUF','1279/768属Tablet、1280属Desktop；Tablet单列。','规范明确+条件子步','维持不通过M08；补预期中已有的断点、Header56/48、侧栏规格。','扩展Header48量测未完成；Mobile子步骤范围待确认；长文见030。')
add(38,'5.6 AsS314；7.1 OWeLZt','进度/取消/失败/重试必须可感知，重试成功需实际完成。','规范明确+恢复样例缺口','保留受阻，失败提示及重试已执行；同文件恒拒绝不判规范未定义。','可切换同一文件失败到成功的handler/运行样例。')
add(39,'7.3 2WRfcT、CIIazx；与bkjAb2操作错误区分','初始化403是整页无权限，操作403是就地反馈。','规范明确+响应缺口','保留受阻，只缺初始化403真实前端触发及恢复样例。','从正常页面初始化请求触发403到恢复，不用展示路由替代。')
add(40,'5.6 Z8M50N；4.5.1 cHhLBb','Desktop48/关闭24；Tablet32/关闭20；等比缩小和滚动恢复。','规范明确','维持通过，尺寸可计算，无需额外批准稿。')
assert len(audit)==40

# Reclassify observed contradictions; preserve original UI evidence and timestamps.
r=rd['UI-TPL-005'];r['status']='不通过';r['steps'][2].update(actual='名称/时间/状态左对齐，hover背景#EBF3FD；操作列实际居中、间距8px，违反tkqkxw左对齐/16px。此前通过漏计此项，与003同一证据。',verdict='不通过');r['reason']='操作列左对齐已明确且属于原第3步预期，不能遗漏后判通过。';r['issues']=['M03']
r=rd['UI-TPL-011'];r['steps'][0].update(actual='实测640×900、贴右、标题16/500、24px有效内边距、遮罩0.45；多分组两栏采用规范7nFRad宽抽屉640，符合通用规格，不需另等宽度批准稿。',verdict='通过');r['reason']='规格已明确且已测；仅加载期骨架/Spin缺稳定同状态样例与截图。'
overrides['UI-TPL-011']={'precondition':cd['UI-TPL-011']['precondition'].replace('取得该详情采用480px或640px宽抽屉的批准稿。','按5.11记录默认480px或多内容宽抽屉640px的实际选型；准备可保持详情加载的样例。'),'expected':cd['UI-TPL-011']['expected'].replace('宽度为批准的480px或640px','默认宽度480px，内容较多的宽抽屉640px')}
r=rd['UI-TPL-012'];r['status']='通过';r['steps'][0]['verdict']='通过';r['reason']='修订为UI校验呈现范围：保留合法默认快递/金额等，验证可清空必填项的错误提示。业务类型空组合未构造，不宣称全部必填业务组合通过。'
overrides['UI-TPL-012']={'precondition':'[1]本地通用模板 http://127.0.0.1:5173/home 可访问；浏览器缩放100%。\n[2]进入新建运单，保留模板合法默认值；目的地、日期、收件人、电话等可录入必填项未填，重量为默认0以触发错误。本条只检校验呈现及纠错，不检全部必填业务组合。'}
r=rd['UI-TPL-031'];r['steps'][0].update(actual='取得rev5256关联10个HTML示例，在1440×900/100%对照同类组件/布局。qIcanC要求对照规范示例，不要求另交每个业务页同名封板稿；已满足本通用走查的参考前置。',verdict='通过');r['reason']='已确认规范差异仍不通过；未触发状态分别保留缺口。整页业务内容像素一致不属于本通用规范走查。'
overrides['UI-TPL-031']={'precondition':'[1]本地通用模板 http://127.0.0.1:5173/home 可访问；浏览器缩放100%。\n[2]取得通用规范结构化条款、关联整体/组件示例及版本，选取列表、表单、详情同类样例；不用每页另交同名封板稿作为前置。','steps':cd['UI-TPL-031']['steps'].replace('并排打开批准示例图','并排打开规范关联示例图') if isinstance(cd['UI-TPL-031']['steps'],str) else design['templates'][30]['steps'].replace('并排打开批准示例图','并排打开规范关联示例图')}
r=rd['UI-TPL-032'];r['status']='不通过';r['steps'][0].update(actual='四类默认色符合；既有E049-buttons.json显示四类普通按钮高32px、圆角均2px，违反3.4默认8px。未取得active/完成态仍保留受阻，不能掩盖已确认的默认态差异。',verdict='不通过');r['reason']='默认圆角差异已确认，整体不通过M01；active及loading恢复样例缺口独立保留。';r['issues']=['M01','R07']
overrides['UI-TPL-032']={'expected':cd['UI-TPL-032'].get('updatedExpected',design['templates'][31]['expected']).replace('[1]Primary背景','[1]四类默认按钮32px高、8px圆角；Primary背景')}
overrides['UI-TPL-023']={'expected':design['templates'][22]['expected'].replace('触达区域满足批准的移动端要求','触达区域至少44px，遵循4.5.2').replace('按Mobile批准稿显示卡片列表','Mobile纳入本期时按4.5.2显示卡片列表')}
r=rd['UI-TPL-023'];r['steps'][1]['actual']='当前详情按钮28px高，若Mobile纳入本期则低于规范44px触达基线；范围尚未确认，不能直接判本期失败。长文本样例仍缺。';r['reason']='仅项目是否纳入Mobile及运行卡片/长文样例待补；卡片方向、44px触达及间距已有规范，不再等通用尺寸审批。'
overrides['UI-TPL-030']={'precondition':'[1]本地通用模板 http://127.0.0.1:5173/home 可访问；浏览器缩放100%。\n[2]提供null/空字符串、真实0、极大值及长名称/地址/备注样例，记录字段及原值。默认按9.2：金额4位小数与货币符号、重量3位与KG、数量整数千分位；业务专项不同规则需明确引用。另准备多页列表首末记录。','expected':design['templates'][29]['expected'].replace('按记录在前置中的精度和单位显示','按9.2默认精度/单位（或明确引用的专项规则）显示')}
r=rd['UI-TPL-030'];r['steps'][1]['actual']='86条普通多页的第1/2页已观察，未核第5页末记录86；缺极大值样例。默认金额4位/重量3位/数量整数千分位已由dzigLS明确，不再以缺批准精度受阻。';r['reason']='仅缺空值/0/极值/长文展示样例，以及尚未执行的末页核验；标准精度已有判据。'
overrides['UI-TPL-034']={'precondition':'[1]本地通用模板 http://127.0.0.1:5173/home 可访问；浏览器缩放100%。\n[2]提供首次空列表、筛选0结果、无筛选且全部清空后0记录三类样例。无筛选0记录按7.2复用暂无数据及新增引导；记录分页恢复表现，不自加第三套固定文案。','expected':design['templates'][33]['expected'].replace('清空后文案按前置具体批准稿判定。','无筛选清空后复用“暂无数据”并给有权限的新增引导。')}
r=rd['UI-TPL-034'];r['steps'][2]['actual']='未提供无筛选清空成功的0记录样例，未执行此路径；文案已由7.2列表无数据规则明确，不能继续等第三套文案审批。分页恢复细则未统一规定，后续如实记录。';r['reason']='首次空/无筛选清空成功运行样例缺失，文案规则已明确。'
overrides['UI-TPL-036']={'precondition':design['templates'][35]['precondition'].replace('明确采用480px还是640px宽度','按5.10默认480px、大640px及内容类型选型').replace('宽度为前置明确的480px或640px','默认480px或大640px'),'expected':design['templates'][35]['expected'].replace('宽度为前置明确的480px或640px','宽度按普通480px/大640px及内容类型规范选用')}
r=rd['UI-TPL-036'];r['reason']='默认/大弹窗尺寸判据明确；只缺长内容、保持提交中、失败与恢复运行样例。'
overrides['UI-TPL-037']={'expected':design['templates'][36]['expected'].replace('布局按各自设计切换','布局按4.5.2切换（Tablet表单单列、Header48px/导航抽屉280px；Desktop Header56px及分段侧栏）')}
for x in audit:
    x['after']=rd[x['id']]['status']
    if x['id'] in ['UI-TPL-005','UI-TPL-011','UI-TPL-012','UI-TPL-023','UI-TPL-030','UI-TPL-031','UI-TPL-032','UI-TPL-034','UI-TPL-036','UI-TPL-037']:
        rd[x['id']]['normReassessedAt']=now
    rd[x['id']]['fullAuditAt']=now
assert Counter(x['after'] for x in audit)==Counter({'通过':12,'不通过':10,'受阻':18})
(ev/'case-results.json').write_text(json.dumps(runs,ensure_ascii=False,indent=2),'utf8')
result={'checkedAt':now,'bodyRevision':5256,'tableRevision':3138,'reviewedCases':40,'originalBlockedCases':20,'currentReferencedTables':124,'retrievedWorkbookSheets':len(alltables),'basis':'原截图/DOM与最新完整规范对照；没有新增页面执行或修改应用源码。','caseCounts':dict(Counter(x['after'] for x in audit)),'stepCounts':dict(Counter(s['verdict'] for r in runs for s in r['steps'])),'cases':audit,'caseOverrides':overrides}
(work/'full-audit-overrides.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf8')
(ev/'norm-full-audit-review.json').write_text(json.dumps({k:v for k,v in result.items() if k!='caseOverrides'},ensure_ascii=False,indent=2),'utf8')
print(json.dumps({k:result[k] for k in ['reviewedCases','originalBlockedCases','currentReferencedTables','caseCounts','stepCounts']},ensure_ascii=False))
