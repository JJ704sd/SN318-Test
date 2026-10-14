from pathlib import Path
from collections import Counter
from datetime import datetime, timezone, timedelta
import json,re,hashlib,html,zipfile,xml.etree.ElementTree as ET,subprocess
ROOT=Path('.'); WORK=ROOT/'.work/w2-ui-run-20261014'; OUT=ROOT/'outputs/ui-audit-20261014/20261014-ui-audit'
inputs=json.loads((WORK/'input-cases.json').read_text(encoding='utf-8')); env=json.loads((OUT/'sources/environment-baseline.json').read_text(encoding='utf-8'))
now=datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
P,F,B='通过','不通过','受阻'
def step(result,actual,ev='',needed=''):
 return {'result':result,'actual':actual,'evidence_ids':ev.split() if ev else [],'needed':needed}
def blocked(needed,ev=''):return step(B,'本次未完成该分支判定；历史结果另保留。',ev,needed)
S={
1:[step(P,'唯一H1运单管理，20px/500。','T01-list-baseline'),step(F,'查询32px高、圆角2px，要求8px。','T01-list-baseline'),blocked('本轮列表外层卡片未独立量测；历史值不能代替本次','T13-container-metrics')],
2:[step(P,'标准页头含面包屑、标题和操作区。','T01-list-baseline'),step(F,'标准页头97px；面包屑18px。要求94px。','T01-list-baseline T13-container-metrics'),step(P,'标题与操作区底部对齐，截图可见。','T01-list-baseline')],
3:[step(F,'实际内层居中、gap8px，要求左对齐/16px。','T01-list-baseline T13-container-metrics'),blocked('本轮横滚尝试scrollLeft仍为0，不能当作横滚完成','T16-tablet-horizontal'),step(P,'1280/1024无根级横向溢出；固定行操作在视口内。','T14-list-1280 T15-list-1024 T16-tablet-horizontal')],
4:[step(F,'目的地/重量/日期普通文本#1A2130，要求#4B5564。','T01-list-baseline'),step(F,'运单链接#165DFF，规范Brand Blue为#046EFC；Tag未全色核对。','T01-list-baseline'),blocked('本轮未分别复测hover/选中下全部语义色；仅选中背景量测','T06-selected')],
5:[step(P,'数据行48px，表头#F7F7F7/500；行底线本轮未量测，详见下述覆盖限制。','T01-list-baseline'),step(P,'重量/运费实际内层右对齐，14px/400。','T01-list-baseline'),step(F,'操作列实际居中；名称等左对齐。hover背景本轮未量测。','T01-list-baseline')],
6:[step(P,'不存在的NO_UI_20261014查询后0条，旧结果退出。','T03-query-empty'),step(P,'未找到相关结果/请调整筛选条件后重试，输入保留。','T03-query-empty'),step(P,'重置可达，能退出空结果。','T04-reset-restored')],
7:[step(P,'重置清空测试词、状态/渠道恢复默认、日期为空。','T04-reset-restored'),step(P,'恢复86条、页码和内容对应。','T04-reset-restored'),step(P,'再次查询BY10000001得到1条，旧空态退出。','T05-valid-filter')],
8:[step(P,'首行选择后显示已选择1项。','T06-selected'),step(P,'批量栏替代默认操作栏，无重叠。','T06-selected'),step(P,'取消后选择清空、默认栏恢复。','T08-selection-cleared')],
9:[step(P,'全部主体/左右固定td均rgb(209,228,251)=#D1E4FB。','T06-selected'),blocked('水平滚动未完成；不引用历史横滚作为本轮通过','T16-tablet-horizontal'),step(P,'取消后选择栏消失。','T08-selection-cleared')],
10:[step(P,'明确删除1项及不可恢复说明。','T07-delete-confirm'),step(P,'取消在左、确认删除在右。','T07-delete-confirm'),step(P,'取消后原首行仍在，未执行删除。','T08-selection-cleared')],
11:[step(P,'640px右侧宽抽屉、全高；标题16px/500、header padding24px。遮罩色未独立复测。','T18-drawer-loaded'),step(P,'所选对象信息正确；768视口内容scrollTop98，已到末尾，底栏固定831–900。','T43-drawer-tablet'),blocked('仅底部关闭已完成；顶部/遮罩路径本轮未全部重跑','T44-final-list'),blocked('加载时顶部关闭定位发生动画/节点替换，未完成点击与迟到响应验证','T17-drawer-loading T19-drawer-current')],
12:[step(P,'空保存保持表单，字段下就地错误，无额外错误弹窗。','T23-required'),step(P,'错误与对应字段相邻，不盖住控件/底栏。','T23-required T27-form-tablet'),step(P,'纠正目的地后其错误消失，其他必填错误保留。','T24-field-corrected')],
13:[blocked('需批准可访问性验收方式/读屏基线；本轮仅DOM关联检查','T25-form-association'),blocked('错误描述关联基线待确认','T25-form-association'),blocked('未执行修正后读屏/焦点路径')],
14:[blocked('首错聚焦/滚动方案仍需确认；未复测长表单首错策略'),blocked('次错定位未重跑'),blocked('首错策略和键盘验收基线')],
15:[step(P,'199个汉字，计数199/200。','T26-note-199'),step(P,'200个汉字，计数200/200。','T26-note-200'),step(P,'实际尝试粘贴201字后保留200字，计数200/200；属于受控截断，非原生maxlength。','T26-note-201')],
16:[step(P,'输入已改，可见目的地及备注。','T28-form-cancel'),blocked('需批准离开确认及草稿策略；不以未弹框直接判缺陷','T28-form-cancel'),blocked('继续编辑分支依赖批准方案'),blocked('确认离开/重入草稿规则依赖批准方案')],
17:[step(P,'缺日期点击下一步停在基本信息并给就地错误。','T29-step-validation'),step(P,'填写有效日期后进入物流步，指示器与内容对应。','T30-step-next'),step(P,'上一步保留目的地/日期且错误清除。','T31-step-return')],
18:[step(P,'选择前显示XLSX/XLS/CSV、10MB限制。','T36-import-spec'),step(P,'未选文件保存提示请选择文件，弹窗保留。','T37-import-empty'),step(P,'取消重开为干净状态，无残留loading。','T38-import-reopen')],
19:[step(F,'实际reload后进入/login?redirect=/demo/list，未保持当前已登录列表。','T35-refresh-login'),blocked('登录已丢失，刷新后的列表导航条件不满足','T35-refresh-login'),blocked('刷新后需重新登录，未按原前置完成详情')],
20:[blocked('当前顶栏无搜索入口且批准占位方案未提供','T44-final-list'),blocked('通知入口/批准占位方案缺失'),blocked('前两入口未提供')],
21:[blocked('当前配置aiEnabled关闭；本期助手入口/方案未确认'),blocked('无可操作助手'),blocked('无可操作助手')],
22:[step(F,'1024属于Tablet；收件人与电话仍在同一行双列，要求单列。无页面横溢。','T27-form-tablet'),step(P,'末尾字段和必填错误可见，未被固定栏遮挡。','T27-form-tablet'),blocked('本轮未完成底栏键盘定位；仅可见按钮量测','T27-form-tablet')],
23:[blocked('Mobile是否纳入W2没有批准结论'),blocked('缺Mobile长文/触达样例及范围判据'),blocked('范围未定，未运行390分支')],
24:[step(P,'直接/403：暂无访问权限、联系管理员；120px图标，18px/500/#1A2130标题，14px/#9DA3AE说明；居中返回入口。','E01-403-display'),step(P,'返回后退出403至/login，当前未保留登录，未宣称到达已登录首页。','E02-403-return'),step(P,'到达方式为直接展示路由；初始化403链路未验。','E01-403-display E02-403-return')],
25:[step(P,'直接/500：服务器开小差了及两操作，未见堆栈。','E03-500-display'),step(P,'刷新重试触发页面加载；地址仍/500。这只证明刷新动作。','E04-500-retry'),step(P,'返回后退出至/login；直接展示路由，未验真实500恢复。','E05-500-return')],
26:[blocked('组件目录无Tabs专项页；业务关联Tabs不含两种标准完整样例','C01-entry'),blocked('未执行完整键盘/ARIA专项'),blocked('999/1000/长标签/8项受控样例缺失'),blocked('缺Tabs加载占位切换样例')],
27:[blocked('当前侧栏缺两个手动分类及三级可达样例','T44-final-list'),blocked('跨分类样例缺失'),blocked('三级菜单样例缺失')],
28:[step(F,'本地查询时列表Spin出现，但查询按钮未loading、disabled=false。','T02-query-loading'),blocked('没有从UI可切换的timeout/offline/500响应样例'),blocked('加载失败/重试入口无法从当前列表真实触发'),blocked('异常后恢复成功样例缺失')],
29:[step(P,'20条全选后取消首行，数量19且表头半选。','T09-half-selected'),blocked('翻页实际清空选择，但保留/清空批准策略未提供；本轮未完成改筛选分支','T11-page2-selection'),step(P,'确认19项后取消，无删除，随后清空选择。','T10-confirm-19 T11-page2-selection')],
30:[blocked('空/0/长文受控组合样例缺失'),step(P,'末页81–86六条及操作可见；不等于极大数值精度通过。','T12-last-page'),blocked('长详情展开及换对象样例缺失')],
31:[blocked('本轮未并排渲染关联规范示例图与同态页面'),blocked('当前数值差异另见001–005/022；不能替代整体图对照'),blocked('hover/active/disabled/loading对应图未全加载'),step(P,'当前截图、DOM和现行规范表分别打包，已标注截图采样限制。','T01-list-baseline C02-button-metrics')],
32:[step(F,'四类按钮32px高、各颜色符合默认值；均2px圆角，要求8px。','C02-button-metrics'),blocked('本轮未逐类完成悬停/按下移出检查'),step(P,'展示禁用按钮disabled=true、opacity0.4；不能触发动作分支未全重跑。','C02-button-metrics'),blocked('静态加载样例无结束切换/请求计数；disabled=false本身不能证明可重复点击','C02-button-metrics')],
33:[step(P,'普通框1px#DDDDDD/白底；禁用框#F7F7F7、文字#9DA3AE；32px/8px/14px。hover未完成。','C03-input-default'),blocked('填充后采样边框#B6C9E3，hover/focus未排除，不能据此归类filled缺陷','C04-input-filled'),step(P,'表单字段错误及修正已实测，样式色未独立逐态量测。','T23-required T24-field-corrected'),blocked('禁用鼠标/键盘输入路径本轮未完成','C03-input-default')],
34:[blocked('未添加过记录的独立首次空列表样例缺失'),step(P,'搜索无结果保留条件，重置能恢复。','T03-query-empty T04-reset-restored'),blocked('未执行清空记录；清空后零记录样例未提供')],
35:[blocked('有效表单提交403受控响应缺失；/403展示不替代'),blocked('未触发提交403'),blocked('403后恢复样例缺失')],
36:[step(P,'默认480px、大640px，16px标题/500、radius16、body padding24；长内容滚动未完整执行。','C05-modal-default C07-modal-large-stable'),blocked('组件静态确认样例无受控提交中响应'),blocked('缺请求计数及加载时遮罩关闭样例'),blocked('缺提交失败保留输入/恢复样例')],
37:[step(F,'1279属Tablet时表单仍双列；1280及1024已有对应取证。','T39-list-1279 T40-form-1279 T14-list-1280 T27-form-tablet'),step(P,'768无根级横溢，列表操作及640px抽屉可达，关闭后回列表。','T41-form-768 T42-list-768 T43-drawer-tablet T44-final-list'),blocked('Mobile范围无批准结论，不能写不适用')],
38:[step(P,'真实合成PDF选择后可见百分比及取消入口，重试采样20%；预置60%仅作展示。','C08-upload-file-selected C10-upload-retry-progress'),step(P,'重试期间取消后该文件项退出；不是删除已提交业务附件。','C11-upload-cancel'),blocked('重试进度可见，但该PDF始终网络异常，无重试成功样例','C09-upload-auto-error C10-upload-retry-progress')],
39:[blocked('正常页面初始化返回403的受控入口缺失'),blocked('只有直接/403展示取证，非本条链路','E01-403-display'),blocked('初始化403后恢复入口缺失'),blocked('未取得实际初始化403触发请求与响应')],
40:[step(P,'Desktop小图160×100未放大；横图2500×1800→1116.66×804，竖图1800×2600→556.61×804，等比；四边≥48，关闭距24。判定用DOM量测，截图未同步呈现浮层。','C12-preview-small C13-preview-landscape C14a-preview-portrait-stable'),step(P,'1024×768横图959.97×691.19，四边≥32；关闭距20。','C15-preview-tablet'),step(P,'关闭后预览img/close为空、body overflow恢复空值，点击上传标题后原文件列表可定位；通过DOM判定，未以不同步截图代替。','C16-preview-exit')]
}
# A whole source step containing unverified subcriteria must remain blocked.
S[5][0]=blocked('行底线未独立量测；已确认行高48/表头#F7F7F7/500','T01-list-baseline')
S[11][0]=blocked('已量测宽高/标题/padding，但遮罩rgba本轮未复测','T18-drawer-loaded')
S[24][0]=blocked('图标/文字值已符合；操作距说明24px本轮未读取，完整样式步骤受阻','E01-403-display')
S[24][1]=blocked('返回按钮已退出403至/login；已登录首页落点未验证，不能直接宣称到达首页','E02-403-return')
S[25][2]=blocked('返回按钮已退出500至/login；需在可保持登录的前置下验证首页落点','E05-500-return')
S[30][1]=blocked('末页81–86已验证；极大数值精度与单位样例缺失','T12-last-page')
S[32][2]=blocked('禁用展示值已核对；四类禁用鼠标/键盘路径未全执行','C02-button-metrics')
S[33][0]=blocked('默认/禁用展示尺寸已核对；hover和placeholder逐态值未完整执行','C03-input-default')
S[33][2]=blocked('错误及修正行为已执行；错误边框/提示色未完整量测','T23-required T24-field-corrected')
S[36][0]=blocked('480/640及圆角/标题/padding已核对；长内容末尾/固定底栏分支未全执行','C05-modal-default C07-modal-large-stable')
S[38][1]=blocked('取消已完成；取消后重新选择同文件分支未完成','C11-upload-cancel')
def numbered(text):return re.findall(r'\[(\d+)\]([^\[]*)',text)
def agg(ss):
 for status in [F,B,'未执行',P]:
  if any(x['result']==status for x in ss):return status
 return '不适用'
