import hashlib
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

WORKSPACE = Path('.')
ROOT = WORKSPACE / 'outputs/ui-audit-20261014'
OUT = ROOT / 'weekly-plan-20261014'
AUDIT = ROOT / '20261014-ui-audit'
NAME = 'SN318_W2本周工作清单与推进安排_20261014'
URL = 'https://example.invalid/source/7cdefbaffe'

schedule = json.loads((OUT / 'sources/schedule-live.json').read_text(encoding='utf-8'))
phase = json.loads((OUT / 'sources/phase-consensus-live.json').read_text(encoding='utf-8'))
assert not schedule['has_more'] and not phase['has_more']
area = schedule['ranges'][0]
assert area['actual_range'] == 'A1:Z125' and not area['truncated']
rows = {i: {col: cell.get('value') for col,cell in zip(area['col_indices'], row)}
        for i,row in zip(area['row_indices'], area['cells'])}
packages = [r for r in rows.values() if r.get('J') == 'UI/开']
assert rows[3]['J'] == '10/12' and rows[4]['J'] == '10/16'
assert len(packages) == 38
assert sum(r['F']=='P0' for r in packages) == 24
assert sum(r['F']=='P1' for r in packages) == 14
run = json.loads((AUDIT / '审查记录.json').read_text(encoding='utf-8'))
assert len(run['packages']) == 38
assert len(run['cases']) == 65

sources = [
    ('S1', '飞书排期周视图与阶段共识', URL,
     f'2026-10-14只读核对，修订号{schedule["revision"]}；周视图J列W2，A1:Z125；阶段共识A1:T35。'),
    ('S2', '10月13日用例修订与工作包映射',
     str(WORKSPACE / 'outputs/w2-tasks/20261013/PCS_W2前端测试用例_飞书与页面复核修订.xlsx'),
     '用于概述已完成的用例细化、范围校准和38项映射。'),
    ('S3', '10月14日受阻16条核实与人工复核原表',
     str(WORKSPACE / 'outputs/template-reaudit/受阻16条核实/SN318_W2_UI与交互测试用例_16条受阻核实_含人工二次复核.xlsx'),
     '保留历史执行及人工二次复核内容。'),
    ('S4', '10月14日dev/Mock审查工作簿与证据报告',
     str(AUDIT / 'SN318_W2_UI与交互_20261014_dev_b2efcdb_dirty-5c6bc530.xlsx'),
     '对应审查记录、修改建议、验收标准和证据；本周后续在新轮次追加复测。'),
]

