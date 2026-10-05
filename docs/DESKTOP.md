# MusiCo-3 for Windows

Extract `MusiCo-3-0.2.0-windows-x64.zip`, open `MusiCo-3-Windows/MusiCo-3` and
double-click `MusiCo-3.exe`. Keep all the files beside it. Windows 10/11,
64-bit x86 processor. No installation, Node.js or local web server is needed.
This first build is unsigned; Windows may show an unknown-publisher warning.
Use a copy obtained from the project owner and compare its SHA-256 checksum.
The Windows ZIP contains the executable, matching source ZIP, licenses and guides.

Press RUN or the default Ctrl+Enter; Ctrl+. stops playback. SETTINGS changes
the keyboard mappings and appearance. Project tabs preserve independent drafts. EXAMPLES provides six starting
points. Ctrl+Shift+P opens commands, theme choices and saved projects. The
terminal `help` command lists actions. See CUSTOMIZING.md for customization.

HELP → notes shows a pitch table and five melody starters. The snippets tab
offers 53 Strudel snippets with search and category filters. The guide cat
blinks/winks when animations are enabled; reduced motion keeps it still.

## Sonic Pi (Windows desktop, separate installation)

Install [Sonic Pi 5.0.0 from the official site](https://sonic-pi.net/#windows).
Select Sonic Pi in the engine selector. This opens a fresh Ruby project after
the normal unsaved-changes check; it does not translate Strudel code.
Press RUN, accept the native-code explanation, and choose the Sonic Pi
installation folder (normally `C:/Program Files/Sonic Pi`). A valid folder
contains VERSION and app/server/. Only 5.0.0 is supported by this bridge.

The app starts its own Sonic Pi daemon/audio session in a separate profile.
There is no need to start the Sonic Pi editor. The first connection can take
several seconds. Four Ruby starters are in the guide; Sonic Pi's bundled
drums work without Strudel's sample downloads. RUN replaces this app's previous
jobs, with about a two-second replacement gap while old audio tails are cleared;
Ctrl+. and STOP mute output and end those jobs. Closing
MusiCo-3 shuts down its runtime. A separately running Sonic Pi editor is not
controlled by this bridge. Its concurrent use/audio-device interaction still
needs a manual check on your machine.

Ruby executes in the external native runtime and can access files and programs.
After connecting, code in this app can invoke the Ruby bridge. Only run code
you trust. Automated tests measured output and exercised control/error paths;
listening, installation-picker and native consent checks remain manual.

Projects and settings are stored in this application's Windows user profile
(`%APPDATA%/MusiCo-3`), separately from Brave. Moving the app folder does not
move these projects. Before sharing a song, use `export` in the terminal and
send the resulting `.beat.json` file; recipients use `import`. Share the source
archive alongside the app when distributing this AGPL application.

Synths are bundled; the default drum sample manifest and sounds download over
HTTPS on first use. Internet access is needed for uncached samples. Audio output
depends on the selected Windows output device; repeat the manual checklist in
TESTING.md for this desktop build. Automated signal tests cannot hear sound.

The app loads a packaged `beat://app` origin with no web server.
Its renderer uses a sandbox, context isolation, no Node integration and no
general-purpose Node/shell bridge. The optional Sonic Pi preload exposes only
connect/run/stop/events; native connection requires consent. Popups, external navigation and device permission
requests are blocked. Strudel evaluates the code you type inside that renderer.
Sonic Pi's runtime and this app's reply socket use loopback sockets while
connected. This is a change from the original Strudel-only desktop build.

## Build your own

Extract the matching source ZIP, install Node.js 22.12 or newer, then run:

    npm ci
    npm run desktop
    npm run desktop:build
    npm run desktop:share

The app ZIP appears in `release/`. Electron and electron-builder are pinned
development dependencies: Electron supplies the desktop browser/audio runtime;
electron-builder packages the Windows application. Application
dependencies are installed from the lockfile. The official CodeMirror legacy
language modes supply Ruby highlighting. First build downloads the desktop runtime and
packaging tools. Build on Windows for this Windows target.
The downloader override pins @electron/get 5.1.0 to avoid a vulnerable cache
dependency in the builder's default downloader. The builder uses the already
installed, pinned Electron distribution instead of extracting a second runtime.

    npm run test:desktop

This runs isolated Electron sessions against the actual packaged application
at `release/win-unpacked/MusiCo-3.exe`, checking worklets/output, persistence,
editor actions and renderer isolation. It leaves your normal desktop profile
alone. Web smoke tests remain available through `npm run test:smoke`.

    npm run test:distribution

This extracts the final share ZIP to a temporary folder outside the project,
checks its source and guides, and repeats the packaged desktop checks there.
McAfee quarantined earlier self-extracting launchers and Discord rejected the
original 0.1.0 ZIP. The user supplied a VirusTotal link, whose contents could
not be verified through the available tool. This updated prerelease uses an
extracted application folder; its functional/provenance checks do not establish
malware clearance. See SECURITY-REVIEW.md in the source for details.

License: project AGPL-3.0-or-later; Strudel AGPL-3.0. The executable contains
Electron/Chromium license notices. Preserve licenses and matching source when
redistributing. No Steam-specific integration, DRM or signing is included.

Implementation references: [Electron protocols](https://www.electronjs.org/docs/latest/api/protocol),
[Electron security](https://www.electronjs.org/docs/latest/tutorial/security),
[electron-builder Windows targets](https://www.electron.build/v26/docs/win/).