cases=[]
for c in inputs['template']:
 n=int(c['id'][-3:]); actions=numbered(c['actions']); expects=dict(numbered(c['expected'])); assert len(actions)==len(S[n]),c['id']
 ss=[dict(item,id=str(i),action=a.strip(),expected=expects.get(i,'').strip()) for (i,a),item in zip(actions,S[n])]
 cases.append(dict(c,layer='template',steps=ss,result=agg(ss),package_ids=[]))
business=[]
resources=[('country','国家','B21-country','location',[]),('province','省/州','B23-location-0','location',[]),('city','城市','B23-location-1','location',[]),('district','区县','B23-location-2','location',[]),('postal_code','邮编','B23-location-3','location',[]),('airport','机场','B25-location-0','location',[]),('port','港口','B25-location-1','location',[]),('warehouse','仓库','B25-location-2','location',[]),('air_region','航线区域','B27-region','zone',[]),('reference_zone','Zone','B32-zone','zone',[]),('airline','航空公司','B37-dict-airline','dictionary',['W2-56']),('transport_mode','运输方式','B39-dict-0','dictionary',['W2-56']),('cargo_type','货物类型','B39-dict-1','dictionary',['W2-56']),('packaging_type','包装类型','B39-dict-2','dictionary',['W2-56']),('supervision_mode','监管方式','B17-dictionary','dictionary',['W2-56']),('fee_item','费用项','B41-fee','finance',['W2-50']),('currency','币种','B43-currency','finance',['W2-51']),('exchange_rate','汇率','B45-rate','finance',['W2-51'])]
def addbusiness(name,steps,url,pkgs=None,norm='M1开发基线；V1.2 7.2',scope='已交付M1本地Mock补测'):
 id=f'UI-M1-{len(business)+1:03d}'
 business.append({'id':id,'name':name,'module':'/SN318/W2/已交付M1补测','preconditions':'本地dev + useMockAuth/useMockData，demo角色，1440×900/100%；只判前端Mock表现。'+scope,'priority':'P1','notes':f'【用例编号】{id}\n【依据】{norm}\n【范围】{scope}','layer':'business','url':url,'steps':[dict(x,id=str(i+1),action=x.pop('action'),expected=x.pop('expected')) for i,x in enumerate(steps)],'manual_review':'','package_ids':pkgs or []})
 business[-1]['result']=agg(business[-1]['steps']);return id
