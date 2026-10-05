# MusiCo:3 — BEAT.EXE ♡

A beginner-friendly live coding music studio with a retro terminal look, powered
by Strudel. Write a pattern, press RUN, and change the music while it plays.
The provisional Steam name is **code for music**.

## Get the app

Download the Windows x64 ZIP from [GitHub Releases](https://github.com/lolizei/MusiCo-3/releases).
Extract the complete ZIP, then open `MusiCo-3/MusiCo-3.exe` inside the extracted
folder. No Node.js, browser or development server is required. Keep the app's
support files alongside the executable.

Desktop builds are development prereleases and unsigned. Antivirus review of
earlier artifacts remains unresolved; no clean scanner verdict is claimed for
this build. See [the security review](docs/SECURITY-REVIEW.md).

Native Linux x64 packaging is available. The existing Steam Linux build is older
than the latest Windows build: direct startup was reported working, but Steam
launch stops after several minutes and remains under investigation. See
[Linux installation and diagnostics](docs/LINUX.md). Steam Deck is unverified.

## Make your first beat

1. Open HELP ♡ and choose an example, or paste the pattern below into the editor.
2. Press RUN or **Ctrl+Enter** (**Cmd+Enter** on macOS browsers).
3. Change the notes and press RUN again to update playback.
4. Use STOP or **Ctrl+. / Cmd+.** to silence playback.
5. Save your project to keep editable code. Recording/export saves audio instead.

```js
setcpm(90 / 4)
note("c4 e4 g4 e4").s("piano").gain(0.3)
```

The bundled Salamander piano and built-in synths work offline. Drum samples
normally download on first use. The [sample guide](docs/SAMPLES.md) explains
additional sources and sharing code with sample loaders.

## Features

- Real CodeMirror editor with search/replace, undo/redo and Strudel completions.
- Multiple project tabs, unsaved-work recovery and project JSON import/export.
- Searchable command palette, customizable shortcuts and a beginner music guide.
- Reusable personal snippets, library import/export and snippet previews that
  preserve editor code and use the same playback engine.
- Piano-roll sketch editor for notes, chords and drums; evaluated note view and
  a compact animated piano following actual Strudel note events and instruments.
- Themes, validated theme JSON import/export, panel fonts, CRT effects and
  customizable ASCII companions. Motion preferences respect reduced motion.
- Master volume/mute, actual output meters, WAV recording/export and lossless
  FLAC export of the same stereo PCM16 recording. Compression varies by song.
- Session audio-output selection where supported; System default otherwise.
- User-managed sample source lists and developer engine adapters from source.
- Experimental Windows Sonic Pi bridge, requiring a separate Sonic Pi 5.0.0
  installation and consent to run trusted Ruby. Disabled in browsers and Linux.

The note animation observes evaluated/triggered notes; it does not transcribe
arbitrary audio. Previews replace current playback on the singleton engine.

Useful terminal commands: `cmd` or `help`, `play`, `stop`, `copy`, `pianoroll`,
`samples`, `customize`, and desktop-only `quit` / `exit`. Quit preserves normal
unsaved-project and recording warnings. Terminal commands are app actions.

## Status — 0.2.0 development

The newest checked Windows build was uploaded to Steam on **2026-10-05** as
**Build 25726762**, including the compact live piano, note view, snippet previews
and guarded quit/exit. The existing Linux depot was retained unchanged.
**Branch activation is pending verification**; this upload did not perform a
public store release. Details: [Steam build status](steam/README.md).

Verified for this source/build:

- Strict TypeScript checking and Vite production build.
- 155 unit tests and 177 existing production/call-counting smoke checks.
- 11 real-output/resource checks, including blocked sample downloads.
- 16 live-piano browser checks and 16 packaged Windows checks; 17 packaged
  note-view, preview and quit regressions.
- Actual offline piano output, chord/scale highlights, rests, STOP, live updates,
  preview behavior and motion preferences. Staged app hashes match the tested app.

Signal measurements are not listening verification. The initial audio checklist
was accepted on the owner's qualified listening report. New piano/preview
listening, physical output switching and Linux Steam acceptance remain manual.
See [testing instructions](docs/TESTING.md) and [changelog](CHANGELOG.md).

## Develop and customize

Requires **Node.js 22.12+** and npm.

```sh
npm ci
npm run dev
```

The development server uses localhost. For checks:

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:smoke
npm run test:audio
npm run test:live-piano
npm run test:note-preview
```

`npm run build` creates the production web app. `npm run desktop:share` builds
the Windows ZIP with matching source and dependency licenses.
`npm run desktop:linux:share` creates the native Linux TAR.GZ (also requires
Python 3.10+). Steam preparation commands create preview-only staging; they do
not upload or activate a branch.

See [desktop packaging](docs/DESKTOP.md), [customization](docs/CUSTOMIZING.md),
[developer engine extensions](docs/ENGINE_EXTENSIONS.md),
[Strudel API audit](docs/STRUDEL_API.md) and [Steam preparation](docs/STEAM_RELEASE.md).

## Project structure

| Directory | Purpose |
| --- | --- |
| `src/app` | App shell, palette and global shortcuts |
| `src/editor` | CodeMirror, piano-roll editor and note visuals |
| `src/engines` | Adapter interface, singleton registry, Strudel and extensions |
| `src/audio` | Output controls, recording and audio export |
| `src/projects` | Saved projects, tabs, examples and recovery |
| `src/samples` | User sample sources and sharing |
| `src/settings`, `src/themes` | Persisted customization and theme validation |
| `src/terminal`, `src/tutorials`, `src/ui` | Commands, guides and interface |
| `desktop`, `build`, `scripts` | Desktop integration, worklet bundling and packaging |
| `tests/unit`, `tests/smoke` | Pure logic, browser, audio and packaged-app checks |

## Limits and licenses

Drums need a reachable sample source on first use. RolandTR808 is not bundled:
its redistribution permission has not been established. Additional sample packs
have their own terms; shared code does not grant sample redistribution rights.
See [sample licenses](docs/SAMPLE_LICENSES.md) and
[audio-export library licenses](docs/AUDIO_EXPORT_LICENSES.md).

No arbitrary-song transcription or automatic beat reconstruction is implemented.
Developer engines require rebuilding the app; importing a library JSON does not
install executable adapters. Browser new-project uses Alt+N because Ctrl+N is
reserved by Chrome. Reliable Strudel tempo readback is unavailable.

The application is **AGPL-3.0-or-later**; Strudel is AGPL-3.0. Distributions must
include matching corresponding source and license notices. Sample assets retain
their separate licenses. No Steamworks SDK is linked; any future SDK integration
requires a compatibility review. See [LICENSE](LICENSE) and the
[Steam release checklist](docs/STEAM_RELEASE.md).