# One canonical content tree is used for both the PDF and Markdown.
pages = [
    {
        'title': '本周目标与当前进展',
        'intro': '完成前端页面UI规范审查和修改清单输出；本周随页面交付介入UI与交互测试，跟进整改、补测和复测，形成可交接的覆盖与遗留事项清单。',
        'sections': [
            {'heading':'W2工作范围', 'paragraphs':[
                '排期周期为2026年10月12日至16日。W2的“UI/开”表示UI设计与开发并行；已交付页面即可开展审查。执行顺序为已交付P0工作包、影响多页的公共问题，再到P1及专项场景。工作包优先级与缺陷等级分别记录。'
            ], 'after':[
                    '范围合计38项（P0 24项、P1 14项）：服务管理10项、价格维护18项、基础配置9项、操作日志1项。本周仍标“需”的项目只做需求及判据准备。'
                ]},
            {'heading':'10月13日至14日已开展的工作', 'table': {
                'headers':['时间','已完成的工作与产出'],
                'widths':[0.17,0.83],
                'rows':[
                    ['10/13','梳理W2的38个工作包；细化并修订用例，对齐规范、部分页面与业务字段，保留原执行记录及修订原因。'],
                    ['10/14','逐条核实16条受阻用例，并保留人工二次复核栏；对通用模板和已交付基础配置页面开展新一轮UI/交互审查，输出修改清单、验收标准及证据。'],
                ]}, 'after':[
                    '当前有部分业务页面证据的工作包为费用项、币种与汇率、业务字典（W2-50/51/56）；其余35项未取得本轮对应业务入口。部分页面证据不代表工作包全部通过。'
                ]},
            {'heading':'本周推进节奏', 'table': {
                'headers':['窗口 / 触发条件','工作安排'],
                'widths':[0.30,0.70],
                'rows':[
                    ['周初准备至10/14','规范和工作包对齐、用例准备、已交付页面首轮审查；已有产出继续补齐范围与依据。'],
                    ['本周余下时间（建议窗口）','优先补当前可测项、对齐修改清单与产品口径；新业务入口交付后，按P0、P1顺序介入。'],
                    ['样例或修复版本交付后','逐条补测受阻分支、复测已修问题，追加本轮结果及证据。'],
                    ['W2结束时（10/16）','汇总实际覆盖、问题处理情况、未执行及受阻项，明确下一批交付条件。'],
                ]}, 'after':[
                    '以上为本周建议安排，按实际交付调整；原排期未给出逐日提测承诺，不套用其他阶段的固定提测日。'
                ]},
        ]
    },
    {
        'title': '本周待办清单',
        'intro': '以已有审查成果为起点，完成当前可测内容；对需新入口、样例或产品裁决的事项，写明条件后持续跟进。',
        'sections':[
            {'heading':'01  公共模板与组件规范走查', 'state':'已有首轮，继续补齐', 'paragraphs':[
                '检查/demo/list、表单和组件示例的布局、按钮、表格、响应式及状态反馈。优先跟进R06 Tablet表单双列、R07查询按钮加载状态。',
                '产出与判据：公共UI问题清单及复测点；每项有规范定位、差异、修改建议、验收标准和证据。'
            ]},
            {'heading':'02  已交付业务页面UI与交互测试', 'state':'部分完成，继续覆盖', 'paragraphs':[
                '继续检查费用项、币种与汇率、业务字典等页面的查询、重置、空态、表单及关联详情。优先跟进R09无结果空态，补齐滚动、关闭路径与状态证据。',
                '产出与判据：逐页执行记录与证据；步骤与预期对应，失败、受阻和未执行分别记录。'
            ]},
            {'heading':'03  W2业务工作包按交付介入', 'state':'随新页面交付开展', 'paragraphs':[
                '核对38项的入口、角色、运行版本、PRD/设计依据和样例。页面可测后先执行已交付P0，再执行P1；服务管理、价格维护等专项页面分别检查。',
                '产出与判据：38项覆盖台账均有状态、关联用例、缺条件和下一步；未取得入口的保留未执行。'
            ]},
            {'heading':'04  修改清单与产品、前端协作', 'state':'清单已输出，待对齐处理', 'paragraphs':[
                '区分已证实差异、待裁决项与执行条件缺口，优先跟进P1问题。刷新登录（R08）、费用项字段与汇率维护口径（D01/D02）先取得明确结论。',
                '产出与判据：可交开发处理的修改清单；补齐复现、影响、建议、验收标准及处理状态、责任归属和修复版本。'
            ]},
            {'heading':'05  受阻项补测与人工二次复核', 'state':'能测先补，缺条件逐条跟进', 'paragraphs':[
                '当前能测的继续执行；逐条跟进受控超时/500/403与恢复、边界数据、上传重试样例及未保存/移动端等策略，写明每条已测步骤和剩余条件。',
                '产出与判据：受阻清单与补测记录；原执行及人工意见保留，新人工栏由人工填写，模型结果另列。'
            ]},
            {'heading':'06  整改复测与周内汇总', 'state':'修复版本交付后执行，W2结束时收口', 'paragraphs':[
                '按修复版本复测原问题及相邻状态；公共组件修改覆盖关联页面。W2结束时整理已审页面、已关闭问题、遗留差异、受阻条件和下周承接项。',
                '产出与判据：复测记录与周内摘要；实际复测通过才关闭问题，遗留项注明下一次触发条件。'
            ]},
        ]
    },
    {
        'title':'协作条件与本周交付',
        'intro':'本周重点是及时发现界面问题、形成可执行修改清单，并随交付持续验证。下列条件用于安排后续工作，不预设页面已全部交付。',
        'sections':[
            {'heading':'需要协作补齐的条件', 'bullets':[
                    '产品 / 设计：确认争议口径、Mock会话及上传策略，补齐专项入口与状态设计，结论同步到需求或设计依据。',
                    '前端 / 开发：提供可测入口、角色、版本及样例；整改后提供修复版本和影响范围。',
                    '测试 / 人工复核：继续执行、补证、复测；已有人工意见保留，人工补录复核结论、姓名、日期及意见。'
                ], 'after':[
                    '具体事项责任归属及处理时间在对齐后补录；本清单不新增人员承诺。'
                ]},
            {'heading':'W2结束时应交付的材料', 'bullets':[
                'UI审查与修改清单：依据、差异、复现、修改建议、验收标准、影响与处理状态、证据齐全。',
                '执行与覆盖台账：38项均可追踪；已执行到步骤和页面，受阻及未执行写清条件。',
                '补测与复测证据：绑定时间、环境/版本、动作和结果；保留历史记录及人工意见，追加新轮次。',
                '本周进展摘要：13日至14日工作、后续完成量、已关闭及遗留问题、所需条件和下周承接项。'
            ]},
            {'heading':'完成口径', 'paragraphs':[
                '周内收口以材料完整、覆盖真实、下一步明确为准。正式业务测试准出另需适用用例执行完成、缺陷按约定收敛、回归通过及测试报告。',
                '现有结果来自本地dev/Mock，10/14基线为b2efcdb、dirty指纹5c6bc530；后续版本另记。真实接口、权限及业务验收需对应环境验证。',
                '本版仅重整安排；既有工作簿及原执行、人工复核内容保持原样。'
            ]},
            {'heading':'参考资料', 'sources':sources},
        ]
    }
]