def bs(result,action,expected,actual,ev,needed=''):return dict(step(result,actual,ev,needed),action=action,expected=expected)
for resource,name,stem,group,pkgs in resources:
 e=stem+'-empty'; reset=stem+'-reset'
 if resource=='supervision_mode':e='B17-dictionary-noresult';reset='B18-dictionary-reset'
 empty=json.loads((OUT/'evidence'/f'{e}.json').read_text(encoding='utf-8'))
 assert 'NO_UI_20261014' in empty['snapshot'] and '暂无' in empty['snapshot'],e
 addbusiness(f'{name}列表查询无结果与重置恢复',[
  bs(P,'输入NO_UI_20261014并查询','筛选保留且0条，不保留旧结果','DOM完成态0条，测试词保留。',e),
  bs(F,'阅读无结果说明和恢复入口','搜索无结果说明调整筛选，区别首次无数据','显示暂无'+name+'数据和新增入口，缺调整筛选说明；重置按钮虽在筛选区仍可用。',e),
  bs(P,'点击重置','清空测试词，恢复当前资源原列表','DOM记录原列表恢复，未串入其他资源。',reset)],empty['url'],pkgs)
for name,e,reset,pkgs in [('航线区域国家关系','B29-region-relation-empty','B30-region-relation-reset',[]),('Zone成员','B34-zone-member-empty','B35-zone-member-reset',[])]:
 addbusiness(name+'页签查询与恢复',[
  bs(P,'在父对象详情明确点击关系/成员页签，再查询NO_UI_20261014','查询只影响关联子表，父列表和对象保留','子表0条，父列表仍3条，所选ASIA/Mock Zone不变。',e),
  bs(F,'查看关联子表空结果','搜索无结果有调整筛选引导','显示暂无国家关系/成员数据及新增关系，缺筛选恢复说明。',e),
  bs(P,'点击子表重置','恢复原父对象关系数据','恢复关联行，父对象未串用。',reset)],json.loads((OUT/'evidence'/f'{e}.json').read_text(encoding='utf-8'))['url'],pkgs)
