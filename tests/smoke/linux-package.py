"""Inspect a real Linux archive; does not substitute for launching on Linux."""
import hashlib
import json
import pathlib
import sys
import tarfile
import zipfile
import io

release = pathlib.Path(sys.argv[1])
pkg = json.loads((release / 'PACKAGE.json').read_text())
checks = 0
def check(condition, name):
    global checks
    if not condition:
        raise AssertionError(name)
    checks += 1
    print('PASS Linux package: ' + name)

with tarfile.open(release / pkg['archive'], 'r:gz') as archive:
    members = archive.getmembers()
    check(all(not pathlib.PurePosixPath(m.name).is_absolute() and '..' not in pathlib.PurePosixPath(m.name).parts for m in members), 'relative archive paths')
    check(all(not (m.mode & 0o7000) and not m.issym() and not m.islnk() for m in members), 'no privileged bits or links')
    prefix = 'MusiCo-3-Linux/'
    for name in ['musico-3', 'chrome_crashpad_handler', 'chrome-sandbox']:
        member = archive.getmember(prefix + 'MusiCo-3/' + name)
        check(member.mode == 0o755, name + ' executable permissions')
        binary = archive.extractfile(member).read()
        check(binary[:5] == b'\x7fELF\x02' and int.from_bytes(binary[18:20], 'little') == 62, name + ' actual x86-64 ELF')
    for name in ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'LINUX.md', 'SAMPLE_LICENSES.md', pkg['source']]:
        member = archive.getmember(prefix + name)
        check(member.mode == 0o644 and member.size > 0, name + ' included')
    source_bytes = archive.extractfile(prefix + pkg['source']).read()
    check(hashlib.sha256(source_bytes).digest() == hashlib.sha256((release / pkg['source']).read_bytes()).digest(), 'matching source archive')
    with zipfile.ZipFile(io.BytesIO(source_bytes)) as source:
        names = source.namelist()
        for suffix in ['src/engines/strudel/StrudelEngine.ts', 'desktop/main.mjs', 'scripts/linux-release.mjs', 'electron-builder-linux.cjs', 'docs/LINUX.md', 'vendor/node_modules/@strudel/web/package.json']:
            check('MusiCo-3-source/' + suffix in names, 'editable source: ' + suffix)
        check(sum(n.endswith('.mp3') and '/public/samples/piano/' in n for n in names) == 29, 'all 29 licensed piano samples in source')
check(pkg['runtimeTested'] is False, 'runtime verification accurately pending')
print(json.dumps({'checks': checks, 'runtimeTested': False}))
