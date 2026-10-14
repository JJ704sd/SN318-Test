import hashlib
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from pypdf import PdfReader

OUT = Path('./artifacts/ui-audit-20261014/weekly-plan-20261014')
BASE = 'SN318_W2本周工作清单与推进安排_20261014'
AUDIT = OUT.parent / '20261014-ui-audit'
manifest_path = OUT / 'sources/编制与校验记录.json'
original = json.loads(manifest_path.read_text(encoding='utf-8'))
history = OUT / '历史版本/精简前_3页版'
history.mkdir(parents=True,exist_ok=True)
for rel in [BASE+'.pdf',BASE+'.md','sources/编制与校验记录.json','sources/工作清单内容.json','sources/最终交付校验.json']:
    source = OUT / rel
    target = history / rel
    if source.is_file() and not target.exists():
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(source.read_bytes())

title = 'SN318本周工作简报'
meta = '10月13日至14日工作回顾  |  W2剩余时间安排（10月15日至16日）'
sections = [
    {'heading':'这两天做了什么','items':[
        '10/13：按W2排期梳理38项工作包，细化并修订UI与交互测试用例，核对UI规范及已交付页面。',
        '10/14：复核通用模板和16条受阻用例；审查费用项、币种与汇率、业务字典等页面，输出修改清单、验收标准及证据，保留原执行记录和人工二次复核内容。'
    ]},
    {'heading':'本周剩余时间怎么安排','items':[
        '优先补齐当前可测的UI与交互检查，跟进表单响应式、查询加载、筛选无结果空态等公共问题，与产品、前端对齐修改清单。',
        '随新页面、样例及修复版本交付，按排期优先级补充业务页面测试，完成相应补测和整改复测，追加结果与证据。',
        '10/16汇总已测页面、问题处理及复测进展、剩余受阻项和下周承接事项，更新工作清单。'
    ]},
    {'heading':'文件怎么用','table':{
        'headers':['文件','用途'],
        'rows':[
            ['汇报PDF / MD','PDF用于直接转发；MD用于复制到飞书或继续编辑。'],
            ['当前审查表','“修改清单”看问题、建议和验收标准；用例页看执行及证据。'],
            ['受阻复核原表','追溯16条核实及历史记录，填写“人工二次复核”。'],
            ['审查报告 / 证据包','查看截图与操作记录，供开发定位和复测核对。']
        ]}}
]
note = '当前为本地dev/Mock前端检查；业务页面按实际交付持续介入。'
url = original['sources'][0]['path']
source_note = '参考W2排期（10/12至10/16，10/14已核对）；具体测试与复测随交付推进。'
canonical={'title':title,'meta':meta,'sections':sections,'note':note,'source_note':source_note,'source_url':url}

md = ['# '+title,'','**'+meta+'**','']
for sec in sections:
    md += ['## '+sec['heading'],'']
    if 'items' in sec:
        md += [f'{i}. {item}' for i,item in enumerate(sec['items'],1)]+['']
    else:
        table=sec['table']
        md += ['| '+' | '.join(table['headers'])+' |','| --- | --- |']
        md += ['| '+' | '.join(row)+' |' for row in table['rows']]+['']
md += [note,'',f'参考：[W2排期]({url})（10/12至10/16，10/14已核对）；具体测试与复测随交付推进。','']
(OUT/(BASE+'.md')).write_text('\n'.join(md),encoding='utf-8')

current = Path(next(s['path'] for s in original['sources'] if s['id']=='S4'))
review = Path(next(s['path'] for s in original['sources'] if s['id']=='S3'))
report = AUDIT/'审查报告.html'
evidence = AUDIT/'SN318_W2_UI审查_20261014_证据包.zip'
assert all(p.is_file() for p in [current,review,report,evidence])
link = lambda label,path: f'[{label}](<{Path(path).as_posix()}>)'
guide = [
    '# SN318文件使用说明','',
    '## 汇报给小年姐','',
    f'- 直接发送{link("一页PDF",OUT/(BASE+".pdf"))}，内容为两天工作回顾、本周剩余安排和简短文件说明。',
    f'- 需要粘贴到飞书或修改文字时使用{link("MD正文",OUT/(BASE+".md"))}；两份正文一致，修改后应同步重新生成PDF。','',
    '## 跟进整改与复测','',
    f'主要使用{link(current.name,current)}：','',
    '- “修改清单”：查看实际问题、修改建议、验收标准和对应证据，跟进处理状态。',
    '- “通用模板UI与交互用例”：查看模板、组件的原执行及本轮结果。',
    '- “业务UI与交互用例”：查看已交付业务页面的执行、待补测及证据；未执行项保留原状态。',
    '- “范围与依据”：确认工作包范围、来源、环境及页面覆盖。','',
    '收到修复版本后按原用例复测，追加本轮结果、版本与证据；实际复测通过后再关闭问题。','',
    '## 追溯受阻核实与人工复核','',
    f'使用{link(review.name,review)}查看16条受阻用例逐条核实的历史过程；人工在“人工二次复核”栏填写结论、复核人、日期和意见。原执行和已有人工意见保留，新一轮结果另记。该表属于历史复核版本，当前整改以本轮审查表为主。','',
    '## 查看与转交证据','',
    f'- {link("审查报告",report)}：查看图文说明、问题与证据索引。',
    f'- {link(evidence.name,evidence)}：既有交付快照，包含工作簿、报告、审查记录及证据目录；解压后打开报告，保留目录结构。',
    '- 开发协作时提供当前审查表及证据包；需要核对旧结论时再附受阻复核原表。','',
    '本次只精简并同步更新PDF、MD，原审查工作簿与证据包保持原样。精简前的三页版已存入本目录“历史版本”；后续按新页面或修复版本补测、复测并追加记录。',''
]
(OUT/'文件使用说明.md').write_text('\n'.join(guide),encoding='utf-8')

