from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent
script = root.parents[1] / 'skills/sn318-ui-audit/scripts/validate_run.py'
spec = importlib.util.spec_from_file_location('ui_validator', script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
(root / 'synthetic-dom.json').write_text('{"fixture":"synthetic; not browser evidence"}\n', encoding='utf-8')
record = {
    'schema_version': 1, 'run_id': 'synthetic-validator-check', 'phase': 'execution',
    'environment': {'repository': 'synthetic', 'branch': 'dev', 'commit': 'fixture', 'dirty': True, 'worktree_fingerprint': 'synthetic', 'base_url': 'http://127.0.0.1:5173', 'mode': 'dev', 'mock': 'synthetic', 'role': 'synthetic', 'timezone': 'Asia/Shanghai', 'started_at': '2026-10-14T12:00:00+08:00', 'viewport': [1440, 900], 'zoom': 100},
    'sources': [{'id': 'N', 'title': 'Synthetic requirement', 'location': 'synthetic-only', 'revision': '1', 'retrieved_at': '2026-10-14T12:00:00+08:00', 'freshness': 'snapshot', 'coverage': 'synthetic validator fixture'}],
    'evidence': [{'id': 'E', 'kind': 'dom', 'path': 'synthetic-dom.json', 'captured_at': '2026-10-14T12:00:00+08:00', 'url': 'http://127.0.0.1:5173/demo/list', 'scope': 'synthetic validator fixture; not UI execution', 'run_id': 'synthetic-validator-check'}],
    'cases': [{'id': 'C', 'name': 'Synthetic case', 'layer': 'template', 'package_ids': [], 'source_ids': ['N'], 'url': 'http://127.0.0.1:5173/demo/list', 'preconditions': 'synthetic only', 'steps': [{'id': 'S1', 'action': 'Synthetic action', 'expected': 'Synthetic expectation', 'source_ids': ['N'], 'actual': 'Synthetic matching observation', 'result': '通过', 'evidence_ids': ['E']}], 'result': '通过', 'manual_review': 'preserve existing human input fixture'}],
    'packages': [], 'issues': []
}
checks = []


def check(name, value, expected_ok):
    original = deepcopy(value)
    result = module.validate(value, root)
    assert result['ok'] == expected_ok, (name, result)
    assert value == original, f'{name}: validator changed input'
    checks.append({'name': name, 'passed': True})


check('complete applicable steps', deepcopy(record), True)
value = deepcopy(record)
value['cases'][0]['steps'][0]['result'] = '不通过'
value['cases'][0]['steps'].append({'id': 'S2', 'action': 'Slow response', 'expected': 'Recovery', 'source_ids': ['N'], 'actual': '', 'result': '受阻', 'evidence_ids': [], 'blocker': 'No delay control', 'needed': 'Controlled fixture'})
value['cases'][0]['result'] = '不通过'
check('failure remains visible beside blocked branch', value, True)
value = deepcopy(record)
value['cases'][0]['steps'].append({'id': 'S2', 'action': 'Recovery', 'result': '未执行', 'blocker': 'No recovery fixture', 'needed': 'Switchable error-success response'})
value['cases'][0]['result'] = '受阻'
check('partial execution stays blocked', value, True)
value['cases'][0]['result'] = '通过'
check('reject false aggregate pass', value, False)
value = deepcopy(record)
value['evidence'][0]['path'] = 'missing-file.json'
check('reject missing evidence file', value, False)
value = deepcopy(record)
value['cases'].append(deepcopy(value['cases'][0]))
check('reject duplicate case ids', value, False)
value = deepcopy(record)
value['evidence'][0]['kind'] = 'source'
check('reject source-only UI verdict', value, False)
value = deepcopy(record)
value['cases'][0]['steps'][0] = {'id': 'S1', 'action': 'Excluded feature', 'result': '不适用', 'exclusion_source_ids': ['N']}
value['cases'][0]['result'] = '不适用'
check('documented exclusions', value, True)
value['cases'][0]['steps'][0]['exclusion_source_ids'] = []
check('reject unsupported exclusions', value, False)
value = deepcopy(record)
value['phase'] = 'plan'
check('plan cannot claim executed success', value, False)
value = deepcopy(record)
value['cases'][0]['layer'] = 'business'
value['cases'][0]['package_ids'] = ['P']
value['packages'] = [{'id': 'P', 'source_id': 'N', 'source_row': 5, 'phase': 'UI/开', 'priority': 'P0', 'delivery': 'partial', 'next_action': 'Wait for a fixture', 'case_ids': ['C']}]
check('reciprocal business package mapping', value, True)
value['packages'][0]['case_ids'] = []
check('reject broken package mapping', value, False)
value = deepcopy(record)
value['issues'] = [{'id': 'I', 'type': '规范差异', 'case_ids': ['C'], 'source_ids': ['N'], 'actual': 'Synthetic finding', 'recommendation': 'Synthetic change', 'acceptance': 'Synthetic criterion', 'evidence_ids': [], 'status': '已关闭'}]
check('reject closure without retest evidence', value, False)
value = deepcopy(record)
value['environment']['worktree_fingerprint'] = ''
check('require dirty baseline fingerprint', value, False)
value = deepcopy(record)
value['evidence'][0]['run_id'] = 'older-run'
result = module.validate(value, root)
assert result['ok'] and result['warnings']
checks.append({'name': 'historical evidence is disclosed', 'passed': True})

valid_path = root / 'synthetic-run.json'
valid_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
run = subprocess.run([sys.executable, '-X', 'utf8', str(script), str(valid_path)], capture_output=True, text=True, encoding='utf-8')
assert run.returncode == 0 and json.loads(run.stdout)['record_validation_only']
checks.append({'name': 'CLI valid record and validation boundary', 'passed': True})
invalid_path = root / 'synthetic-invalid.json'
invalid_path.write_text('{not json}', encoding='utf-8')
run = subprocess.run([sys.executable, '-X', 'utf8', str(script), str(invalid_path)], capture_output=True, text=True, encoding='utf-8')
assert run.returncode == 1 and not json.loads(run.stdout)['ok']
checks.append({'name': 'CLI malformed input returns structured error', 'passed': True})
report = {'synthetic_only': True, 'does_not_verify_UI': True, 'checks': checks, 'passed': len(checks)}
(root / 'validator-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
