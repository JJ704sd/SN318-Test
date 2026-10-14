import json, re, shutil
from pathlib import Path
from collections import Counter
import openpyxl

W=Path('./recipes/template-ui-reaudit-20261014')
P=Path('./artifacts/template-reaudit')
O=P/'二次复核'
S=P/'SN318_W2_UI与交互测试用例_40条实测复核修订_20261014.xlsx'
T=O/'SN318_W2_UI与交互测试用例_40条二次复核修正版_20261014.xlsx'
W2=W/'second';W2.mkdir(exist_ok=True)
cases=json.loads((W/'cases.json').read_text(encoding='utf-8'))
original=json.loads((W/'original-cases.json').read_text(encoding='utf-8'))
book=openpyxl.load_workbook(S)
edits={}
def add(sheet,cell,value):
    if book[sheet][cell].value!=value: edits[(sheet,cell)]={'sheet':sheet,'cell':cell,'value':value}
def revise(n,body=None,more=(),reason=None,status=None):
    c=cases[n-1]
    if body is not None:
        c['result']='2026-10-14实测复核｜本地dev/Mock｜'+c['route']+'\n'+body+'\n证据：'+ '、'.join(dict.fromkeys(c['evidence']+list(more)))+'；见配套复核证据.html。'
    else:
        c['result']=re.sub(r'证据：.*$', '证据：'+'、'.join(dict.fromkeys(c['evidence']+list(more)))+'；见配套复核证据.html。',c['result'],flags=re.S)
    c['evidence']=list(dict.fromkeys(c['evidence']+list(more)))
    if reason: c['reason']=reason
    if status: c['status']=status

