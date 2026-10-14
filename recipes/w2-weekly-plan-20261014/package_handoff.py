import hashlib
import json
import re
import zipfile
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

ROOT = Path('./artifacts/ui-audit-20261014')
PLAN = ROOT/'weekly-plan-20261014'
RUN = ROOT/'20261014-ui-audit'
NAME = 'SN318_W2本周工作清单与推进安排_20261014'
STAGE = Path('./recipes/w2-handoff-package-20261014/staging')
ZIP_PATH = PLAN/'SN318_本周工作简报与测试材料_发小年姐_20261014.zip'
manifest = json.loads((PLAN/'sources/编制与校验记录.json').read_text(encoding='utf-8'))
current = Path(next(s['path'] for s in manifest['sources'] if s['id']=='S4'))
previous = Path(next(s['path'] for s in manifest['sources'] if s['id']=='S3'))
OLD = previous.parent
CURRENT_REL = Path('01_本轮审查')
OLD_REL = Path('02_受阻复核')
at = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
STAGE.mkdir(parents=True,exist_ok=True)

source_hashes = {}
def sha(data):return hashlib.sha256(data).hexdigest()
def write(rel,data):
    target = STAGE/rel
    assert target.resolve().is_relative_to(STAGE.resolve())
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(data)
    return target
def copy(source,rel):
    data = source.read_bytes()
    source_hashes[source] = sha(data)
    return write(rel,data)
def copy_tree(source,rel):
    assert source.is_dir(),source
    for file in sorted(source.rglob('*')):
        if file.is_file():
            assert not file.is_symlink(),file
            assert not file.name.startswith('~$'),file
            copy(file,rel/file.relative_to(source))

for ext in ['.pdf','.md']:
    data=(PLAN/(NAME+ext)).read_bytes()
    assert sha(data)==manifest['outputs'][ext]['sha256']
    copy(PLAN/(NAME+ext),Path(NAME+ext))

# Copy the original workbooks byte for byte, together with the directories
# used by their corresponding evidence reports. No XLSX authoring occurs.
copy(current,CURRENT_REL/current.name)
copy(previous,OLD_REL/previous.name)
for folder in ['evidence','historical','sources']:
    copy_tree(RUN/folder,CURRENT_REL/folder)
for file in ['审查报告.html','审查记录.json','历史证据索引.json']:
    copy(RUN/file,CURRENT_REL/file)
for folder in ['evidence','historical-20261013','sources']:
    copy_tree(OLD/folder,OLD_REL/folder)
for file in ['复核证据.html','复核索引.json','本轮16条核实索引.json']:
    copy(OLD/file,OLD_REL/file)
for file in ['schedule-live.json','phase-consensus-live.json']:
    copy(PLAN/'sources'/file,Path('03_排期参考')/file)

# Preserve the historical validation record and report a new hash for the
# exact workbook distributed in this package. Historical UI claims stay dated.
validation_original = (RUN/'交付校验.json').read_bytes()
copy(RUN/'交付校验.json',CURRENT_REL/'交付校验_原记录.json')
validation = json.loads(validation_original)
validation['original_output_sha256'] = validation.get('output_sha256')
validation['output_sha256'] = sha((STAGE/CURRENT_REL/current.name).read_bytes())
validation['original_validation_record'] = '交付校验_原记录.json'
validation['packaging_checked_at'] = at
validation['packaging_note'] = '仅核对本包工作簿文件摘要；其余字段保留原交付校验记录，不表示本次重新执行UI测试或工作簿内容校验。'
write(CURRENT_REL/'交付校验.json',json.dumps(validation,ensure_ascii=False,indent=2).encode('utf-8'))