addbusiness('费用项编码只读及编辑取消保留原数据',[
 bs(P,'打开FREIGHT编辑','既有编码不可编辑','编码disabled，当前名称运费。','B04-fee-edit'),
 bs(P,'将名称改成UI临时修改_取消验证后取消','取消不保存，原记录未改','原FREIGHT仍为运费，未提交修改。','B05-fee-cancel')],'/system-config/master-data?group=finance&resource=fee_item',['W2-50'],'M1字段不可变/取消语义')
addbusiness('费用项空提交及重复编码反馈',[
 bs(P,'新增空表单保存','必填字段下提示且保持表单','编码/名称等字段就地报错。','B06-fee-required'),
 bs(B,'填写已有FREIGHT与有效其他字段保存','重复编码明确错误且输入保留、按钮解除loading','停留表单、原3条记录未增；Toast已消失，错误文案未捕获，不能判完整通过。','B07-duplicate-start B08-duplicate-result','补充可持续错误捕获/按钮恢复采样')],'/system-config/master-data?group=finance&resource=fee_item',['W2-50'],'M1必填/重复编码；规范7.3字段错误')
addbusiness('币种编辑编码不可修改',[
 bs(P,'打开币种编辑','已有code只读','code disabled；本条仅判编码不可输入，不将取消后落点合为已验证条件。','B10-currency-edit')],'/system-config/master-data?group=finance&resource=currency',['W2-51'],'M1编码不可变')
