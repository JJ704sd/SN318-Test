from pathlib import Path
from collections import Counter, defaultdict
import json, re, runpy, contextlib, io, hashlib, shutil, html

ROOT = Path('.')
WORK = ROOT / '.work/w2-cases-revised-20261014'
OUT = ROOT / 'outputs/ui-audit-20261014/20261014-ui-cases-revised'
MASTER = OUT.parent / '20261014-master-data-reaudit'
PRIOR = OUT.parent / '20261014-ui-audit'
SOURCE = MASTER / 'SN318_W2_主数据用例复核_20261014_dev_fd786de_dirty-8cdf1453.xlsx'
DEST = OUT / 'SN318_W2_UI与交互测试用例_20261014_fd786de_整改跟进版.xlsx'
WORK.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
with contextlib.redirect_stdout(io.StringIO()):
    reader = runpy.run_path(str(ROOT / '.work/w2-weekly-plan-20261014/compare_workbooks.py'))['read']
book = reader(SOURCE)
record = json.loads((MASTER / '复核记录.json').read_text(encoding='utf-8'))
previous = json.loads((PRIOR / '审查记录.json').read_text(encoding='utf-8'))
current = {c['id']: c for c in record['cases']}
past = {c['id']: c for c in previous['cases']}
issues_map = {i['id']: i for i in previous['issues']}

def case_id(text):
    m = re.search(r'UI-[A-Z0-9]+-\d+(?:-\d+)?', text)
    assert m, text[:80]
    return m[0]

def numbered(text):
    return {m[1]: m[2].strip() for m in re.finditer(r'\[(\d+)\]([^\[]*)(?=\[\d+\]|$)', text, re.S)}

def role(needed):
    if not needed:
        return ''
    a = []
    if any(x in needed for x in ['批准', 'PRD', '判据', '设计', '精度', '策略', '映射', '口径', '上限']):
        a.append('产品/设计确认')
    if any(x in needed for x in ['样例', '响应', '数据', '控件', '请求', '入口']):
        a.append('开发提供样例')
    a.append('测试复测')
    return '；'.join(a)

def data_for(cid, step, action, needed):
    if cid.startswith('UI-M1-') and int(cid.rsplit('-', 1)[1]) <= 20:
        return '无结果词：NO_UI_20261014_RECHECK；恢复数据：执行前当前对象的原列表/子表'
    if cid == 'UI-M1-022':
        return '空表单；重复编码FREIGHT；其余必填字段使用有效样例；不得创建新持久化对象'
    if cid == 'UI-W2-50-2':
        return {'1': '待确认L后准备长度L-1/L/L+1的编码；L目前未知', '2': '已有FREIGHT＋有效名称/分组/币种', '3': '开发提供非重复编码的保存失败响应；保存后可恢复'}[step]
    if cid == 'UI-W2-51-2':
        return {'1': '准备0与空倍率各1条；显示口径待产品确认', '2': '准备极小、极大、超过批准精度各1条；阈值与精度待确认', '3': '准备超出当前列宽的长币种名称；核验省略与全文读取'}[step]
    if cid == 'UI-W2-56-2':
        return '准备至少8个同级类别、长类别名、首末项；控件/键盘方案先由产品设计确认'
    if cid == 'UI-M1-021':
        return 'FREIGHT原名称运费；临时名称UI临时修改_取消验证；取消后应仍为运费'
    if cid == 'UI-M1-023':
        return '已有CNY；核验ISO 4217编码控件只读'
    if cid == 'UI-M1-024':
        return '已生效USD/CNY，倍率7.1234；结束日10/31临时改10/30后取消，应恢复10/31'
    return ('按原前置准备；' + needed) if needed else '沿用原前置条件及原步骤样例；无新执行'