notes=[
'重新量测按钮32px/圆角2px；标题及卡片子项对照首轮量测，整体仍不通过。',
'重新量测页头97px；94px规范及对齐子项使用首轮S09/V76，整体仍不通过。',
'核对内层操作居中/gap8及1024固定列证据；未重跑全部横滚。',
'重测链接#165DFF；现行3.1色板规定链接#046EFC，撤销子项2的通过。',
'逐项核对行高、底线、数字内层及hover证据；操作列差异仍可判定。',
'重新查询无匹配词，等待完成态0条和无结果文案，重置恢复。',
'重新验证清空条件、恢复86条5页及再次查询1条。',
'重新勾选1项及取消；默认/批量工具栏替换一致。',
'重新核对9列选中底色及取消后的稳定白底；横滚沿用首轮。',
'重新打开单项删除确认并仅取消；风险文案、左右顺序及记录保留均核对。',
'宽抽屉量测及三种关闭使用首轮；末尾滚动用历史证据，受控慢加载仍未提供。',
'重新验证5项就地错误与修正目的地；真实路径/demo/list/form，非/demo/form。',
'核对标签/错误ARIA属性；批准读屏目标缺失，未执行读屏器；修正路径。',
'核对首轮从底部保存的首错位置与日期次错；策略仍待确认；同步纠正修改清单陈旧次错坐标。',
'重测199字及尝试201字最终200字；逐字200边界使用首轮V24；修正路径。',
'核对直接取消、重入清空证据；批准二次确认/草稿策略仍缺；修正路径。',
'1024×768重新验证第一步错误、有效日期进入第二步、返回回显；修正路径。',
'重新验证限制说明、无文件Toast、关闭和重开；不扩展到数量或真实导入。',
'重新刷新进入登录；重登录后无对应菜单选中项；详情页打开返回可用。原前置没有持久会话要求，整体改不通过。',
'再次核对组件/列表顶栏缺入口；批准搜索通知方案及反馈样例仍未取得。',
'复核首轮1280/1440无助手证据；入口未提供，无法判遮挡交互。',
'1024重新观察两列字段（各332px容器），与Tablet单列规则冲突；底栏/键盘子项沿用首轮；修正路径。',
'窄屏记录与Mobile条件逐项核对；范围未知不能当成已确认不适用，也不能整体通过。',
'逐项复核403展示、尺寸及返回证据；第二轮未重跑，本条不代表初始化403响应链路。',
'逐项复核500展示、重试和返回证据；第二轮未重跑，本条不代表真实500恢复。',
'组件目录及专项Tabs入口再次核对；无999/1000、8入口和加载样例，仍受阻。',
'指定Review视图再次核对24条及更新时间；RV02文字用首轮S04，运行菜单仍缺多分类/三级样例。',
'再次普通短查询采到数据Spin且查询按钮无loading；这是已测UI差异。受控slow及异常/恢复步骤未执行，不把短查询当成全部分支。',
'核对全选20→19半选、翻页/筛选清空证据；本轮只重跑单项取消，批准跨页策略仍缺。',
'复核第5页6条及末记录86证据；null/0/极值/长详情样例仍缺，未扩大为全项通过。',
'最新正文仍rev5256；补现行3.1链接色；其余参考图保留历史并打包，未宣称全部重新渲染；修正路径。',
'再次测四类默认/禁用/loading；禁用只有属性量测，缺动作计数。子项3改部分观察，active/完成态仍待补。',
'重测默认/聚焦/填充/错误/纠错和Tab跳过禁用；撤销输入hover的E054错误引用；鼠标输入未重跑，子项4改部分验证。',
'重新执行筛选0条；首次无记录和清空后0记录样例仍缺。',
'仅核对源码成功Mock及普通表单证据；没有受控提交403，保持受阻；修正路径。',
'核对普通480/大640稳定态；长内容、持续提交、重复触发与失败恢复未取得，保持受阻。',
'逐项复核四断点证据；Tablet双列仍不通过。导航280px及返回当前对象未量测，不宣称整步已全测；修正路径。',
'复核合成上传对象/进度/取消/重传；失败文件重试仍失败，缺同一文件恢复成功切换。',
'核对直接403与初始化403证据边界；初始化受控响应仍缺，不能借024判通过。',
'逐图逐值核对Desktop/Tablet小/横/竖图片、安全区与关闭证据；第二轮未再次上传预览。'
]
extra={1:['A01'],2:['A01'],4:['A01','A03','A30'],6:['A07','A08'],7:['A08','A09'],8:['A10','A16'],9:['A10','A16'],10:['A11','A12','A16'],12:['A17','A18'],15:['A19','A20'],17:['A22','A23','A24'],18:['A13','A14','A15'],19:['A02','A03','A04','A05'],22:['A25'],26:['A26'],27:['A34'],28:['A06'],31:['A30'],32:['A26'],33:['A27','A28','A29','A31','A32','A33'],34:['A07','A08']}
for n,c in enumerate(cases,1):
    c['previousStatus']=c['status'];c['previousResult']=c['result']
    c['route']=c['route'].replace('/demo/form','/demo/list/form')
    if n==31: c['route']='/demo/list、/demo/list/form、/demo/components'
    c['result']=c['result'].replace('/demo/form','/demo/list/form').replace('/demo/list、form、components',c['route'] if n==31 else '/demo/list、form、components')
    c['secondAudit']=notes[n-1];c['secondEvidence']=extra.get(n,[])
    c['secondMode']='补充页面实测及证据核对' if n in extra and n not in [26,27,31] else '逐项证据核对'
    c['prerequisites']=original[n-1]['前置条件'];c['steps']=original[n-1]['步骤描述'];c['expected']=original[n-1]['预期结果']
    c['historicalEvidence']=['E021','E022','E023'] if n==11 else ['E054'] if n==32 else [f'R{i:03}' for i in range(1,11)] if n==31 else []
    if n in extra: revise(n,more=extra[n])