addbusiness('已生效汇率版本维护按M1呈现',[
 bs(P,'打开已生效USD/CNY汇率编辑','源/目标/汇率/生效日不可改，调整结束区间；无普通删除','源目标、ratio7.1234、start2026-10-01 disabled；end/status可编辑，无删除入口。','B11a-rate-loaded B12a-rate-edit-loaded')],'/system-config/master-data?group=finance&resource=exchange_rate',['W2-51'],'M1已生效汇率版本规则；PRD正文/待确认项冲突另登记')
addbusiness('基础配置汇率公共视觉规范',[
 bs(F,'量测查询按钮','按钮圆角8px','32px高、圆角2px。','B46-master-common-metrics'),
 bs(F,'量测表格正文与数字','正文#4B5564，数字右对齐，操作左对齐','正文#1A2130、ratio内层左对齐、操作居中。','B46-master-common-metrics'),
 bs(P,'量测卡片','圆角12px、padding24px','两张公共卡片12px/24px。','B46-master-common-metrics')],'/system-config/master-data?group=finance&resource=exchange_rate',['W2-51'],'V1.2 3.1/5.1/5.8/5.9','仅汇率实际对象量测，不替代全部资源字段专项')
cases+=business
# Evidence identifiers must refer to exact files; resolve historical misspellings before publishing.
aliases={'B07-duplicate-start':'B07-fee-duplicate-start','B08-duplicate-result':'B08-fee-duplicate-result','C01-entry':'C01-components-entry','T23-required':'T23-form-required'}
for c in cases:
 for s in c['steps']:s['evidence_ids']=[aliases.get(e,e) for e in s['evidence_ids']]
files={p.stem:p for p in (OUT/'evidence').glob('*.json') if p.name!='capture-index.json'}
missing=sorted({e for c in cases for s in c['steps'] for e in s['evidence_ids'] if e not in files})
if missing:raise RuntimeError('Missing evidence: '+str(missing))
def issue(id,type,level,page,norm,actual,repro,recommendation,acceptance,case_ids,ev,needed='',status='待整改/未复测'):
 return dict(id=id,type=type,level=level,page=page,norm=norm,actual=actual,repro=repro,recommendation=recommendation,acceptance=acceptance,case_ids=case_ids.split(),evidence_ids=ev.split(),needed=needed,status=status,owner='待分派')
