import json, re, shutil, hashlib
from pathlib import Path
from collections import Counter
import openpyxl

ROOT=Path('./recipes/template-ui-reaudit-20261014')
P=Path('./artifacts/template-reaudit/二次复核')
OUT=P.parent/'受阻16条核实'
W=ROOT/'third';W.mkdir(exist_ok=True)
SRC=P/'SN318_W2_UI与交互测试用例_40条二次复核修正版_20261014.xlsx'
DEST=OUT/'SN318_W2_UI与交互测试用例_16条受阻核实_含人工二次复核.xlsx'
book=openpyxl.load_workbook(SRC)
cases=json.loads((ROOT/'second/cases.json').read_text(encoding='utf-8'))
scope=[int(c['id'][-3:]) for c in cases if c['status']=='受阻'];assert len(scope)==16
records={
11:('通过','[1]【通过】宽抽屉640×900，标题16/500、遮罩0.45；实际内容.drawer-detail内边距24px，包装层为0。\n[2]【通过】滚至末尾scrollTop158，标题/底栏固定，备注bottom786在底栏top835上方。\n[3]【通过】底部、顶部、遮罩关闭均保留BY10000021筛选和1条记录。\n[4]【通过】默认300ms Mock中内容骨架可见；加载中顶部关闭，迟到响应不重开。',
    '无。本条在当前固定300ms前端Mock范围完成；未扩展为真实后端验收。',
    'B02 B03 B04 B05 B06 B07 B08 B09 B43 B44 B45 B46'),
13:('受阻','[1–2]【已观察】可见label无for，输入无id/aria-labelledby/aria-describedby；错误为role=alert。\n[3]【已实测】修正目的地后其错误清除，其余错误保留；没有执行读屏器验收。',
    '可引用的UI批准基线（可访问名称、错误关联方式）及指定浏览器/读屏器组合和验收路径。',
    'B20 B23'),
14:('受阻','[1]【已实测】首错在屏外时从底部鼠标保存，焦点仍在保存，首错/提示被56px顶栏遮挡。B22坐标为滚动瞬态，不冒充稳定坐标。\n[2]【已实测】修正目的地再保存，日期top372.38/bottom394.38可见，旧错误消失。',
    '已批准的首错聚焦或滚动策略，明确固定顶栏安全区及修正后连续错误的验收规则。',
    'B21 B22 B23 B24'),
16:('受阻','[1]【已实测】目的地/备注输入回显。\n[2–3]【观察】取消直接回列表，无二次确认或继续编辑分支。\n[4]【已实测】重入新建目的地/备注为空、业务类型快递；不能据此判任意草稿策略通过。',
    '本表单是否要求离开确认、继续/确认文案，以及离开后的草稿保留/重入规则的书面批准。',
    'B23 B25 B26'),
20:('受阻','[1–3]【入口核实】列表与组件页顶栏均只有菜单、系统名、demo用户，无搜索输入及通知入口；无相应反馈可关闭。',
    '搜索/通知已接入的可运行构建；批准的演示或接入方案，及搜索结果、通知有/无数据样例。',
    'B01 B30'),
21:('受阻','[1]【入口核实】1440×900及1280×800无浮动助手；1280助手DOM计数0。\n[2–3]【受阻】无法交叉点击行操作或展开/收起面板。配置只读核对：dev的aiEnabled/aiAssistantEnabled为false。',
    '助手已启用的目标本地构建（对应两项配置为true）及可展开/收起面板样例，才能测实际遮挡位置和点击。',
    'B01 B16 B48'),
23:('受阻','[1–2]【已观察】390×844仍为1100px宽表；根宽375无根级溢出，详情按钮高28px。\n[3]【已实测】BY10000001窄屏抽屉可开关并回原列表。未把未知Mobile范围写成已确认不适用。',
    '产品明确Mobile是否纳入本期；纳入时需批准的卡片设计和长文样例，明确不纳入时才改本期不适用。',
    'B17 B18 B19'),
26:('受阻','[1–4]【入口核实】组件目录17类，DOM无tablist；当前分类按钮及普通链接不能替代页头/列表Tabs专项。',
    '可运行的页头/列表Tabs样例：长标签、7/8入口、999/1000计数、内容加载切换，以及键盘/ARIA状态。',
    'B30'),
27:('受阻','[1–3]【入口核实】展开后仅1个一级“系统配置”和“基础配置”子项，无第二分类或三级/混合层级。RV02规则已有，不再以设计口径未知解释受阻。',
    '至少两个一级分类及三级/混合层级的运行菜单样例，使手动多展开、跨分类选择及高亮可逐步操作。',
    'B01 B47'),
29:('受阻','[1]【已实测】全选后取消首行，19项/表头半选。\n[2]【已实测】翻第二页清空；选1项改筛选也清空。\n[3]【已实测】19项删除确认显示19，仅取消后继续翻页；未执行删除。',
    '批准的全选范围（本页/全量）以及跨页、改筛选时保留或清空规则；多页数据及取消路径已可测。',
    'B10 B11 B12 B13'),
30:('受阻','[2]【部分通过】重测第5页6条81–86，重量3位/金额4位，末记录操作可达。\n[1、3]【受阻】固定Mock短字段，不含null/空串/真实0、极值及超行数详情；未执行长文全文交互。',
    '带记录ID/原值的列表与详情样例：null、空串、真实0、极大数值、长名/地址、超2–3行详情及全文Tooltip/展开收起。',
    'B15 B48'),
34:('受阻','[2]【通过】新测试词查询0条，“未找到相关结果/请调整筛选条件后重试”，条件保留，重置恢复86条。\n[1、3]【受阻】固定池86条，无首次无筛选0条及清空后无筛选0条切换；未删除原记录凑空态。',
    '可切换首次空列表与清空成功后total=0的无筛选响应样例，及有新增权限的展示状态；不需要第三套固定文案。',
    'B14 B15 B48'),
35:('受阻','【前置补测】有效目的地、日期、收件人、电话、重量提交后校验错误0，保存loading，随后“保存成功”回列表。\n[1–3]【受阻】这只是成功Mock；未触发提交403，不能推断失败Toast、保留输入、解除loading或恢复重试。',
    'submitForm可控的403拒绝与恢复允许响应切换及其触发入口；有效输入已验证，不再列为缺口。',
    'B27 B28 B29 B48'),
36:('受阻','[1]【部分通过】普通480/大640、圆角16，短内容高189.42；取消左确认右，两例无输入字段。\n[2–4]【受阻】普通确认立即关闭并Toast提交成功，无持续loading、失败或长内容样例；未验证提交中的遮罩/重复点击。',
    '带长内容/输入的弹窗、可持续confirm-loading及失败→成功切换；能核对重复触发和失败后输入保留的样例。',
    'B31 B32 B33 B48'),
38:('受阻','[1–2]【通过】测试PDF进度可见，0%取消移除；同文件重传完成，仅1个同名对象。\n[3]【部分实测】真实失败文件有原因/重试；重试20%后再次失败。预置异常凭证重试仅去掉错误，无File；含“失败”文件恒reject，不能替代成功恢复。',
    '同一带File对象的失败→重试成功响应切换；不能改名/换新文件冒充同一失败任务恢复。',
    'B34 B35 B36 B37 B38 B39 B40 B41 B42 B48'),
39:('受阻','【基线核实】列表正常初始化仍为86条。源码getList直接调用固定300ms成功Mock，没有初始化403切换。\n[1–4]【受阻】未进入由初始化响应触发的无权限页，也未执行403→允许恢复；直接/403展示不能替代。',
    '页面初始化getList可控403与恢复允许的响应样例、触发入口及调用/响应过程证据。',
    'B01 B15 B48'),
}
assert set(records)==set(scope)
edits={}
def add(sheet,cell,value):
    if book[sheet][cell].value!=value: edits[(sheet,cell)]={'sheet':sheet,'cell':cell,'value':value}