revise(4,'[1]【不通过】目的地/重量/日期正文#1A2130，规范#4B5564。\n[2]【不通过】链接#165DFF，现行3.1规定#046EFC；Tag各色未完整核对。\n[3]【通过】选中/hover仍保留链接与标签含义（首轮V06/V77）。',reason='撤销链接颜色子项的通过，现行色板已明确其指定值。')
revise(19,'[1]【不通过】刷新/demo/list后进入/login?redirect=/demo/list，未保持原路由。\n[2]【不通过】自动登录恢复标题和面包屑，但无demo/list菜单选中项。\n[3]【通过】重登录后BY10000001详情页可打开并返回列表。\n原前置没有持久会话要求，撤销上一版据此判受阻的理由；只判本地Mock行为。',reason='原前置没有持久会话要求；按实际刷新路由及导航判不通过。',status='不通过')
revise(28,'[1]【部分实测/不通过】普通短查询时数据区Spin，查询无loading类且disabled=false；违反请求期间按钮loading规则。未执行受控slow或重复触发计数。\n[2–4]【受阻】timeout/offline/500、失败态重试及失败→成功切换仍缺。\nV78/A06为加载瞬态DOM；V79为Spin截图，其后DOM已结束，不能视为同一时刻。',reason='已测按钮反馈差异保留不通过；短查询不替代受控slow及异常恢复全过程。')
revise(32,'[1]【不通过】四类默认按钮32px/圆角2px（规范8px）；默认色符合。\n[2]【历史/受阻】hover用10/13 E054；未取得持续active同态。\n[3]【部分观察】禁用均opacity0.4、原生disabled；缺动作计数，不判“不能触发动作”已完整实测。\n[4]【观察/受阻】loading保留Spin与文字，原生disabled=false；Text宽46→64正常。缺完成态与重复触发证据，不能从disabled=false推断可重复点击。',reason='收紧禁用与加载交互判定，静态属性不代替回调/恢复验证。')
revise(33,'[1]【不通过】灰边/白底；placeholder#86909C，规范#C0C4CC。hover未取同态，删除误引的按钮E054。\n[2]【通过】focus蓝边/3px光晕，filled灰边且输入保留。\n[3]【通过】空值失焦出现“请输入内容”，修正消失；无相邻控件覆盖。\n[4]【部分验证】禁用原生disabled、灰边/浅底/次色，32px/8px/14px；Tab跳过，未执行鼠标点击后输入。',reason='纠正hover证据错配并注明禁用交互覆盖边界。')
for n,c in enumerate(cases,1):
    add('通用模板UI与交互用例',f'I{n+1}',c['result'])
    add('通用模板UI与交互用例',f'H{n+1}',c['status'])