issues=[
 issue('W2-R01','已证实规范差异','P2','模板/基础配置/按钮示例','V1.2 3.4/5.1 Jhut4D','默认按钮圆角2px，规范8px','进入列表或基础配置量测查询按钮','检查公共按钮Token及square类覆盖','四类默认按钮32px高、8px圆角；文字不裁切，hover/active尺寸不跳变','UI-TPL-001 UI-TPL-032 UI-M1-025','T01-list-baseline C02-button-metrics B46-master-common-metrics'),
 issue('W2-R02','已证实规范差异','P2','/demo/list','V1.2 4.2 FFO2Ix/0rCax8','标准页头97px，规范94px','1440×900读取page-header边界','检查标准页头垂直间距及行高','标准页头94px、面包屑18px，标题与按钮底部对齐','UI-TPL-002','T01-list-baseline T13-container-metrics'),
 issue('W2-R03','已证实规范差异','P2','模板操作列/汇率公共表格','V1.2 5.8 tkqkxw/IOfbnI','操作内层居中；模板gap8px，规范左对齐/16px','读取实际内层容器对齐与间距','统一公共表格操作容器，复测固定列边界','操作左对齐、文字按钮间距16px；Tablet固定列无重叠','UI-TPL-003 UI-TPL-005 UI-M1-025','T01-list-baseline T13-container-metrics B46-master-common-metrics'),
 issue('W2-R04','已证实规范差异','P2','模板/汇率普通正文','V1.2 3.1 hezLMm/5.8','普通文本#1A2130，要求#4B5564','量测目的地/日期/汇率正文','检查正文Token被组件默认字色覆盖','普通正文#4B5564；标题与状态语义色保留','UI-TPL-004 UI-M1-025','T01-list-baseline B46-master-common-metrics'),
 issue('W2-R05','已证实规范差异','P2','/demo/list 运单链接','V1.2 3.1 28tJFI Brand Blue','链接#165DFF，规范#046EFC','读取首条运单链接计算颜色','按现行链接Token统一','默认链接#046EFC，hover/active使用规定色，状态含义不被覆盖','UI-TPL-004','T01-list-baseline'),
 issue('W2-R06','已证实规范差异','P1','/demo/list/form Tablet','V1.2 4.5.2 lfEtqB/5.7','1024/1279仍双列，Tablet要求单列','设置1024或1279，查看收件人/电话同一行','检查Tablet断点与表单列配置','768≤宽<1280采用单列、标签在上、padding16；底栏键盘可达、无根级横溢；1280恢复Desktop','UI-TPL-022 UI-TPL-037','T27-form-tablet T40-form-1279 T41-form-768'),
 issue('W2-R07','已证实交互缺陷','P1','/demo/list 查询','V1.2 2.1/7.1 局部加载','查询期间Spin存在，但查询按钮未loading且未禁用','输入测试词点击查询，读取早期按钮状态','让查询按钮绑定请求状态并防止重复请求','查询启动立即loading并不可再次触发；保留筛选，完成/失败后解除loading','UI-TPL-028','T02-query-loading','需补请求计数/slow及异常恢复样例'),
 issue('W2-R08','已证实交互差异','P1','/demo/list reload','原UI-TPL-019路由保持前置','已登录列表实际reload后到login?redirect=/demo/list','已登录列表使用浏览器reload','核对Mock登录状态恢复与路由准入约定','本地测试账号刷新仍处于/demo/list且导航一致、详情可用；若Mock不支持持久登录，应批准修改原验收前置并明确说明','UI-TPL-019','T35-refresh-login','Mock会话持久性验收口径需明确'),
 issue('W2-R09','已证实规范差异','P1','18个M1列表+2个关联子表','V1.2 7.2 2xUUpH','筛选无结果复用暂无数据+新增引导，缺调整筛选提示','在各列表/子表输入NO_UI_20261014查询','按是否有筛选区分首次无数据与无结果，共用空态组件','查询0结果保留条件并显示未找到相关结果/调整筛选及重置入口；重置恢复原对象；首次无数据仍按权限引导新增',' '.join(x['id'] for x in business[:20]),'B21-country-empty B41-fee-empty B29-region-relation-empty B34-zone-member-empty'),
 issue('W2-R10','已证实说明与交互不一致','P2','/demo/components Upload','页面声明：显式提交（非选中即传）；本地Mock范围','选中文件未按显式提交就进入进度，随后自动失败；图片自动完成','选择合成PDF，不点击另一个提交动作','明确待上传/上传中状态；按已声明显式提交方案设置开始动作，或经产品批准修订说明','选择后仅待上传，明确开始才显示进度；取消终止，重试可成功；本条未验证实际网络文件传输','UI-TPL-038','C08-upload-file-selected C09-upload-auto-error C10-upload-retry-progress C11-upload-cancel','需要批准上传触发方案及可成功重试样例'),
 issue('W2-R11','已证实规范差异','P2','基础配置汇率ratio','V1.2 5.8 IOfbnI 数字对齐','汇率7.1234实际内层左对齐','读取当前汇率ratio单元格内层','为ratio配置数字右对齐，保留PRD/M1精度','汇率数字右对齐；不改变精度迁就宽度，空与0可区分','UI-M1-025','B46-master-common-metrics'),
 issue('W2-D01','规范/范围待裁决','P1','费用项字段','产品PRD rev8350 vs M1冻结基线','PRD费用类型9类、默认币种字典下拉；当前分组编码及币种文本','打开费用项编辑对照两份依据','确认M1字段是否映射到本周产品PRD；批准后再定修复范围','产品确认字段映射/字典来源/必填与变更审批；批准范围内选择控件符合稿','UI-M1-021 UI-M1-022','B04-fee-edit','产品批准M1与PRD映射',status='待产品裁决'),
 issue('W2-D02','规范/范围待裁决','P1','币种与汇率','产品PRD正文/待确认项29 vs M1','PRD正文编辑删除/来源审批，与M1生效只读无普通删除有差异；PRD待确认项又要求新增版本','对照汇率编辑、M1与当前PRD','确定本周采用版本维护、审批与删除口径','产品签定一种一致口径，补变更版本/权限/提交异常样例；按批准口径复测','UI-M1-024','B12a-rate-edit-loaded','产品对冲突条款作裁决',status='待产品裁决'),
 issue('W2-D03','体验说明待确认','P2','基础配置对象区','本地开发测试文档/useMockData=true','本地Mock仍写选择对象查看正式数据','打开任意基础配置对象区','确认Mock环境标识及文案','本地测试界面能识别模拟数据来源；该文案不当作生产数据证明','UI-M1-025','B46-master-common-metrics B41-fee-empty','Mock环境标识方案',status='待产品确认'),
 issue('W2-G01','样例/批准策略缺口','P1','查询/表单/异常页','UI-TPL-028/035/039与规范7.3','缺timeout/offline/500/提交403/初始化403及恢复入口','现有UI没有受控切换','提供可在页面触发的受控响应及恢复按钮/数据','逐分支记录真实UI动作、响应和恢复；不以直接/403、/500路由替代','UI-TPL-028 UI-TPL-035 UI-TPL-039','E01-403-display E03-500-display','响应样例与初始化/提交触发方式',status='受阻待补齐'),
 issue('W2-G02','样例/批准策略缺口','P2','组件/表单/导航','UI-TPL-013/014/016/020/021/023/026/027/029/030/031/032/033/034/036/038','专项样例、交互/可访问性/Mobile/草稿/跨页策略缺失或未完整执行','见各用例逐步记录','先补批准策略，再提供Tabs计数/长文/三态/请求计数等可执行样例','按每条需要条件补齐后逐步复测；不得把DOM存在/历史通过替代新执行','UI-TPL-013 UI-TPL-014 UI-TPL-016 UI-TPL-020 UI-TPL-021 UI-TPL-023 UI-TPL-026 UI-TPL-027 UI-TPL-029 UI-TPL-030 UI-TPL-031 UI-TPL-032 UI-TPL-033 UI-TPL-034 UI-TPL-036 UI-TPL-038','C01-entry C02-button-metrics','逐条缺条件见用例记录',status='受阻待补齐')]
