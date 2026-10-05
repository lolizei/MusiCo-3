"""Portable build-only archive helper; Linux executable modes survive Windows hosting."""
import pathlib
import sys
import tarfile
import zipfile

mode, source_arg, archive_arg = sys.argv[1:]
source = pathlib.Path(source_arg).resolve()
archive = pathlib.Path(archive_arg).resolve()
if not source.is_dir() or archive.is_relative_to(source):
    raise ValueError('Archive must be outside its source directory')
if mode == 'zip':
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
        for file in sorted(source.rglob('*')):
            if file.is_file():
                output.write(file, pathlib.Path(source.name) / file.relative_to(source))
elif mode == 'tar':
    executable = {'musico-3', 'chrome_crashpad_handler', 'chrome-sandbox'}
    def attributes(info):
        # No SUID bits or privileged install script; use Chromium's normal
        # user-namespace sandbox. Never work around sandbox failures by disabling it.
        info.mode = 0o755 if info.isdir() or pathlib.PurePosixPath(info.name).name in executable else 0o644
        info.uid = info.gid = 0
        info.uname = info.gname = ''
        return info
    with tarfile.open(archive, 'w:gz') as output:
        output.add(source, arcname='MusiCo-3-Linux', filter=attributes)
else:
    raise ValueError('Unsupported archive format')
