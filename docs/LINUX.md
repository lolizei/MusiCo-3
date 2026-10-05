# Linux x64 desktop and Steam test build

Build with `npm run desktop:linux:share`. Packaging requires Node.js 22.12+,
Python 3.10+ and internet for the official Electron Linux runtime. No new
runtime dependency or Steamworks SDK is linked. Output is separate from Windows:
`release/linux/MusiCo-3-0.2.0-linux-x64.tar.gz`.

Extract and launch as your normal desktop user:

```sh
tar -xzf MusiCo-3-0.2.0-linux-x64.tar.gz
./MusiCo-3-Linux/MusiCo-3/musico-3
```

This is a native x86-64 Linux executable, not an ARM or Proton build. The
archive preserves executable permissions for Electron and its helpers. A
graphical session, Electron's system libraries, audio support and Chromium's
user-namespace sandbox are required. Do not run as root or disable the sandbox.
Some distributions restrict user namespaces; Linux compatibility must be
checked on the intended distribution. Steam Deck compatibility is unverified.

Strudel, the editor, project settings and offline synths/piano are included.
Drums need internet on first use. Sonic Pi is disabled on Linux: the existing
native bridge supports Windows only. The archive includes matching editable
application/dependency source, AGPL terms, Electron notices and sample credits.

## Steamworks setup

- App: 5067350. Windows depot: 5067351. Linux depot: 5067352.
- Configure 5067352 for **Linux only**, **all languages**, 64-bit, platform All.
  Configure 5067351 for **Windows only** to avoid conflicting mounted files.
- Save depot changes and add the Linux depot to the Developer Comp package
  and any other packages that should grant Linux access.
- Add a Linux 64-bit launch option: `MusiCo-3/musico-3`. Leave arguments and
  working directory empty. Retain the separate Windows launch option.
- Publish these configuration changes in Steamworks. This publishes metadata;
  it does not release the product on the store.

`npm run steam:prepare:linux` stages the Linux content and generates a
**preview-only** VDF. It neither uploads nor changes a live branch. After a
real Linux launch/audio test, upload through SteamCMD and verify the installed
executable permissions. When activating a build, retain the Windows depot's
existing manifest as well; a Linux-only build must not remove Windows content.
Uploading from Linux preserves filesystem modes. Uploading from Windows uses
explicit executable attributes in the generated VDF. Inspect the SteamCMD
preview manifest for flag 0x20 on `musico-3`, `chrome_crashpad_handler` and
`chrome-sandbox` before upload. Cross-host preview has verified these flags;
this does not establish Linux runtime compatibility.

## Verification and remaining acceptance

Combined Steam Build 25712174 is active on default. Server metadata confirms
Linux executable `MusiCo-3/musico-3`, Linux-only depot 5067352 and the retained
Windows manifest. This is a pre-release test build; the app is still unavailable
for public release. Direct startup was reported by a Linux user; Steam startup
currently fails after showing Running for several minutes. Audio is unverified.

### Diagnosing Steam launch failures

Close any directly launched copy first: the app allows one instance per profile.
Record the distribution, Steam installation type (native or Flatpak), installed
build ID and whether executable permissions were missing before `chmod +x`.
The upload preview marks the executable and both helpers executable, but the
installed files must also be checked on the affected machine.

To capture output, temporarily set Steam Properties → General → Launch Options:

```sh
%command% > /tmp/musico3-steam-launch.log 2>&1
```

Press Play, wait for the failure, then read that file. Remove the temporary
launch option afterwards. Review private paths before sharing the log. Steam's
runtime can differ from a terminal's environment; direct-launch warnings alone
do not diagnose a Steam crash. Do not disable the Chromium sandbox or change
system graphics permissions to work around an unidentified failure.

`npm run test:linux:package` checks the actual ELF binary, packaged assets,
archive contents, executable modes and matching source/license inclusion.
These checks can run on Windows and do not execute the Linux app.

Before publishing a Linux build, test on Linux: first launch, keyboard RUN,
offline synth and piano, drum downloads, `.shape(0.45)`, continuous update,
STOP silence, editor actions, projects/theme persistence, and WAV recording /
export. Repeat from a Steam installation, including uninstall/reinstall and
launch without a development server. Listen to the output. This build has
not yet passed those Linux runtime or listening checks.