for item in issues:item['evidence_ids']=[aliases.get(e,e) for e in item['evidence_ids']]
schedule=json.loads((OUT/'sources/schedule-live.json').read_text(encoding='utf-8')); ranges=schedule['ranges'][0]; packages=[]
for rn,row in zip(ranges['row_indices'],ranges['cells']):
 vals=[c.get('value','') for c in row]
 if len(vals)>9 and vals[9]=='UI/开':
  pid=f'W2-{vals[0]}'; refs=[c['id'] for c in business if pid in c['package_ids']]
  packages.append({'id':pid,'source_row':rn,'name':vals[4],'path':'/'.join(str(x) for x in vals[2:5]),'priority':vals[5],'phase':'W2 UI/开','case_ids':refs,'delivery':'M1部分覆盖，非完整工作包验收' if refs else '本轮未见对应已交付业务入口','blocker':'专项PRD映射、边界/异常样例未全覆盖' if refs else '缺实际业务页面入口/提测Build及样例；基础主数据不替代专项页面','next_action':'整改共性差异并裁决M1/PRD；补齐专项步骤后复测' if refs else '按提测入口介入；P0优先，再执行P1','owner':'待确认'})
assert len(packages)==38 and Counter(p['priority'] for p in packages)=={'P0':24,'P1':14}
counts={layer:dict(Counter(c['result'] for c in cases if c['layer']==layer)) for layer in ['template','business']}
stepscounts={layer:dict(Counter(s['result'] for c in cases if c['layer']==layer for s in c['steps'])) for layer in ['template','business']}
evidence=[]
for id,p in files.items():
 d=json.loads(p.read_text(encoding='utf-8')); evidence.append({'id':id,'path':p.relative_to(OUT).as_posix(),'captured_at':d.get('at'),'url':d.get('url'),'scope':'本地Mock，DOM/计算样式与截图顺序采样；动态完成态按DOM/量测判，截图可能为过渡态。','screenshot':('evidence/'+id+'.jpg') if (OUT/'evidence'/f'{id}.jpg').exists() else None})