for label,title,path,note in sources:
    if not path.startswith('https://'):
        assert Path(path).is_file(), path
assert sum(1 for r in packages if r['C']=='服务管理') == 10
assert sum(1 for r in packages if r['C']=='价格维护') == 18
for category in ['服务管理','价格维护','基础配置']:
    print(category, {p:sum(r['F']==p and r['C']==category for r in packages) for p in ['P0','P1']})

# Markdown export.
md = [f'# SN318 W2本周工作清单与推进安排', '',
      '**周期：2026-10-12至2026-10-16｜整理日期：2026-10-14｜进展截至10/14审查记录**', '',
      '排期已于10/14核对；余下安排为建议窗口，按实际交付推进。', '']
for page in pages:
    md += ['## '+page['title'],'',page['intro'],'']
    for sec in page['sections']:
        md += ['### '+sec['heading'],'']
        if 'state' in sec:
            md += ['**当前状态：'+sec['state']+'。**','']
        for para in sec.get('paragraphs',[]):
            md += [para,'']
        if 'table' in sec:
            table = sec['table']
            md += ['| '+' | '.join(table['headers'])+' |', '| '+' | '.join(['---']*len(table['headers']))+' |']
            md += ['| '+' | '.join(row)+' |' for row in table['rows']]
            md += ['']
        if 'bullets' in sec:
            md += ['- '+b for b in sec['bullets']] + ['']
        for para in sec.get('after',[]):
            md += [para,'']
        for label,title,path,note in sec.get('sources',[]):
            md += [f'- {label} [{title}](<{path}>)：{note}']
        if 'sources' in sec:
            md += ['']
(OUT / (NAME+'.md')).write_text('\n'.join(md),encoding='utf-8')

# Embedded Chinese fonts; no dependency on the recipient's installed fonts.
pdfmetrics.registerFont(TTFont('PlanBody','C:/Windows/Fonts/msyh.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('PlanBold','C:/Windows/Fonts/msyhbd.ttc',subfontIndex=0))
pdfmetrics.registerFontFamily('PlanBody',normal='PlanBody',bold='PlanBold',italic='PlanBody',boldItalic='PlanBold')
NAVY = colors.HexColor('#12344D')
BLUE = colors.HexColor('#236C92')
TEXT = colors.HexColor('#263644')
GRAY = colors.HexColor('#586775')
LINE = colors.HexColor('#D5E1E9')
LIGHT = colors.HexColor('#F1F6FA')
styles = {
    'title':ParagraphStyle('title',fontName='PlanBold',fontSize=21,leading=29,textColor=NAVY,spaceAfter=10),
    'page':ParagraphStyle('page',fontName='PlanBold',fontSize=16,leading=23,textColor=NAVY,spaceAfter=10),
    'meta':ParagraphStyle('meta',fontName='PlanBody',fontSize=9,leading=14,textColor=GRAY,spaceAfter=9),
    'h':ParagraphStyle('h',fontName='PlanBold',fontSize=11.8,leading=17,textColor=NAVY,spaceBefore=9,spaceAfter=5),
    'body':ParagraphStyle('body',fontName='PlanBody',fontSize=10.2,leading=15.5,textColor=TEXT,spaceAfter=5,wordWrap='CJK'),
    'small':ParagraphStyle('small',fontName='PlanBody',fontSize=9,leading=14,textColor=GRAY,spaceAfter=5,wordWrap='CJK'),
    'cell':ParagraphStyle('cell',fontName='PlanBody',fontSize=9.2,leading=14.5,textColor=TEXT,wordWrap='CJK'),
    'th':ParagraphStyle('th',fontName='PlanBold',fontSize=9.2,leading=14,textColor=colors.white,wordWrap='CJK'),
    'state':ParagraphStyle('state',fontName='PlanBold',fontSize=9,leading=14,textColor=BLUE,spaceAfter=4),
}
def p(text,style='body'):
    return Paragraph(escape(text),styles[style])
def make_table(table):
    widths = [w*499.28 for w in table['widths']]
    data = [[p(s,'th') for s in table['headers']]]+[[p(s,'cell') for s in row] for row in table['rows']]
    tab = Table(data,colWidths=widths,hAlign='LEFT',repeatRows=1)
    tab.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAVY),('VALIGN',(0,0),(-1,-1),'TOP'),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[LIGHT,colors.white]),
        ('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('LINEBELOW',(0,1),(-1,-1),0.35,LINE),
    ]))
    return tab

