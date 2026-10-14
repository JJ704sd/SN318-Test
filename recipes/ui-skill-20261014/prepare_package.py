from pathlib import Path
import collections
import hashlib
import json

root = Path(r'.')
skill = root / 'skills/sn318-ui-audit'
data = json.loads((root / '.work/weekly-local-20261013/data.json').read_text(encoding='utf-8-sig'))
packages = []
for row in data['scope']:
    if row['w2'] != 'UI/开':
        continue
    packages.append({k: row[k] for k in ['seq', 'row', 'module', 'level1', 'level2', 'feature', 'priority', 'source', 'note', 'w2']})
snapshot = {
    'as_of': '2026-10-13', 'source_revision': 988,
    'source_url': data['sources']['schedule'],
    'week': 'W2', 'start': '2026-10-12', 'end': '2026-10-16',
    'scope': 'UI/开', 'snapshot_only': True,
    'excluded_requirement_phase_count': 24,
    'priority_counts': dict(collections.Counter(p['priority'] for p in packages)),
    'packages': packages,
}
assert len(packages) == 38 and snapshot['priority_counts'] == {'P0': 24, 'P1': 14}
(skill / 'assets/w2-baseline.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
files = [
    root / '.work/weekly-local-20261013/data.json',
    root / '.work/template-ui-execution-20261013/norm-full-audit-table-text.txt',
    root / 'outputs/template-reaudit/受阻16条核实/SN318_W2_UI与交互测试用例_16条受阻核实_含人工二次复核.xlsx',
    Path(r'./private-local-path'),
    root / 'pcs-front/docs/本地UI测试.md',
]
manifest = {'created_at': '2026-10-14', 'source_mode': 'historical-source-reconciliation plus live local-entry check', 'inputs': [{'path': str(p), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
(root / '.work/ui-skill-20261014/source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'packages': len(packages), 'priority_counts': snapshot['priority_counts'], 'files': len(list(skill.rglob('*')))}, ensure_ascii=False))