link=lambda label,path:f'[{label}](<{path.as_posix()}>)'
guide = [
    '# SN318文件使用说明','',
    '请先完整解压ZIP，再打开文件；保留各目录结构，报告中的截图和证据链接可直接使用。','',
    '## 先看本周简报','',
    f'- {link("一页PDF",Path(NAME+".pdf"))}：可直接转发小年姐，主要写10/13至10/14做了什么、10/15至10/16怎么推进。',
    f'- {link("MD正文",Path(NAME+".md"))}：与PDF正文一致，可复制到飞书或继续编辑；修改后同步更新PDF。','',
    '## 跟进本轮整改与复测','',
    f'主要使用{link(current.name,CURRENT_REL/current.name)}：','',
    '- “修改清单”：看实际问题、修改建议、验收标准和证据，跟进处理状态。',
    '- “通用模板UI与交互用例”和“业务UI与交互用例”：看原执行、本轮结果、受阻条件及对应证据。',
    '- “范围与依据”：看工作包范围、依据、测试环境和覆盖边界。',
    f'- {link("本轮审查报告",CURRENT_REL/"审查报告.html")}：查看图文说明与现场证据；报告和evidence、historical、sources目录保持在一起。','',
    '收到新页面、样例或修复版本后按对应用例补测、复测，追加版本、结果与证据；实际复测通过后再关闭问题。','',
    '## 追溯受阻核实与人工复核','',
    f'- {link(previous.name,OLD_REL/previous.name)}：16条受阻用例核实的历史版本，保留原执行及已有人工意见；人工在“人工二次复核”栏填写结论、复核人、日期和意见。',
    f'- {link("受阻核实报告",OLD_REL/"复核证据.html")}：查看该轮已测步骤、缺少条件及对应截图、记录。',
    '- 当前整改跟进以“01_本轮审查”的审查表为主；历史核实与新一轮执行结果分别查看。','',
    '## 证据与排期参考','',
    '- 证据已展开在“01_本轮审查”和“02_受阻复核”中，含截图、操作/量测记录、历史证据和依据快照，无需再解压其他证据包。',
    '- “03_排期参考”为10/14读取的W2排期与阶段共识快照。',
    '- “打包校验.json”记录包内文件摘要和检查结果，供完整性核对。','',
    '本包的两份主要Excel、原执行记录和人工二次复核内容均原样复制；本次仅打包，未新增页面测试或源码整改。',''
]
write(Path('文件使用说明.md'),'\n'.join(guide).encode('utf-8'))

class HtmlLinks(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        self.links += [v for k,v in attrs if k in ['href','src'] and v]

html_link_count=0
for file in [STAGE/CURRENT_REL/'审查报告.html',STAGE/OLD_REL/'复核证据.html']:
    parser=HtmlLinks();parser.feed(file.read_text(encoding='utf-8'))
    for link_value in parser.links:
        if link_value.startswith(('#','data:','javascript:','mailto:')):continue
        value=urlsplit(link_value)
        if value.scheme in ['http','https']:continue
        assert not value.scheme,link_value
        target=(file.parent/unquote(value.path)).resolve()
        assert target.is_relative_to(STAGE.resolve()),(file,link_value)
        assert target.is_file(),(file,link_value)
        html_link_count += 1

md_link_count=0
for value in re.findall(r'\]\(<([^>]+)>\)',(STAGE/'文件使用说明.md').read_text(encoding='utf-8')):
    target=(STAGE/value).resolve()
    assert target.is_relative_to(STAGE.resolve()) and target.is_file(),value
    md_link_count += 1

from pypdf import PdfReader
assert len(PdfReader(str(STAGE/(NAME+'.pdf'))).pages)==1
for source,expected in source_hashes.items():
    assert sha(source.read_bytes())==expected,f'Source changed while packaging: {source}'
for source,rel in [(current,CURRENT_REL/current.name),(previous,OLD_REL/previous.name)]:
    assert sha((STAGE/rel).read_bytes())==sha(source.read_bytes())
    with zipfile.ZipFile(STAGE/rel) as wb:
        assert wb.testzip() is None

files=[p for p in sorted(STAGE.rglob('*')) if p.is_file()]
file_manifest=[{'path':p.relative_to(STAGE).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]
result={'packaged_at':at,'one_page_brief':True,'pdf_md_unchanged':True,'new_ui_execution':False,
        'original_execution_and_manual_review_preserved':True,'primary_workbooks_byte_identical':True,
        'html_local_links_checked':html_link_count,'usage_guide_links_checked':md_link_count,
        'source_file_hash_checks':len(source_hashes),'file_count_excluding_this_manifest':len(files),
        'files':file_manifest}
write(Path('打包校验.json'),json.dumps(result,ensure_ascii=False,indent=2).encode('utf-8'))

with zipfile.ZipFile(ZIP_PATH,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for file in sorted(STAGE.rglob('*')):
        if file.is_file():archive.write(file,file.relative_to(STAGE).as_posix())
with zipfile.ZipFile(ZIP_PATH) as archive:
    assert archive.testzip() is None
    names=archive.namelist()
    assert len(names)==len(set(names))==len(files)+1
    for name in names:
        assert not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts
    for item in file_manifest:
        assert sha(archive.read(item['path']))==item['sha256'],item['path']
    assert sha(archive.read((CURRENT_REL/current.name).as_posix()))==sha(current.read_bytes())
    assert sha(archive.read((OLD_REL/previous.name).as_posix()))==sha(previous.read_bytes())
receipt={k:v for k,v in result.items() if k!='files'}
receipt.update({'zip_path':str(ZIP_PATH),'zip_bytes':ZIP_PATH.stat().st_size,'zip_sha256':sha(ZIP_PATH.read_bytes()),'zip_entries':len(names),'zip_crc_and_readback':'passed'})
(PLAN/'sources/本周简报文件包校验.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(receipt,ensure_ascii=False))
