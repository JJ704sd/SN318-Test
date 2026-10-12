"""Check Git publication content, including every XML part inside XLSX files.

This read-only check prints paths and rule names, never matching secret values.
Run from any directory: python tools/audit_publication.py --staged
"""
from pathlib import Path
from zipfile import ZipFile, BadZipFile
import argparse
import ipaddress
import json
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
RULES = {
    'private-key': re.compile(r'^\s*-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----', re.M),
    'provider-token': re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16})\b'),
    'registry-credential': re.compile(r'_auth(?:Token)?\s*=\s*(?!\$\{|<|\bYOUR_|\byour_|\bexample_)[A-Za-z0-9+/=_-]{20,}'),
    'embedded-credential': re.compile(r'(?i)(?:api[_-]?key|app[_-]?secret|access[_-]?token|password)\b[\x22\x27]?\s*[:=]\s*[\x22\x27]([A-Za-z0-9+/=_-]{32,})[\x22\x27]'),
    'internal-document-url': re.compile(r'https?://[^\s<>\x22\x27]*(?:feishu\.cn|larksuite\.com)/[^\s<>\x22\x27]+'),
    'local-user-path': re.compile(r'(?:[A-Z]:[/\\]+[U]sers[/\\]+[^\s<>\x22\x27]+|(?<![\w])/[U]sers/[^/\s]+/|(?<![\w])/[h]ome/[^/\s]+/)', re.I),
    'source-record-id': re.compile(r'(?<![\w])rec(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{10,}'),
}
EXAMPLE_VALUE = re.compile(r'^(?:example|dummy|synthetic|your_|test_|x{6,})', re.I)
PRIVATE_EXTENSIONS = {'.pem', '.key', '.p12', '.pfx', '.db', '.sqlite', '.sqlite3', '.log', '.zip'}
EXCLUDED_PARTS = {'node_modules', '.git', '.work', 'outputs', 'dist', 'coverage', '.cache'}

def git(*args):
    return subprocess.check_output(['git', '-c', 'safe.directory=' + ROOT.as_posix(), '-C', str(ROOT), *args])

def problems(text):
    for label, pattern in RULES.items():
        match = pattern.search(text)
        if match and not (label == 'embedded-credential' and EXAMPLE_VALUE.match(match[1])):
            yield label
    for match in re.finditer(r'https?://(?:[^/@\s]+@)?(\d+\.\d+\.\d+\.\d+)', text):
        try:
            address = ipaddress.ip_address(match[1])
        except ValueError:
            continue
        if not address.is_loopback and not address.is_unspecified:
            yield 'literal-server-address'

def check_package(data):
    import io
    with ZipFile(io.BytesIO(data)) as z:
        bad = z.testzip()
        if bad:
            yield bad, 'corrupt-package'
        names = z.namelist()
        for name in names:
            if name.startswith(('xl/media/', 'xl/embeddings/', 'xl/externalLinks/')):
                yield name, 'unreviewed-embedded-content'
            if name == 'docProps/custom.xml' or name.startswith('docProps/thumbnail'):
                yield name, 'private-metadata'
            if name.endswith(('.xml', '.rels')):
                raw = z.read(name)
                tree = ET.fromstring(raw)
                # Inspect parsed values as well as XML: escaped quotes must not hide tokens.
                text = raw.decode('utf-8') + '\n' + '\n'.join(tree.itertext())
                text += '\n' + '\n'.join(v for e in tree.iter() for v in e.attrib.values())
                for label in problems(text):
                    yield name, label

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--staged', action='store_true', help='Read all files from the Git index, not just changed files.')
    args = parser.parse_args()
    paths = [p for p in git('ls-files', '-z').decode('utf-8').split('\0') if p]
    findings = []
    packages = 0
    for relative in paths:
        path = Path(relative)
        if EXCLUDED_PARTS.intersection(path.parts) or path.name == '.npmrc' or path.suffix.lower() in PRIVATE_EXTENSIONS:
            findings.append({'file': relative, 'rule': 'private-or-generated-file'})
        data = git('show', ':' + relative) if args.staged else (ROOT / path).read_bytes()
        if path.suffix == '.xlsx':
            packages += 1
            try:
                for part, label in check_package(data):
                    findings.append({'file': relative, 'part': part, 'rule': label})
            except (BadZipFile, ET.ParseError):
                findings.append({'file': relative, 'rule': 'invalid-workbook'})
        elif path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.ico'}:
            for label in problems(data.decode('utf-8', errors='replace')):
                findings.append({'file': relative, 'rule': label})
    print(json.dumps({'files_checked': len(paths), 'workbooks_checked': packages, 'findings': findings}, ensure_ascii=False, indent=2))
    return bool(findings)

if __name__ == '__main__':
    raise SystemExit(main())