for c in cases:
    n=int(c['id'][-3:]);c['previousStatus']=c['status'];c['previousResult']=c['result'];c['inCurrentScope']=n in scope
    if n not in scope: continue
    status,body,missing,ev=records[n]
    c.update({'status':status,'remainingConditions':missing,'currentEvidence':ev.split(),'secondMode':'本轮受阻用例核实','secondAudit':body+'\n缺少条件：'+missing})
    c['result']=f'2026-10-14受阻核实｜本地dev/Mock｜{c["route"]}\n{body}\n'+('范围：' if status=='通过' else '缺少条件：')+missing+'\n本轮证据：'+'、'.join(ev.split())+'；见配套报告。'
    c['reason']='当前固定300ms样例已覆盖骨架、加载中关闭、迟到响应与关闭上下文，撤销慢加载受阻。' if n==11 else '已实测或核实当前可执行范围，剩余条件具体列出；未将部分步骤充作整条通过。'
    c['evidence']=list(dict.fromkeys(c['evidence']+ev.split()))
    add('通用模板UI与交互用例',f'I{n+1}',c['result']);add('通用模板UI与交互用例',f'H{n+1}',status)
    indexrow=142+n
    add('范围与依据',f'D{indexrow}',body)
    add('范围与依据',f'F{indexrow}',status)
    add('范围与依据',f'G{indexrow}',missing)
    add('范围与依据',f'H{indexrow}','本轮：'+'、'.join(ev.split())+'\n前轮记录保留在配套报告')
    for r in book['修改清单']:
        if r[0].value==f'B{n:03}':
            row=r[0].row
            add('修改清单',f'F{row}',body)
            add('修改清单',f'G{row}',missing)
            add('修改清单',f'J{row}','本轮：'+'、'.join(ev.split()))
            if n==11:
                add('修改清单',f'B{row}','执行条件已核实')
                add('修改清单',f'K{row}','复测通过')
            break

