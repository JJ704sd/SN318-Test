import json
from html import escape
from pathlib import Path

root = Path('.')
work = root / '.work/template-ui-execution-20261013'
base = root / 'outputs/weekly-ui'
cfg = json.loads((work / 'arrangement-revision.json').read_text('utf8'))
report = base / 'SN318_通用模板40条_UI交互实测报告_20261013.html'
original = (work / 'before-arrangement-revision' / report.name).read_text('utf8')
section = '''<section id="current-arrangement"><h2>当前任务安排与本报告用途</h2>
<p>今天（2026-10-13）先输出前端页面UI规范审查和修改清单；W2（10/12—10/16）正式全面介入实际交付页面的UI与交互。本报告提供已有通用模板审查证据，供本周业务页面走查和修改复测参考。</p>
<table><tr><th>阶段</th><th>使用与产出</th><th>判定边界</th></tr>
<tr><td>今天审查</td><td>核对明确规范，输出条款、实际情况、截图、修改建议及验收标准。现有清单为7项规范差异、3项可用性建议、1项口径修订，以及18条整条/3条失败用例子步缺口。</td><td>已确认差异可直接列修改；建议尚未实施。缺状态或样例只阻塞相关步骤，并保留其余步骤证据。</td></tr>
<tr><td>本周介入</td><td>按实际交付及优先级介入38项“UI/开”工作包，对应主工作簿76条业务候选；补边界、异常，跟踪修改和复测。</td><td>业务76条仍未执行。入口可访问即可先查通用规范明确的要求；依赖业务专项判据的步骤等待相应依据。</td></tr>
<tr><td>每批收口</td><td>记录Build、URL、角色、样例和截图，汇总UI覆盖、修改结果和遗留，交接原功能测试。</td><td>模板或历史观察不替代实际业务实例；完整功能测试按原分工。“全面介入”不表示全部页面已经通过。</td></tr></table>
<p>排期口径依据用户本次安排、提供的截图及10/13排期rev988快照：“UI/开”表示UI设计与开发并行；“开、测”默认周三提测的规则不适用于本周这38项。24项“需”仅准备需求与判据。旧文件里的逐日安排为建议顺序，以实际交付为准。</p>
<p>此次只修订安排和准入说明，未新增页面执行或更改应用源码。下方40条实测及规范复核保留原时间、判定与截图；报告统计仍为12通过、10不通过、18受阻。每次正式开测须重新确认dev健康和本批Build。</p>
</section>'''
anchor = '<section><h2>环境与取证方法</h2>'
assert original.count(anchor) == 1
report.write_text(original.replace(anchor, section + anchor), encoding='utf8')

# Keep the existing packaging entry points, replacing the obsolete guide in place.
p = work / 'package_reference_files.py'
text = p.read_text('utf8')
start = text.index("guide = '''")
end = text.index("guide_path = ", start)
text = text[:start] + "revision = json.loads((root / '.work/template-ui-execution-20261013/arrangement-revision.json').read_text('utf8'))\nguide = revision['guide']\n" + text[end:]
text = text.replace("'日常UI执行与通用模板整改复测'", "'今天规范审查/修改清单及本周UI与交互执行主文件（安排修订版）'")
text = text.replace("'最新通用模板实测审查报告'", "'通用模板既有实测审查报告及当前任务安排说明'")
old_manifest = "'workbookContentChanged': False, 'newApplicationTests': False, 'files': manifest"
new_manifest = "'workbookContentChanged': True, 'modifiedWorkbooks': 1, 'unchangedReferenceWorkbooks': 4, 'revisionAt': revision['revisionAt'], 'revisionScope': '当前任务安排、业务用例准入说明、报告使用边界；原实测/截图/修改清单判定保留', 'originalWorkbookSha256': revision['beforeWorkbookSha256'], 'newApplicationTests': False, 'files': manifest"
assert old_manifest in text
text = text.replace(old_manifest, new_manifest)
text = text.replace("'unchangedSourceFiles': True", "'modifiedWorkbooks': 1, 'unchangedReferenceWorkbooks': 4")
p.write_text(text, encoding='utf8')

p = work / 'package_delivery.py'
text = p.read_text('utf8')
old = '业务76条保持未执行且值/样式不变。'
assert old in text
text = text.replace(old, '业务76条仍未执行；按当前安排修订前置/备注中的准入说明，原名称、步骤、预期、等级及实际结果保留。')
old = "    '7. norm-full-audit-body.txt"
assert old in text
text = text.replace(old, "    '当前安排补充：今天先输出UI规范审查和修改清单；本周对38项UI/开实际交付页面全面介入UI与交互。通用规范明确步骤可先查，专项缺口逐步受阻，功能测试按原分工。本次安排修订未新增页面执行。\\n'\n" + old)
text = text.replace("'newPageExecution':False,'files':manifest", "'newPageExecution':False,'arrangementRevision':True,'files':manifest")
p.write_text(text, encoding='utf8')
print(json.dumps({'reportUpdated': str(report), 'packagingScriptsUpdated': True, 'newPageExecution': False}, ensure_ascii=False))