story=[]
for index,page in enumerate(pages):
    if index:
        story += [PageBreak(),p(f'{index+1:02d}  '+page['title'],'page')]
    else:
        story += [p('SN318 W2本周工作清单与推进安排','title'),p('2026-10-12至10-16  |  整理：2026-10-14  |  进展截至10/14审查记录','meta')]
    story += [p(page['intro'])]
    for sec in page['sections']:
        group=[p(sec['heading'],'h')]
        if 'state' in sec:
            group += [p('当前状态：'+sec['state'],'state')]
        for para in sec.get('paragraphs',[]):
            group += [p(para)]
        if 'table' in sec:
            group += [make_table(sec['table']),Spacer(1,5)]
        for bullet in sec.get('bullets',[]):
            group += [p('• '+bullet)]
        for para in sec.get('after',[]):
            group += [p(para,'small')]
        for label,title,path,note in sec.get('sources',[]):
            if path.startswith('https://'):
                target=path
            else:
                target=Path(path).as_uri()
            group += [Paragraph(f'<font color="#236C92"><link href="{escape(target)}">{label} {escape(title)}</link></font>：{escape(note)}',styles['small'])]
        # Keep task cards together; other sections can be split if needed.
        story += [KeepTogether(group)] if 'state' in sec else group

def decorate(canvas,doc):
    canvas.saveState()
    w,h=A4
    canvas.setStrokeColor(LINE)
    canvas.line(48,h-33,w-48,h-33)
    canvas.setFont('PlanBody',8)
    canvas.setFillColor(GRAY)
    canvas.drawString(48,h-25,'SN318  |  W2工作清单与推进安排')
    canvas.line(48,38,w-48,38)
    canvas.drawString(48,24,'W2 UI/开发并行  ·  随实际交付推进  ·  排期rev988')
    canvas.drawRightString(w-48,24,str(doc.page))
    canvas.restoreState()

pdf_path=OUT/(NAME+'.pdf')
doc=SimpleDocTemplate(str(pdf_path),pagesize=A4,leftMargin=48,rightMargin=48,topMargin=47,bottomMargin=49,
                      title='SN318 W2本周工作清单与推进安排',author='SN318工作清单整理',subject='W2前端UI审查与交互测试工作安排')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)

from pypdf import PdfReader
reader=PdfReader(str(pdf_path))
texts=[page.extract_text() for page in reader.pages]
assert len(reader.pages)==3, f'Expected 3 pages, got {len(reader.pages)}'
assert all(len(t)>300 for t in texts)
for page in pages:
    for sec in page['sections']:
        assert sec['heading'].replace(' ','') in ''.join(texts).replace(' ','').replace('\n',''),sec['heading']

manifest={
    'type':'weekly_work_plan','week':'W2','start':'2026-10-12','end':'2026-10-16',
    'compiled_at':'2026-10-14','schedule_revision':schedule['revision'],
    'scope_counts':{'all':38,'P0':24,'P1':14},'audit_run_id':run['run_id'],
    'page_count':len(reader.pages),'canonical_content_shared':True,'new_ui_execution':False,
    'sources':[{'id':label,'title':title,'path':path,'note':note,
                'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest() if not path.startswith('https://') else None}
               for label,title,path,note in sources],
    'outputs':{suffix:{'path':str(OUT/(NAME+suffix)),'sha256':hashlib.sha256((OUT/(NAME+suffix)).read_bytes()).hexdigest()}
               for suffix in ['.pdf','.md']},
}
(OUT/'sources/编制与校验记录.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'sources/工作清单内容.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'outputs':[str(OUT/(NAME+s)) for s in ['.pdf','.md']],'pages':len(reader.pages),'page_chars':[len(t) for t in texts]},ensure_ascii=False))