# Normalize only the active follow-up view. The original four sheets remain byte-identical.
issue_rows = []
mc = book['修改清单']['cells']
related = defaultdict(set)
latest_issue_evidence = {
    'W2-R01': ['C03-rate-visual'], 'W2-R03': ['C03-rate-metrics'],
    'W2-R04': ['C03-rate-metrics'], 'W2-R09': [e for c in record['cases'] if c['id'].startswith('UI-M1-') and int(c['id'].rsplit('-', 1)[1]) <= 20 for s in c['steps'] if s['id'] == '2' for e in s['evidence_ids']],
    'W2-R11': ['C03-rate-metrics'], 'W2-D01': ['F04-fee-create', 'F07-fee-duplicate-result'],
    'W2-D02': ['C04-rate-edit', 'C05-rate-end-unsaved', 'C06-rate-cancel'],
    'W2-D03': ['R18-loaded'], 'W2-G02': ['R17-loaded', 'R20-loaded'],
    'W2-MR01': ['F07-fee-duplicate-result']
}
for r in list(range(36, 52)) + [55]:
    iid = mc['A' + str(r)]
    cids = sorted(set(re.findall(r'UI-[A-Z0-9]+-\d+(?:-\d+)?', mc.get('J' + str(r), ''))))
    extra = {'W2-R11': ['UI-W2-51-1'], 'W2-D01': ['UI-W2-50-1'], 'W2-D02': ['UI-W2-51-2'], 'W2-G02': ['UI-W2-51-2', 'UI-W2-56-2']}.get(iid, [])
    cids = sorted(set(cids + extra))
    if iid == 'W2-MR01':
        cids = ['UI-W2-50-2']
    for cid in cids:
        related[cid].add(iid)
    typ = mc.get('B' + str(r), '')
    tested = iid in latest_issue_evidence
    review = mc.get('P' + str(r), '') if r != 55 else '本轮不通过'
    state = '待整改复测' if typ.startswith('已证实') else '待补齐' if '缺口' in typ else '待确认'
    role_text = '前端开发整改；测试复测' if typ.startswith('已证实') else '产品/设计裁决；测试核对' if '裁决' in typ or '确认' in typ else '产品/设计确认；开发提供样例；测试复测'
    issue_rows.append({
        'id': iid, 'type': typ, 'level': mc.get('C' + str(r), ''), 'page': mc.get('D' + str(r), ''),
        'state': state, 'coverage': '主数据轮次已核对' if tested else '本轮未复核',
        'review': review, 'actual': mc.get('Q' + str(r), '') or mc.get('F' + str(r), ''),
        'recommendation': mc.get('H' + str(r), ''), 'acceptance': mc.get('I' + str(r), ''),
        'case_ids': cids, 'evidence_ids': sorted(set(latest_issue_evidence.get(iid, issues_map.get(iid, {}).get('evidence_ids', [])))),
        'needed': mc.get('M' + str(r), ''), 'role': role_text,
        'norm': mc.get('E' + str(r), ''), 'baseline': record['run_id'] if tested else previous['run_id']
    })

gap_defs = [
    ('W2-G03', '业务字典专项范围', ['UI-W2-56-1'], '业务字典PRD映射与专项分类采纳稿未确认；普通新增/取消步骤已有证据。', '产品/设计确认业务字典字段、分类及本周纳入范围；测试按批准口径核对。', 'PRD与采纳稿可追溯到本周工作包；已记录的普通UI步骤不被重复记成未执行。', ['D01-dictionary-create', 'D02-dictionary-cancel']),
    ('W2-G04', '费用项边界与失败响应', ['UI-W2-50-2'], '编码上限L及非重复编码的可控保存失败响应缺失。', '产品确认L；开发提供L-1/L/L+1及非重复保存失败样例；测试逐分支复测。', '边界限制按批准L呈现；旧字段错误清除，新失败提示明确、输入保留、保存解锁。', ['F04-fee-create', 'F07-fee-duplicate-result'])
]
for iid, page, cids, actual, recommendation, acceptance, ev in gap_defs:
    for cid in cids:
        related[cid].add(iid)
    issue_rows.append({'id': iid, 'type': '执行条件缺口', 'level': 'P1' if iid.endswith('03') else 'P2', 'page': page, 'state': '待补齐', 'coverage': '主数据轮次已核对', 'review': '受阻条件拆分登记；不是新增缺陷', 'actual': actual, 'recommendation': recommendation, 'acceptance': acceptance, 'case_ids': cids, 'evidence_ids': ev, 'needed': actual, 'role': '产品/设计确认；开发提供样例；测试复测', 'norm': '原用例前置及受阻步骤', 'baseline': record['run_id']})

