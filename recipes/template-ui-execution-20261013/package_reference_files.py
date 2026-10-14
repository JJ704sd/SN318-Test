import json
import hashlib
import zipfile
from pathlib import Path

root = Path('.')
base = root / 'outputs/weekly-ui'
sources = [
    ('今天规范审查/修改清单及本周UI与交互执行主文件（安排修订版）', root / 'outputs/weekly-ui/SN318_W2_UI与交互测试用例_按工单用例风格重写.xlsx'),
    ('W2业务工作包的前端用例参考', root / 'outputs/w2-tasks/20261013/PCS_W2前端测试用例_飞书与页面复核修订.xlsx'),
    ('本批提测UI覆盖核对及功能测试交接', root / 'outputs/smoke-ui/SN318_冒烟与UI用例_飞书五色及实际页面复核.xlsx'),
    ('基础配置页面的历史问题及截图参考', root / 'outputs/ui-audit/SN318_基础配置前端UI走查_修改清单及截图证据.xlsx'),
    ('W2范围、设计待决项及历史审查参考', root / 'outputs/ui-audit/W2/SN318_W2前端UI规范审查_修改清单.xlsx'),
]
revision = json.loads((root / '.work/template-ui-execution-20261013/arrangement-revision.json').read_text('utf8'))
guide = revision['guide']
guide_path = base / 'SN318_接下来几天_UI与交互测试文件说明.txt'
guide_path.write_text(guide, encoding='utf-8')
archive = base / 'SN318_接下来几天_UI与交互测试参考文件包_20261013.zip'
entries = [(f'用例文件/{p.name}', p, role) for role, p in sources]
report = base / 'SN318_通用模板40条_UI交互实测报告_20261013.html'
entries.append((f'报告与证据/{report.name}', report, '通用模板既有实测审查报告及当前任务安排说明'))
evidence = base / 'evidence/template-execution-20261013'
entries.extend((f'报告与证据/evidence/template-execution-20261013/{p.relative_to(evidence).as_posix()}', p, '原始截图、量测或规范复核证据') for p in sorted(evidence.rglob('*')) if p.is_file())
entries.append(('文件说明.txt', guide_path, '用途、使用顺序与覆盖边界'))
manifest = []
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for destination, source, role in entries:
        assert source.is_file(), source
        data = source.read_bytes()
        z.writestr(destination, data)
        manifest.append({'path': destination, 'source': str(source), 'purpose': role, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    z.writestr('文件索引.json', json.dumps({'packagedAt': '2026-10-13', 'workbooks': 5, 'workbookContentChanged': True, 'modifiedWorkbooks': 1, 'unchangedReferenceWorkbooks': 4, 'revisionAt': revision['revisionAt'], 'revisionScope': '当前任务安排、业务用例准入说明、报告使用边界；原实测/截图/修改清单判定保留', 'originalWorkbookSha256': revision['beforeWorkbookSha256'], 'newApplicationTests': False, 'files': manifest}, ensure_ascii=False, indent=2))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert sum(p.endswith('.xlsx') for p in z.namelist()) == 5
    for entry in manifest:
        assert hashlib.sha256(z.read(entry['path'])).hexdigest() == entry['sha256']
        assert hashlib.sha256(Path(entry['source']).read_bytes()).hexdigest() == entry['sha256']
print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size, 'workbooks': 5, 'files': len(manifest)+1, 'integrity': 'PASS', 'modifiedWorkbooks': 1, 'unchangedReferenceWorkbooks': 4, 'guide': str(guide_path)}, ensure_ascii=False))
