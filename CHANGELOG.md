# Changelog

## 0.1.1 prerelease — Beginner music guide and desktop Sonic Pi (2026-10-03)

- Added a C-major note/MIDI/scale-degree table, pitch/rhythm explanations and
  five melody starters using bundled synths at conservative gain.
- Expanded Strudel snippets from 17 to 53 with search, category filtering and
  visible descriptions. Isolated snippet insertions in CodeMirror undo history.
- Added a CSS-only blinking/winking ASCII guide cat, honoring the animation
  setting and reduced-motion preference; verified mobile help layouts.
- Implemented the user-approved desktop-first Sonic Pi bridge for separately
  installed Sonic Pi 5.0.0, with an owned daemon/profile and loopback OSC replies.
  Added native consent, installation selection, Ruby highlighting, four Ruby
  starters, per-engine projects, serialized job replacement and STOP cancellation.
  Browser builds keep this engine disabled; seamless updates/visualization stay
  false. Added one production dependency, the official CodeMirror legacy modes,
  to supply Ruby highlighting.
- Verified 82 unit tests, strict typecheck/build, 75 beginner browser checks,
  real Sonic Pi synth recording, errors, rapid RUN/STOP, and 16 desktop engine
  integration checks. Listening and native installation-picker/consent flows
  remain manual; this does not complete the Sonic Pi acceptance checklist.
- GitHub distribution is a prerelease with the earlier Discord warning and
  linked VirusTotal report disclosed, without claiming malware clearance.

## Unreleased — Distribution security review (2026-10-03)

- Recorded Discord's rejection of the Windows share ZIP and confirmed McAfee's quarantine of earlier, separate self-extracting EXEs. GitHub binary publication remains pending scanner review.
- Verified the cached Electron archive against official release checksums, compared runtime files and non-resource executable sections, and checked packaged application code against the local build. Added a repeatable provenance check and a review record; these checks are not antivirus clearance.

## Unreleased — Windows desktop distribution (2026-10-03)

- Added a standalone Windows x64 Electron application ZIP with the existing BEAT.EXE editor and Strudel engine, no external dev server or Node installation required for users. Extract and run MusiCo-3.exe alongside its bundled runtime files.
- Added a secure packaged protocol, renderer sandbox/context isolation, navigation and popup restrictions, a single-instance lock and a separate persistent desktop profile. No privileged preload bridge or renderer Node access.
- Added reproducible desktop/share scripts, a matching editable source ZIP including installed production dependency sources/licenses, customization guides and SHA-256 checksums. Build artifacts are ignored by Git. The executable is unsigned.
- Added Electron 44.5.1 and electron-builder 26.15.3 as development dependencies for desktop packaging. Pinned the builder downloader to @electron/get 5.1.0 to remove its vulnerable cache dependency; npm audit reports zero vulnerabilities.
- Strict typecheck/build, 68 unit tests, 83 web smoke checks, 11 output/resource checks and 16 packaged desktop checks passed. Desktop tests measured real synth/drum output and STOP silence and verified editor actions and persistence; desktop listening remains manual.

## Unreleased — Milestone B command palette (2026-10-03)

- Accepted Milestone A after the user reported checklist items 1–7 passed by ear in Brave, with their subsequent “I think” caveat recorded. Instrumental measurements do not substitute for listening.
- Added a Ctrl+Shift+P / COMMANDS palette with fuzzy search over the terminal command catalogue, aliases, themes, examples, saved projects and engine choices. Existing dialogs handle save, deletion and unsaved changes; unsupported engines remain disabled. Required arguments are prepared in the terminal.
- Kept search/catalogue logic outside React, with six unit tests; added real-editor palette interaction checks and a call-count regression for palette RUN.
- Verified strict typecheck/build, 66 unit tests, 40 call-counting smoke checks, 43 real production checks and 11 output/resource checks. Latest 32-second peaks: Melody 0.4936 and Full track 0.6962, with no full-scale samples observed.
- Added a visible two-minute Chromium playback/typing test with normal user-activation requirements and final-output measurement. Cold sample-fetch warnings are recorded separately from steady playback.
- All 15 endurance checks passed in a visible isolated Chromium window: keyboard activation, real output in every measured interval, retained typing, no full-scale samples, rendering freeze over one second or steady-playback skip/error logs. Listening in the user's Brave profile remains a separate manual check.
- Multiple editor tabs and persisted shortcut customization remain pending; Milestone B is not complete. No production dependencies added.

## Unreleased — Checklist follow-up (2026-10-03)

- Reduced all layers in Melody and Full track by approximately 65% to leave output headroom; saved user projects retain their existing code.
- Added sample-download/decoding explanations, stopped the scheduler on resource failure, and exposed a recoverable 'stopped: sound unavailable' status. Resource errors appear once per RUN attempt; failed sample fetches are cached upstream and require reload to retry the same URL.
- Replaced the inaccurate next-cycle update promise with wording about continuous playback; updated the manual checklist.
- Added pure diagnostic tests, engine resource-failure tests, and a real-output measurement/blocked-download suite (`npm run test:audio`). It measures both final stereo channels and asserts nonzero output and no full-scale peaks during finite observations. No visualizer or synthetic audio data added.
- Verified strict typecheck/build, 60 unit tests, 69 UI/production smoke checks and 11 real-output/resource checks. Observed peaks: Melody 0.5022, Full track 0.6969 over 32 seconds each; no full-scale samples observed.
- The supplied checklist report used instrumental measurements, not listening. Milestone A remains pending human checks in Brave, including keyboard startup and visible-effects performance.

## Unreleased — Milestone A (2026-10-03)

- Installed and locked actual dependencies; full strict TypeScript check and Vite production build.
- Audited @strudel/web 1.3.0 source and supplied narrow local declarations because it ships no TypeScript types.
- Initialised audio worklets for keyboard-only RUN and cancelled queued/in-flight playback after STOP.
- Used real CodeMirror in portable Vite smoke builds; added an unaliased production integration suite.
- Fixed mobile engine-control overflow, Windows Ctrl+Shift+Z redo and method completion immediately after a dot.
- Replaced decorative meter bars with music notes so playback status cannot be mistaken for real audio visualisation.
- Added Playwright as a development dependency for reproducible browser verification; @codemirror/commands is now declared directly for the redo binding (already present transitively).
- Audio listening checklist remains pending; Milestone A is not complete until the user confirms items 1–7. No Phase 2–4 features implemented.