cases = []
for sheet_name, last_row, layer in [('业务UI与交互用例', 102, 'business'), ('通用模板UI与交互用例', 41, 'template')]:
    cells = book[sheet_name]['cells']
    for r in range(2, last_row + 1):
        cid = case_id(cells['G' + str(r)])
        c = current.get(cid) or past.get(cid)
        reviewed = cid in current
        historical = layer == 'template'
        coverage = '本轮已复核' if reviewed else '本轮未重跑' if historical else '本轮未复核'
        status = cells.get(('N' if reviewed else 'K') + str(r), '未执行')
        row_steps = json.loads(json.dumps(c['steps'], ensure_ascii=False)) if c else [
            {'id': sid, 'action': a, 'expected': numbered(cells.get('E' + str(r), '')).get(sid, ''), 'actual': '', 'result': '未执行', 'needed': '', 'evidence_ids': []}
            for sid, a in numbered(cells.get('D' + str(r), '')).items()
        ]
        assert row_steps and all(s['expected'] for s in row_steps), cid
        baseline = 'fd786de / dirty-8cdf1453' if reviewed else 'b2efcdb / dirty-5c6bc530' if historical else '尚无页面执行基线'
        package = (re.search(r'UI-W2-(\d+)-', cid) or [None, None])[1]
        package = 'W2-' + package if package else ('W2-50' if cid in ['UI-M1-021', 'UI-M1-022'] else 'W2-51' if cid in ['UI-M1-023', 'UI-M1-024'] else 'M1公共' if layer == 'business' else '通用模板')
        # Separate an existing prerequisite decision from a completed cancel action.
        if cid == 'UI-W2-56-1':
            needed = row_steps[-1]['needed']
            row_steps.insert(0, {'id': 'PRE', 'action': '核对原前置中的业务字典PRD映射及专项分类采纳范围', 'expected': '取得本周批准PRD/采纳稿，明确普通UI与专项范围', 'actual': '原记录未取得上述批准材料；本版单列范围前置，未新增页面执行。', 'result': '受阻', 'needed': needed, 'evidence_ids': row_steps[-1]['evidence_ids']})
            row_steps[-1]['result'] = '通过'
            row_steps[-1]['needed'] = ''
            row_steps[-1]['actual'] = '新增监管方式后取消，仍回原监管方式对象。原步骤3的范围缺口移至PRE，按既有D01/D02证据整理；未新增执行。'
        if reviewed and cid.startswith('UI-M1-') and int(cid.rsplit('-', 1)[1]) <= 20:
            row_steps[0]['action'] = '输入NO_UI_20261014_RECHECK并查询（本轮实际输入，原文本保留在历史表）'
        label = '主数据既有执行' if reviewed else '模板历史执行' if historical else '未执行计划'
        needs = [s.get('needed', '') for s in row_steps if s.get('needed')]
        brief = '；'.join(s['actual'] for s in row_steps if s['result'] == '不通过')[:210] if status == '不通过' else ('；'.join(needs)[:210] if status == '受阻' else ('原步骤已验证；仅限记录的Mock范围' if status == '通过' else '本轮未复核；后续先核对实际交付页面、原判据与样例'))
        if cid == 'UI-M1-022':
            brief = '受阻改为通过：本轮捕获完整重复反馈、输入保留与解锁；字段关联错误另见UI-W2-50-2。'
        if cid == 'UI-M1-024':
            brief = 'M1只读/取消行为通过；产品版本、审批和删除口径仍待D02裁决。'
        if historical:
            brief = '本轮未重跑；沿用b2efcdb轮次结果，不作为fd786de模板结果。'
        cases.append({'id': cid, 'name': cells['A' + str(r)], 'package': package, 'layer': layer, 'source_sheet': sheet_name, 'source_row': r, 'result': status, 'coverage': coverage, 'baseline': baseline, 'brief': brief, 'issue_ids': sorted(related[cid]), 'steps': row_steps, 'step_layer': label, 'preconditions': cells.get('C' + str(r), ''), 'norm': cells.get('G' + str(r), ''), 'manual': cells.get('J' + str(r), ''), 'url': c.get('url', '') if c else '', 'next': '整改后复测，并补齐受阻分支' if status == '不通过' else '先补齐具体判据/样例，再复测' if status == '受阻' else '变更影响时回归' if reviewed else '按新版本与交付页面安排重测'})
cases.sort(key=lambda c: (0 if c['coverage'] == '本轮已复核' else 2 if c['layer'] == 'template' else 1, c['source_row']))
assert len(cases) == 141 and len({c['id'] for c in cases}) == 141
assert Counter(c['result'] for c in cases if c['coverage'] == '本轮已复核') == Counter({'通过': 4, '不通过': 23, '受阻': 4})

step_rows = []
for n, c in enumerate(cases, start=17):
    c['row'] = n
    c['first_step_row'] = 166 + len(step_rows)
    for s in c['steps']:
        sid = c['id'] + '-' + s['id']
        needed = s.get('needed', '')
        norm_match = re.search(r'【(?:知识库依据|依据)】([^\n]+)', c['norm'])
        step_rows.append({'id': sid, 'case_id': c['id'], 'layer': c['step_layer'], 'action': s['action'], 'expected': s['expected'], 'actual': s.get('actual', ''), 'result': s['result'], 'needed': needed, 'norm': norm_match[1] if norm_match else re.sub(r'\n.*', '', c['norm'])[:160], 'evidence_ids': s.get('evidence_ids', []), 'role': role(needed), 'data': data_for(c['id'], s['id'], s['action'], needed) if s['id'] != 'PRE' else '产品/设计提供采纳PRD及本周范围映射', 'next': '先补齐条件再执行' if needed else '整改后回归' if s['result'] == '不通过' else '按原前置安排执行' if s['result'] == '未执行' else '保留原轮次证据', 'url': s.get('url', '') or c['url'], 'row': 166 + len(step_rows)})

