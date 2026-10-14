import hashlib
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

repo = Path(r'.\pcs-front').resolve()
backup_root = Path(r'.\.work\pcs-front-local').resolve()
stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
backup = backup_root / f'dev-sync-snapshot-{stamp}'
backup.mkdir()

def git(*args):
    return subprocess.check_output(['git', '-c', f'safe.directory={repo.as_posix()}', '-c', 'core.quotepath=false', *args], cwd=repo)

paths = set()
for args in [('diff', '--name-only', '-z'), ('diff', '--cached', '--name-only', '-z'), ('ls-files', '--others', '--exclude-standard', '-z')]:
    paths.update(p.decode('utf-8') for p in git(*args).split(b'\0') if p)

files = []
for relative in sorted(paths):
    source = (repo / relative).resolve()
    if not source.is_relative_to(repo):
        raise RuntimeError(f'Path outside repository: {relative}')
    if source.is_file():
        dest = backup / 'files' / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, dest)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if hashlib.sha256(dest.read_bytes()).hexdigest() != digest:
            raise RuntimeError(f'Backup hash mismatch: {relative}')
        files.append({'path': relative, 'sha256': digest, 'bytes': source.stat().st_size})
    else:
        files.append({'path': relative, 'deleted': True})

(backup / 'tracked.patch').write_bytes(git('diff', '--binary'))
(backup / 'staged.patch').write_bytes(git('diff', '--cached', '--binary'))
manifest = {
    'createdAt': datetime.now().astimezone().isoformat(),
    'repository': str(repo),
    'head': git('rev-parse', 'HEAD').decode().strip(),
    'target': git('rev-parse', 'origin/dev').decode().strip(),
    'branch': git('branch', '--show-current').decode().strip(),
    'files': files,
}
(backup / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
(backup_root / 'latest-dev-sync-snapshot.json').write_text(json.dumps({'path': str(backup)}, indent=2), encoding='utf-8')
print(json.dumps({'backup': str(backup), 'files': len(files), 'allCopiedHashesMatch': True}))