add('通用模板UI与交互用例','J1','人工二次复核')
g=book['通用模板UI与交互用例']['G12'].value
g=re.sub(r'【准入状态】[^\n]*','【准入状态】当前固定300ms Mock可进入加载并关闭，已完成本条本地验证。',g)
g=re.sub(r'【全面复核】[^\n]*','【全面复核】2026-10-14续测：末尾滚动/三种关闭/骨架及加载中关闭、迟到响应均已取证，改为通过。',g)
add('通用模板UI与交互用例','G12',g)
add('范围与依据','A5','本轮逐条核实原受阻16条：011改通过，其余15条保留受阻并写明已测步骤与具体缺少条件。通用40条汇总：通过13、不通过12、受阻15。新增J列人工二次复核，40行留空；业务76条保持原样。')
add('范围与依据','A10','本地dev/Mock；本轮范围为原受阻16条，能执行的步骤已续测，未切换源码或把普通成功当403/失败恢复。011使用当前固定300ms Mock验证骨架及关闭。J列人工二次复核留空，由人工填结论、复核人、日期与意见；程序结果及缺少条件在I列。')
add('范围与依据','A141','本轮仅续测/核实原受阻16条，011从受阻改通过；其他15条保留受阻，缺少条件按运行入口、响应样例或批准策略分别写清。新增B编号证据；A为二次复核，V/S为10/14首轮，E/R为10/13历史。人工列未代填。')

# Evidence support only; this is data preparation, not spreadsheet authoring.
for f in (P/'evidence').iterdir():
    if f.is_file():shutil.copy2(f,OUT/'evidence'/f.name)
for dirname in ['sources','historical-20261013']:
    (OUT/dirname).mkdir(exist_ok=True)
    for f in (P/dirname).iterdir():
        if f.is_file():shutil.copy2(f,OUT/dirname/f.name)
source_paths=['src/mock/index.ts','src/api/demo.ts','src/views/demo/composables/useWaybillListPage.ts','src/views/components/sections/ModalSection.vue','src/views/components/sections/UploadSection.vue','src/core/components/form/ByUpload/ByUpload.vue','public/env.js','public/config.js']
source_meta=[]
for p in source_paths:
    file=Path('./pcs-front')/p
    source_meta.append({'path':p,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
facts={'method':'本轮只读源码核对，不代替页面响应执行','files':source_meta,'facts':{'demo':'getList/getDrawerDetail/submitForm直接调用Mock；固定300ms resolve，无403/失败控制入口','data':'固定池86条，重量1.2+seed%20*0.7，金额88+seed%50*23.5，短目的地和固定备注；不含null/空串/真实0/长文','delete':'批量删除示例仅成功提示、清空选择并重新getList，未提供无筛选清空到0条的fixture；本轮未执行删除','assistant':'public dev配置aiEnabled/aiAssistantEnabled为false；已核对对应页面无入口','modal':'onConfirm直接关闭并成功Toast，无持续提交或失败/输入样例','upload':'文件名含失败恒reject；retryFile缺File时只将预置条目状态设init；真实同File失败→成功切换未提供'}}
(OUT/'evidence/B48-source-boundaries.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2),encoding='utf-8')
config={'work':str(W),'out':str(OUT),'source':str(SRC),'destination':str(DEST),'expectedCounts':{'通过':13,'不通过':12,'受阻':15},'expectedStatusChanges':1,'second':True,'third':True,'manualColumn':{'sheet':'通用模板UI与交互用例','tableName':'TemplateUICases','range':'A1:J41','header':'人工二次复核','width':45},'auditScopeIds':[f'UI-TPL-{n:03}' for n in scope]}
(ROOT/'third-config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf-8')
(W/'edits.json').write_text(json.dumps(list(edits.values()),ensure_ascii=False,indent=2),encoding='utf-8')
(W/'cases.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'本轮16条核实索引.json').write_text(json.dumps([c for c in cases if c['inCurrentScope']],ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cases':40,'currentScope':len(scope),'counts':dict(Counter(c['status'] for c in cases)),'edits':len(edits),'manualColumn':'J1/J2:J41留空'},ensure_ascii=False))