# Copy only evidence referenced by the active views, with a run prefix for collisions.
evidence = {}
for s in step_rows:
    for eid in s['evidence_ids']:
        key = ('master' if s['layer'] == '主数据既有执行' else 'prior', eid)
        evidence.setdefault(key, [])
for i in issue_rows:
    for eid in i['evidence_ids']:
        evidence.setdefault(('master' if i['coverage'] == '主数据轮次已核对' else 'prior', eid), [])
previous_ev = {e['id']: e for e in previous['evidence']}
for (run, eid) in evidence:
    if run == 'master':
        paths = [f['path'] for f in record['evidence_index'][eid]]
        base = MASTER
    else:
        ev = previous_ev[eid]
        paths = [ev.get(k) for k in ['path', 'screenshot'] if ev.get(k)]
        base = PRIOR
    for raw in dict.fromkeys(paths):
        src = base / raw
        assert src.is_file(), src
        dest = OUT / 'evidence' / run / src.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        evidence[(run, eid)].append({'path': dest.relative_to(OUT).as_posix(), 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
sections = []
for (run, eid), files in sorted(evidence.items()):
    anchors = ''.join('<a href="' + html.escape(f['path']) + '">' + html.escape(Path(f['path']).suffix[1:].upper()) + '</a> ' for f in files)
    picture = next((f['path'] for f in files if f['path'].endswith(('.jpg', '.png'))), '')
    image = '<img loading="lazy" src="' + html.escape(picture) + '" alt="' + html.escape(eid) + '">' if picture else '<p>本条为DOM或计算样式证据，打开JSON/TXT查看。</p>'
    sections.append('<section id="' + run + '-' + eid + '"><h2>' + html.escape(eid) + '</h2><p>' + ('fd786de主数据轮次' if run == 'master' else 'b2efcdb历史轮次') + '　' + anchors + '</p>' + image + '</section>')
(OUT / '证据索引.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>SN318用例证据索引</title><style>body{font:16px Arial,sans-serif;max-width:1100px;margin:32px auto;color:#243247}section{padding:20px 0;border-top:1px solid #ccd4df}img{max-width:100%;height:auto}a{margin-right:14px}</style><h1>SN318用例证据索引</h1><p>保留既有主数据与模板轮次证据。此版整理用例与跟进字段，没有新增页面执行。DOM与截图可能顺序采样，以原记录的状态说明为准。</p>' + ''.join(sections) + '</html>', encoding='utf-8')

source_dir = OUT / 'sources'
source_dir.mkdir(exist_ok=True)
shutil.copy2(SOURCE, source_dir / '修订前主数据复核原件.xlsx')
shutil.copy2(MASTER / '复核记录.json', source_dir / '主数据原执行记录.json')
shutil.copy2(PRIOR / '审查记录.json', source_dir / '模板及M1原执行记录.json')
for filename in ['norm-live.json', 'norm-tables-live.json', 'schedule-live.json', 'review-live.json', 'product-prd-live.json']:
    p = MASTER / 'sources' / filename
    if p.is_file():
        shutil.copy2(p, source_dir / filename)

plan = {'source': str(SOURCE), 'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'destination': str(DEST), 'out': str(OUT), 'work': str(WORK), 'book': book, 'cases': cases, 'steps': step_rows, 'issues': issue_rows, 'evidence': [{'run': run, 'id': eid, 'files': files} for (run, eid), files in sorted(evidence.items())], 'counts': {'cases': len(cases), 'steps': len(step_rows), 'issues': len(issue_rows), 'master': dict(Counter(c['result'] for c in cases if c['coverage'] == '本轮已复核')), 'step_layers': dict(Counter(s['layer'] for s in step_rows))}, 'source_versions': previous['sources'], 'new_test_execution': False, 'normalization_notes': ['UI-M1-001至020输入词按已有实际记录细化为NO_UI_20261014_RECHECK，原步骤保持不变', 'UI-W2-56-1范围前置单列PRE；取消交互按已有证据整理为通过，整条仍受阻', 'G03/G04是已有受阻条件的拆分登记，不是新缺陷或新执行', '当前页是未来跟进的主视图；历史四表只读参考，新人工字段空白']}
(WORK / 'plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'source_sha256': plan['source_sha256'], 'counts': plan['counts'], 'evidence_ids': len(evidence), 'evidence_files': sum(len(x) for x in evidence.values())}, ensure_ascii=False))