pdfmetrics.registerFont(TTFont('BriefBody','C:/Windows/Fonts/msyh.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('BriefBold','C:/Windows/Fonts/msyhbd.ttc',subfontIndex=0))
pdfmetrics.registerFontFamily('BriefBody',normal='BriefBody',bold='BriefBold')
navy=colors.HexColor('#12344D')
gray=colors.HexColor('#586775')
line=colors.HexColor('#D5E1E9')
styles={
    'title':ParagraphStyle('title',fontName='BriefBold',fontSize=21,leading=29,textColor=navy,spaceAfter=9),
    'meta':ParagraphStyle('meta',fontName='BriefBody',fontSize=9.3,leading=15,textColor=gray,spaceAfter=10),
    'h':ParagraphStyle('h',fontName='BriefBold',fontSize=12,leading=18,textColor=navy,spaceBefore=13,spaceAfter=8),
    'body':ParagraphStyle('body',fontName='BriefBody',fontSize=10.8,leading=18,textColor=colors.HexColor('#263644'),spaceAfter=8,wordWrap='CJK'),
    'cell':ParagraphStyle('cell',fontName='BriefBody',fontSize=10,leading=16,textColor=colors.HexColor('#263644'),wordWrap='CJK'),
    'th':ParagraphStyle('th',fontName='BriefBold',fontSize=10,leading=16,textColor=colors.white),
    'note':ParagraphStyle('note',fontName='BriefBody',fontSize=9,leading=14,textColor=gray,spaceBefore=9,spaceAfter=2,wordWrap='CJK')
}
p=lambda text,style='body':Paragraph(escape(text),styles[style])
story=[p(title,'title'),p(meta,'meta')]
for sec in sections:
    story += [p(sec['heading'],'h')]
    if 'items' in sec:
        for i,item in enumerate(sec['items'],1):
            story += [p(f'{i}. {item}')]
    else:
        table=sec['table']
        cells=[[p(s,'th') for s in table['headers']]]+[[p(s,'cell') for s in row] for row in table['rows']]
        tab=Table(cells,colWidths=[122,377.28],hAlign='LEFT')
        tab.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F1F6FA'),colors.white]),
            ('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),
            ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
            ('LINEBELOW',(0,1),(-1,-1),0.35,line)
        ]))
        story += [tab]
story += [p(note,'note'),Paragraph(f'参考<link href="{url}" color="#236C92">W2排期</link>（10/12至10/16，10/14已核对）；具体测试与复测随交付推进。',styles['note'])]
def decorate(canvas,doc):
    canvas.saveState()
    canvas.setStrokeColor(line)
    canvas.line(48,38,A4[0]-48,38)
    canvas.setFont('BriefBody',8)
    canvas.setFillColor(gray)
    canvas.drawString(48,24,'SN318  |  本周工作简报  |  2026-10-14')
    canvas.drawRightString(A4[0]-48,24,str(doc.page))
    canvas.restoreState()
pdf_path=OUT/(BASE+'.pdf')
doc=SimpleDocTemplate(str(pdf_path),pagesize=A4,leftMargin=48,rightMargin=48,topMargin=43,bottomMargin=49,
                      title=title,author='SN318工作简报整理',subject='两日工作回顾与W2剩余安排')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
pdf=PdfReader(str(pdf_path))
assert len(pdf.pages)==1, f'Expected 1 page, got {len(pdf.pages)}'
assert len(pdf.pages[0].extract_text())>500

manifest=dict(original)
manifest.update({'page_count':1,'version':'精简版','canonical_content_shared':True,'new_ui_execution':False,
    'outputs':{suffix:{'path':str(OUT/(BASE+suffix)), 'sha256':hashlib.sha256((OUT/(BASE+suffix)).read_bytes()).hexdigest()}
               for suffix in ['.pdf','.md']},
    'usage_guide':{'path':str(OUT/'文件使用说明.md'),'sha256':hashlib.sha256((OUT/'文件使用说明.md').read_bytes()).hexdigest()}})
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'sources/工作清单内容.json').write_text(json.dumps(canonical,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pages':1,'characters':len(pdf.pages[0].extract_text()),'updated':[str(OUT/(BASE+s)) for s in ['.pdf','.md']],'usage':str(OUT/'文件使用说明.md')},ensure_ascii=False))
