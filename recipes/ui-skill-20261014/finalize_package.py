from pathlib import Path
import hashlib
import json
import re
import zipfile

root = Path(r'.')
skill = root / 'skills/sn318-ui-audit'
installed = Path(r'./private-local-path')
out = root / 'outputs/ui-audit-20261014'
out.mkdir(parents=True, exist_ok=True)
files = sorted(p for p in skill.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
links = []
for path in files:
    if path.suffix != '.md':
        continue
    for target in re.findall(r'\]\(([^)]+)\)', path.read_text(encoding='utf-8')):
        if '://' in target or target.startswith('#'):
            continue
        if not (path.parent / target.split('#', 1)[0]).exists():
            raise ValueError(f'Broken reference: {path.name}: {target}')
        links.append({'file': path.relative_to(skill).as_posix(), 'target': target})
manifest = []
for path in files:
    target = installed / path.relative_to(skill)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != digest:
        raise ValueError(f'Installed file mismatch: {path}')
    manifest.append({'path': path.relative_to(skill).as_posix(), 'sha256': digest, 'bytes': path.stat().st_size})
archive = out / 'sn318-ui-audit_20261014.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for path in files:
        bundle.write(path, 'sn318-ui-audit/' + path.relative_to(skill).as_posix())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert len(bundle.namelist()) == len(files)
    for item in manifest:
        assert hashlib.sha256(bundle.read('sn318-ui-audit/' + item['path'])).hexdigest() == item['sha256']
checks = json.loads((root / '.work/ui-skill-20261014/validator-checks.json').read_text(encoding='utf-8'))
report = {
    'skill': 'sn318-ui-audit', 'as_of': '2026-10-14',
    'frontmatter_validation': 'passed', 'script_checks': checks,
    'local_reference_links': len(links), 'installed_files_match': True,
    'archive': str(archive), 'archive_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'files': manifest,
    'independent_forward_check': {
        'completed': True,
        'material': 'synthetic evaluation, no external actions or original workbook edits',
        'output': str(root / '.work/ui-skill-20261014/evaluation-output.md'),
        'findings': 'branch verdicts, delivery-driven plan and existing human notes preserved; no blocking skill ambiguity',
    },
    'limits': ['Source documents are dated snapshots; latest remote revisions not re-fetched', 'Only live local login and list entry were checked this round; no 40-case or business batch rerun', 'Validator checks records and evidence file existence, not actual UI behavior'],
}
(out / 'sn318-ui-audit_validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'archive': str(archive), 'files': len(files), 'reference_links': len(links), 'installed_files_match': True, 'script_checks': checks['passed']}, ensure_ascii=False))
