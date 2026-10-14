#!/usr/bin/env python3
"""Validate SN318 UI audit records without modifying files or asserting test success."""

import argparse
from collections import Counter
from datetime import datetime
import json
from pathlib import Path
import sys

RESULTS = {'通过', '不通过', '受阻', '未执行', '不适用'}
KINDS = {'screenshot', 'dom', 'measurement', 'ui-log', 'source', 'historical'}


def aggregate(steps):
    states = [s.get('result') for s in steps if s.get('result') != '不适用']
    if not states:
        return '不适用' if steps else '未执行'
    if '不通过' in states:
        return '不通过'
    if all(s == '未执行' for s in states):
        return '未执行'
    if any(s in {'受阻', '未执行'} for s in states):
        return '受阻'
    return '通过'


def validate(data, directory):
    errors, warnings = [], []

    def require(obj, keys, where):
        for key in keys:
            if not obj.get(key):
                errors.append(f'{where}: missing {key}')

    def stamp(value, where):
        try:
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
            if parsed.tzinfo is None:
                raise ValueError('timezone absent')
        except (ValueError, TypeError, AttributeError):
            errors.append(f'{where}: expected ISO datetime with timezone')

    def records(name):
        value = data.get(name)
        if not isinstance(value, list) or any(not isinstance(x, dict) for x in value):
            errors.append(f'{name}: expected array of objects')
            return []
        return value

    def index(items, where):
        lookup = {}
        for item in items:
            identifier = item.get('id')
            if not isinstance(identifier, str) or not identifier.strip():
                errors.append(f'{where}: missing string id')
            elif identifier in lookup:
                errors.append(f'{where}: duplicate id {identifier}')
            else:
                lookup[identifier] = item
        return lookup

    def refs(obj, field, lookup, where, required=False):
        value = obj.get(field, [])
        if not isinstance(value, list) or any(not isinstance(v, str) for v in value):
            errors.append(f'{where}.{field}: expected array of ids')
            return []
        if required and not value:
            errors.append(f'{where}.{field}: empty required references')
        if len(value) != len(set(value)):
            errors.append(f'{where}.{field}: duplicate references')
        for identifier in value:
            if identifier not in lookup:
                errors.append(f'{where}.{field}: unknown id {identifier}')
        return value

    if not isinstance(data, dict):
        return {'ok': False, 'errors': ['root: expected object'], 'warnings': []}
    if data.get('schema_version') != 1:
        errors.append('schema_version: expected 1')
    require(data, ['run_id'], 'run')
    phase = data.get('phase')
    if phase not in {'plan', 'execution'}:
        errors.append('phase: expected plan or execution')
    env = data.get('environment', {})
    if not isinstance(env, dict):
        errors.append('environment: expected object')
        env = {}
    require(env, ['repository', 'branch', 'base_url', 'mode', 'timezone'], 'environment')
    if phase == 'execution':
        require(env, ['commit', 'worktree_fingerprint', 'mock', 'role', 'started_at'], 'environment')
        for key in ['commit', 'worktree_fingerprint', 'mock', 'role']:
            if env.get(key) in {'待核对', 'unknown', '待确认'}:
                errors.append(f'environment.{key}: unresolved execution baseline')
        if not isinstance(env.get('dirty'), bool):
            errors.append('environment.dirty: expected boolean')
        stamp(env.get('started_at'), 'environment.started_at')
        viewport = env.get('viewport')
        if not isinstance(viewport, list) or len(viewport) != 2 or any(type(v) not in {int, float} or v <= 0 for v in viewport):
            errors.append('environment.viewport: expected two positive dimensions')
        if type(env.get('zoom')) not in {int, float} or env['zoom'] <= 0:
            errors.append('environment.zoom: expected positive percentage')

    source_rows, evidence_rows, cases, packages, issues = [records(n) for n in ['sources', 'evidence', 'cases', 'packages', 'issues']]
    sources = index(source_rows, 'sources')
    evidence = index(evidence_rows, 'evidence')
    case_index = index(cases, 'cases')
    package_index = index(packages, 'packages')
    index(issues, 'issues')
    if not cases and not packages:
        errors.append('run: no cases or packages to validate')

    for source in source_rows:
        where = f'source {source.get("id")}'
        require(source, ['title', 'location', 'revision', 'retrieved_at', 'coverage'], where)
        stamp(source.get('retrieved_at'), where + '.retrieved_at')
        if source.get('freshness') not in {'live', 'snapshot'}:
            errors.append(f'{where}: freshness must be live or snapshot')

    for item in evidence_rows:
        where = f'evidence {item.get("id")}'
        require(item, ['path', 'captured_at', 'url', 'scope', 'run_id'], where)
        stamp(item.get('captured_at'), where + '.captured_at')
        if item.get('kind') not in KINDS:
            errors.append(f'{where}: unknown kind')
        path = item.get('path')
        if isinstance(path, str) and path:
            if '://' in path:
                errors.append(f'{where}: path must refer to a local evidence file')
            elif not (directory / path).is_file():
                errors.append(f'{where}: evidence file missing: {path}')
        if item.get('run_id') != data.get('run_id') or item.get('kind') == 'historical':
            warnings.append(f'{where}: historical evidence; not a new execution')

    step_counts = Counter()
    for case in cases:
        where = f'case {case.get("id")}'
        require(case, ['name', 'url', 'preconditions'], where)
        if case.get('layer') not in {'template', 'business'}:
            errors.append(f'{where}: layer must be template or business')
        refs(case, 'package_ids', package_index, where, case.get('layer') == 'business')
        refs(case, 'source_ids', sources, where)
        steps = case.get('steps')
        if not isinstance(steps, list) or not steps or any(not isinstance(s, dict) for s in steps):
            errors.append(f'{where}: expected nonempty steps array of objects')
            continue
        index(steps, where + '.steps')
        for step in steps:
            at = f'{where} step {step.get("id")}'
            require(step, ['action'], at)
            result = step.get('result')
            step_counts[result] += 1
            if result not in RESULTS:
                errors.append(f'{at}: invalid result')
            ids = refs(step, 'evidence_ids', evidence, at, result in {'通过', '不通过'})
            refs(step, 'source_ids', sources, at, result in {'通过', '不通过'})
            if result in {'通过', '不通过'}:
                require(step, ['expected', 'actual'], at)
                if not any(evidence[i].get('kind') != 'source' for i in ids if i in evidence):
                    errors.append(f'{at}: source-only evidence cannot establish UI behavior')
            if result == '受阻' or (result == '未执行' and any(s.get('result') in {'通过', '不通过'} for s in steps)):
                require(step, ['blocker', 'needed'], at)
            if result == '不适用':
                refs(step, 'exclusion_source_ids', sources, at, True)
            if phase == 'plan' and result in {'通过', '不通过'}:
                errors.append(f'{at}: plan cannot contain executed verdicts')
        expected = aggregate(steps)
        if case.get('result') != expected:
            errors.append(f'{where}: result {case.get("result")} must aggregate to {expected}')

    for package in packages:
        where = f'package {package.get("id")}'
        require(package, ['source_id', 'source_row', 'phase', 'priority', 'delivery', 'next_action'], where)
        if package.get('source_id') not in sources:
            errors.append(f'{where}: unknown source_id')
        linked = refs(package, 'case_ids', case_index, where)
        for identifier in linked:
            if identifier in case_index and package.get('id') not in case_index[identifier].get('package_ids', []):
                errors.append(f'{where}: case {identifier} has no reciprocal package link')
    for case in cases:
        for identifier in case.get('package_ids', []) if isinstance(case.get('package_ids', []), list) else []:
            if identifier in package_index and case.get('id') not in package_index[identifier].get('case_ids', []):
                errors.append(f'case {case.get("id")}: missing reciprocal link in package {identifier}')
    for issue in issues:
        where = f'issue {issue.get("id")}'
        require(issue, ['type', 'actual', 'recommendation', 'acceptance', 'status'], where)
        refs(issue, 'case_ids', case_index, where, True)
        refs(issue, 'source_ids', sources, where)
        refs(issue, 'evidence_ids', evidence, where)
        if issue.get('status') == '已关闭' and not issue.get('evidence_ids'):
            errors.append(f'{where}: closed issue needs retest evidence')

    counts = {layer: dict(Counter(c.get('result') for c in cases if c.get('layer') == layer)) for layer in ['template', 'business']}
    return {'ok': not errors, 'record_validation_only': True, 'case_counts': counts, 'step_counts': dict(step_counts), 'package_count': len(packages), 'issue_count': len(issues), 'errors': errors, 'warnings': warnings}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('record', type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.record.read_text(encoding='utf-8-sig'))
        result = validate(data, args.record.resolve().parent)
    except (OSError, ValueError, TypeError, KeyError) as exc:
        result = {'ok': False, 'record_validation_only': True, 'errors': [f'Cannot validate record: {exc}'], 'warnings': []}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
