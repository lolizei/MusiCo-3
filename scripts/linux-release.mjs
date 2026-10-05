import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const release = path.join(root, 'release/linux');
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const python = process.env.BEAT_BUILD_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const binary = await readFile(path.join(release, 'linux-unpacked/musico-3'));
if (!binary.subarray(0, 4).equals(Buffer.from([127, 69, 76, 70])) || binary[4] !== 2 || binary.readUInt16LE(18) !== 62) throw Error('Expected a Linux x86-64 ELF executable.');
const archive = (mode, source, target) => {
  const result = spawnSync(python, [path.join(root, 'scripts/linux-archive.py'), mode, source, target], { stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw Error('Linux archive failed; Python 3.10+ is required for packaging.');
};
await mkdir(release, { recursive: true });
const stage = await mkdtemp(path.join(release, 'source-'));
const source = path.join(stage, 'MusiCo-3-source'); await mkdir(source);
for (const name of ['src', 'public', 'build', 'desktop', 'scripts', 'docs', 'songs', 'steam', 'tests', '.gitignore', 'README.md', 'CHANGELOG.md', 'LICENSE', 'package.json', 'package-lock.json', 'electron-builder.yml', 'electron-builder-linux.cjs', 'index.html', 'tsconfig.json', 'vite.config.ts']) {
  await cp(path.join(root, name), path.join(source, name), { recursive: true, filter: entry => !['dist', 'extension-dist', 'artifacts'].includes(path.basename(entry)) && !entry.endsWith('.png') });
}
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const notices = ['# Bundled JavaScript dependencies', '', 'Application code: AGPL-3.0-or-later. Matching dependency sources and licenses are included in the source archive under vendor/.', ''];
for (const [location, info] of Object.entries(lock.packages)) {
  if (!location.startsWith('node_modules/') || info.dev) continue;
  const installed = path.join(root, location);
  await cp(installed, path.join(source, 'vendor', location), { recursive: true, filter: entry => path.basename(entry) !== 'node_modules' });
  const pkg = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  notices.push(`- ${pkg.name}@${pkg.version}: ${typeof pkg.license === 'string' ? pkg.license : 'see package license files'}`);
}
notices.push('', `Electron ${manifest.devDependencies.electron}: runtime/Chromium notices included with the executable.`, '', await readFile(path.join(root, 'docs/SAMPLE_LICENSES.md'), 'utf8'));
notices.push('', await readFile(path.join(root, 'docs/AUDIO_EXPORT_LICENSES.md'), 'utf8'));
await writeFile(path.join(source, 'THIRD_PARTY_NOTICES.md'), notices.join('\n') + '\n');
const sourceName = `MusiCo-3-${manifest.version}-linux-source.zip`;
archive('zip', source, path.join(release, sourceName));
const content = path.join(stage, 'content'); await mkdir(content);
await cp(path.join(release, 'linux-unpacked'), path.join(content, 'MusiCo-3'), { recursive: true });
await cp(path.join(release, sourceName), path.join(content, sourceName));
await cp(path.join(root, 'LICENSE'), path.join(content, 'LICENSE'));
await writeFile(path.join(content, 'THIRD_PARTY_NOTICES.md'), notices.join('\n') + '\n');
for (const name of ['LINUX.md', 'CUSTOMIZING.md', 'SAMPLES.md', 'SAMPLE_LICENSES.md', 'STEAM_RELEASE.md', 'SECURITY-REVIEW.md']) await cp(path.join(root, 'docs', name), path.join(content, name));
await cp(path.join(root, 'songs'), path.join(content, 'songs'), { recursive: true });
const archiveName = `MusiCo-3-${manifest.version}-linux-x64.tar.gz`;
archive('tar', content, path.join(release, archiveName));
const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile(path.join(release, 'SHA256SUMS.txt'), `${await sha256(path.join(release, archiveName))}  ${archiveName}\n${await sha256(path.join(release, sourceName))}  ${sourceName}\n`);
// Preserve a freshly assembled, complete depot folder, separate from Windows.
await writeFile(path.join(release, 'PACKAGE.json'), JSON.stringify({ version: manifest.version, platform: 'linux', arch: 'x64', content, launchExecutable: 'MusiCo-3/musico-3', runtimeTested: false, archive: archiveName, source: sourceName }, null, 2) + '\n');
console.log(`Linux package: ${path.join(release, archiveName)}\nSteam content: ${content}\nLinux launch/audio testing is still required.`);