remarks=book['通用模板UI与交互用例']['G20'].value
remarks=re.sub(r'【准入状态】[^\n]*','【准入状态】本地刷新路由及导航已有可复现差异，待修改。',remarks)
remarks=re.sub(r'【全面复核】[^\n]*','【全面复核】二次核对原前置没有持久会话要求；刷新进入登录、恢复后无菜单选中，改为不通过。',remarks)
add('通用模板UI与交互用例','G20',remarks)
add('范围与依据','A5','2026-10-14二次复核40条：通过12、不通过12、受阻16。019由上一版受阻改不通过；004链接颜色子项改不通过；修正表单实际路径及032/033交互覆盖表述，同步纠正修改清单014次错坐标。业务76条保持原样。')
add('范围与依据','A10','本地dev/Mock，基础配置为环境入口；通用用例在/demo/list、/demo/list/form、/demo/components及403/500展示页验证。/demo/form实际为404，上一版路径标签已纠正。40条逐项核对前置/步骤/预期及证据，部分重点交互重跑；未把历史或未重跑分支写成二次实测。')
add('范围与依据','A14','二次读取规范V1.2正文仍rev5256，现行3.1嵌入色板确认链接文字#046EFC；指定UI Review视图仍显示24条（含空白）、修改时间10/12 17:23。Review具体文本及3.4/4.2/4.5.2使用首轮10/14截图；其他嵌入表及R001–R010仍为10/13参考。历史图与量测已另标日期打包，不宣称所有来源逐记录重读。')
add('范围与依据','A141','原状态列及浅黄色标记为历史；本次状态为二次复核结论。019不通过，028已测加载UI差异仍不通过但受控异常步骤受阻；004撤销链接色通过；032禁用、033禁用交互保留部分验证。当前/首轮/历史证据在配套报告逐条区分。')
add('范围与依据','D146','正文#4B5564；现行3.1链接文字#046EFC。\n二次实测正文#1A2130、链接#165DFF：两个子项不通过；Tag未完整逐色核对。')
add('范围与依据','H146','首轮：V02/V06/V77\n二次：A01/A03/A30色板')
add('范围与依据','D161','原前置未要求持久会话。\n刷新进入/login?redirect=/demo/list；恢复后demo菜单未选中，按原预期改不通过；详情页打开/返回已重测。')
add('范围与依据','F161','不通过')
add('范围与依据','G161','修复/明确本地刷新路由与菜单映射；不再增设持久会话作为本条前置。')
add('范围与依据','H161','二次：A02/A03/A04/A05\n首轮：V69/V70/V71')
add('范围与依据','D170','请求期间按钮loading/防重复规则已明确。\n普通短查询中数据Spin、查询无loading为已测差异；受控slow/异常及恢复步骤未执行，不能从disabled=false推断回调次数。')
add('范围与依据','H170','二次：A06瞬态DOM\n首轮：V78瞬态DOM/V79截图；两者非同时采样')
add('范围与依据','D174','默认四类32px/圆角2px不符合8px；默认色通过。\n禁用仅属性观察；loading仅Spin/文字观察。持续active、回调计数及结束恢复未验证，不判整步通过。')
add('范围与依据','D175','默认placeholder#86909C不符#C0C4CC。\nfocus/filled/error/纠错已重测；禁用样式及Tab跳过可验证，鼠标输入未重跑。hover未取同态，撤销E054错配。')
add('修改清单','D5','表格普通正文及链接颜色')
add('修改清单','E5','规范3.1现行色板、5.8；正文#4B5564，链接#046EFC')
add('修改清单','F5','二次实测普通正文#1A2130；链接#165DFF，现行3.1规定#046EFC。上一版链接子项通过有误，已纠正。')
add('修改清单','G5','正文映射#4B5564；链接映射color-primary #046EFC；标题和语义Tag按各自规则保留，Tag各色另补核对。')
add('修改清单','H5','正文#4B5564、链接#046EFC；选中/hover文字可读，Tag不被统一正文色覆盖。')
add('修改清单','J5','二次A01/A03/A30；首轮V02/V06/V77；历史E006/R007')
add('修改清单','F15','首轮10/14从底部保存：首错目的地top≈0.98、bottom≈30.98，固定顶栏56px，焦点仍在保存。修正目的地后日期top372.38、bottom394.38，处于可视区；上一清单次错8.375px为10/13旧记录，已纠正。首错策略仍缺批准，保留受阻/建议。')
add('修改清单','J15','首轮10/14：V72/V73/V75；历史10/13：E030/E031（旧次错坐标不作为本轮结果）')
add('修改清单','B17','本地行为与用例预期差异')
add('修改清单','F17','二次刷新/demo/list进入登录，自动登录才恢复；恢复后无demo/list菜单选中项。详情页打开/返回正常。原前置没有持久会话要求，撤销据此受阻的判定，019改不通过。')
add('修改清单','G17','修复刷新恢复与菜单映射，或提供正式的路由/身份恢复口径后修订用例；不增设原前置没有的阻塞条件。')
add('修改清单','H17','按现用例：刷新保持/demo/list及对应选中导航，标题/面包屑与详情交互一致；只检本地环境。')
add('修改清单','J17','二次A02/A03/A04/A05；首轮V69/V70/V71')
add('修改清单','K17','待修改')
add('修改清单','F23','普通短查询中数据Spin，查询按钮无loading类/disabled=false，已测反馈差异；受控slow/timeout/offline/500及失败恢复样例仍缺。未执行重复触发计数，不能从原生disabled=false断言防重复逻辑无效。')
add('修改清单','F27','hover使用10/13 E054，持续active仍缺。二次四类禁用opacity0.4/原生disabled，仅属性观察，缺动作计数。loading保留Spin/文字且Text宽46→64为正常；原生disabled=false不等于已证明可重复触发。结束恢复样例仍缺。')
add('修改清单','J27','二次A26；首轮V40；历史E054 hover及R001')

for f in (P/'evidence').iterdir():
    if f.is_file():shutil.copy2(f,O/'evidence'/f.name)
hist=O/'historical-20261013';hist.mkdir(exist_ok=True)
for f in (Path('./artifacts/weekly-ui/evidence/template-execution-20261013')).iterdir():
    if f.is_file():shutil.copy2(f,hist/f.name)
(O/'sources').mkdir(exist_ok=True)
for f in (P/'sources').iterdir():
    if f.is_file():shutil.copy2(f,O/'sources'/f.name)
shutil.copy2(W/'norm-second.json',O/'sources/norm-second.json')
config={'work':str(W2),'out':str(O),'source':str(S),'destination':str(T),'expectedCounts':{'通过':12,'不通过':12,'受阻':16},'expectedStatusChanges':1,'second':True}
(W/'second-config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf-8')
(W2/'edits.json').write_text(json.dumps(list(edits.values()),ensure_ascii=False,indent=2),encoding='utf-8')
(W2/'cases.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'counts':dict(Counter(c['status'] for c in cases)),'edits':len(edits),'statusChanges':[c['id'] for c in cases if c['status']!=c['previousStatus']]},ensure_ascii=False))