record={'run_id':'W2-dev-20261014-'+env['worktree_fingerprint'][:8],'started_at':env['started_at'],'ended_at':now,'environment':dict(env,base_url='http://127.0.0.1:5173',role='demo',zoom=1,viewport='1440×900; 1280×800; 1279×800; 1024×768/800; 768×900',viewport_restored=True),'scope':'40模板逐条审查及可执行分支复测；18个M1列表+2个关联子表及5个定向补测；原76业务候选未完整执行。','counts':counts,'step_counts':stepscounts,'issues':issues,'cases':cases,'packages':packages,'evidence':evidence,'sources':{'norm':'V1.2正文rev5256；29个涉及表rev3138，现行只读刷新','schedule':'rev988，W2 10/12–10/16，38 UI/开，24 P0/14 P1；需阶段24项不纳入本次业务执行','review':'rev680，指定视图24条包括空行，record_id稳定标识；设计状态不当作执行结果','product_prd':'rev8350，基础PRD rev2；与M1冲突列待裁决','historical_workbook':inputs['source_workbook'],'historical_sha256':inputs['source_sha256']},'limitations':['Mock仅前端表现；不证明真实接口/财务规则/权限/生产验收','截图、DOM、量测依次采样；部分截图未捕获浮层或空结果完成态，判定以明确引用的DOM/量测为准','未执行业务删除；测试编辑均取消；模板保存不宣称业务持久化','没有完整业务工作包通过：仅W2-50/51/56三个工作包有M1部分证据，其余35缺本轮已交付入口','原H/I列及模板J人工意见原样保存；模型未写真人复核意见']}
(OUT/'审查记录.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
def result_text(c):
 return '\n'.join(f"[{s['id']}]【{s['result']}】{s['actual']}"+(f"\n缺条件：{s['needed']}" if s['needed'] else '')+'\n证据：'+('、'.join(s['evidence_ids']) or '无本次动态证据') for s in c['steps'])
def colsnum(n):
 t=''
 while n:n,k=divmod(n-1,26);t=chr(65+k)+t
 return t
blocks=[{'sheet':'通用模板UI与交互用例','range':'K1:M41','header':'K1:M1','values':[['本次执行状态（2026-10-14）','本次实际结果/证据（原H/I/J保留）','本次Build/覆盖']] + [[c['result'],result_text(c),record['run_id']+'\n本地dev/Mock；不覆盖真实接口；逐步受阻见左列'] for c in cases[:40]],'widths':{'K':20,'L':85,'M':44}},
 {'sheet':'业务UI与交互用例','range':'J1:M77','header':'J1:M1','values':[['人工二次复核','本次原候选执行状态','本次说明（原H/I保留）','本次Build/覆盖']]+[['','未执行','原候选步骤未完整重跑；本次已交付M1补测见下方UI-M1-001–025，不替代本条。',record['run_id']] for c in inputs['business']],'widths':{'J':26,'K':20,'L':85,'M':44}},
 {'sheet':'业务UI与交互用例','range':f'A78:M{77+len(business)}','values':[[c['name'],c['module'],c['preconditions'],'\n'.join('['+s['id']+']'+s['action'] for s in c['steps']),'\n'.join('['+s['id']+']'+s['expected'] for s in c['steps']),c['priority'],c['notes']+'\n【工作包】'+(','.join(c['package_ids']) or 'M1补充，非W2专项代替'),'未执行（新增记录无历史）','','',c['result'],result_text(c),record['run_id']] for c in business],'rowHeight':150},
 {'sheet':'修改清单','range':f'A35:O{35+len(issues)}','header':'A35:O35','values':[['问题ID','类型','等级','页面/对象','规范定位','本次实际差异','复现步骤','修改/补齐建议','验收标准','相关用例','证据','整改/复测状态','缺条件','责任人','排期安排']]+[[x['id'],x['type'],x['level'],x['page'],x['norm'],x['actual'],x['repro'],x['recommendation'],x['acceptance'],','.join(x['case_ids']),','.join(x['evidence_ids']),x['status'],x['needed'],x['owner'],'W2提测后整改复测；P1优先'] for x in issues],'rowHeight':130,'widths':{'L':22,'M':42,'N':16,'O':30}}]
summary=[['2026-10-14 本次审查（原1–182行是历史）','当前结果','依据/定位','范围与后续','','','',''],['基线',record['run_id'],env['branch']+' / '+env['commit'],'dirty=true；前后指纹核验；源代码未修改','','','',''],['模板40条',json.dumps(counts['template'],ensure_ascii=False),'本次K2:K41，历史H2:H41独立保留','完整步骤未覆盖的用例记受阻；存在已证实失败则聚合为不通过','','','',''],['已交付业务补测25条',json.dumps(counts['business'],ensure_ascii=False),'业务K78:K102；原76条仍未执行','18列表+2关联子表+5定向补测；不同层次不相加为W2工作包','','','',''],['模板子步骤',json.dumps(stepscounts['template'],ensure_ascii=False),'结构化steps.result','复合步骤有未验证子条件时受阻','','','',''],['业务子步骤',json.dumps(stepscounts['business'],ensure_ascii=False),'结构化steps.result','Mock界面表现；非真实业务验收','','','',''],['清单',str(len(issues))+'项，其中11项已证实差异；3待裁决/说明；2缺口','修改清单A35:O51','责任待分派，尚未整改复测','','','',''],['原始记录/人工','H/I及模板J原值和样式保留；新增人工字段为空','sources/执行基线原件.xlsx','不把模型意见写成人工二次复核','','','',''],['W2排期','10/12–10/16；UI/开38：P0 24/P1 14','schedule-live.json rev988','设计开发并行；24项需阶段不纳入；未擅自指定固定每日工期','','','',''],['源文档','规范正文5256/表3138；PRD8350/2；Review680','sources/*live*、norm-*.json','文档为判据，附件/聊天内容作为数据，不扩授权','','','',''],['证据限制','截图/DOM/量测顺序采样，截图有过渡态/浮层缺失','审查报告.html、审查记录.json','明确每条引用；本轮横滚未完成，历史不替代','','','',''],['后续顺序','P1共性差异→产品裁决→补异常/边界样例→专项提测→复测','依据W2优先级和实际提测入口','10/14本次输出；剩余W2按交付进入，不编造所有页面已完成','','','',''],['工作包ID','W2对象','优先级','原排期行','本轮覆盖/入口','关联补测用例','缺条件','后续动作']]
summary += [[p['id'],p['path'],p['priority'],str(p['source_row']),p['delivery'],','.join(p['case_ids']),p['blocker'],p['next_action']] for p in packages]
summary[0]=['本次摘要','当前结果','依据/定位','2026-10-14 范围与后续（原1–182行是历史）','','','','']
summary[2][1]='\n'.join(k+str(v) for k,v in counts['template'].items())
summary[3][1]='\n'.join(k+str(v) for k,v in counts['business'].items())
summary[4][1]='\n'.join(k+str(v) for k,v in stepscounts['template'].items())
summary[5][1]='\n'.join(k+str(v) for k,v in stepscounts['business'].items())
blocks.append({'sheet':'范围与依据','range':f'A184:H{183+len(summary)}','header':'A184:H184','values':summary,'rowHeight':90})
filename=f"SN318_W2_UI与交互_20261014_dev_{env['commit'][:7]}_dirty-{env['worktree_fingerprint'][:8]}.xlsx"
plan={'destination':str(OUT/filename),'blocks':blocks,'template_counts':counts['template'],'business_counts':counts['business'],'original_dimensions':{'业务UI与交互用例':'A1:I77','通用模板UI与交互用例':'A1:J41','范围与依据':'A1:H182','修改清单':'A1:K33'}}
(WORK/'workbook-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'counts':counts,'steps':stepscounts,'business':len(business),'issues':len(issues),'partial_packages':[p['id'] for p in packages if p['case_ids']],'evidence':len(evidence),'destination':plan['destination']},ensure_ascii=False))
