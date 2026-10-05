# Changelog

## 0.2.0 development — Project tabs and customization
- Uploaded checked Windows compact live-piano, note-view, snippet-preview and
  guarded quit/exit build to Steam on 2026-10-05: Build **25726762**, Windows
  manifest 6606718254681447401. Matching app/source hashes, combined preview
  and Linux executable flags verified. Existing Linux manifest
  1803617613340275726 reused with zero changed files. Branch activation remains
  pending; no public store release. Uploaded binaries are the previously tested
  candidate (155 unit tests, 177 smoke checks, 11 audio checks; compact piano
  verified with 16 browser and 16 packaged Windows checks).

- Made the live piano compact: maximum width 520px, proportional height and
  responsive scaling to fit narrow panels, with readable key-label sizing.
  Verified build/typecheck and 16 real-browser / 16 packaged Windows checks.

- Added Live piano mode beside the note-view toggle: animated note bars and
  traditional piano keys follow actual Strudel output-trigger pitches, sound
  names and target AudioContext times. Non-dominant observation preserves
  existing audio output and user triggers. Post-output durations are read in
  seconds, avoiding a second tempo/clip conversion. Handles chords, scales,
  rests, updates, STOP and previews; respects reduced motion/animations off
  and pauses rendering while hidden. Bounded event buffer, isolated 20 Hz
  rendering, no added dependencies or extra playback. Verified strict build /
  typecheck, 155 unit tests, 177 existing smoke checks, 15 live-piano browser
  and 15 Windows checks, 17 Windows preview/quit regressions and 11 real-output
  checks. Piano plays with external networking blocked; output is measured,
  listening and Linux runtime remain manual. No Steam upload.

- Added an evaluated Strudel piano note view below the editor, displaying
  actual note/chord/rest timing over the first four cycles of the last
  successful RUN or preview. Added previews for built-in snippets and personal
  Strudel starters; effects and tempo snippets use an audible demo melody.
  Previews replace playback on the singleton engine without editing projects;
  STOP cancels queued previews and RUN returns to editor code. Added desktop
  `quit` / `exit` through an origin-checked preload IPC and normal window-close
  handling, preserving unsaved project and recording warnings. Browser quit
  explains the desktop requirement. No dependencies added.
  Verified strict build/typecheck, 150 unit tests, 177 existing smoke checks,
  10 call-counting preview checks, 16 real-browser checks and 17 packaged
  Windows checks, including native Stay and clean Exit. Preview audio was
  measured from the real final output; listening remains manual. Not uploaded
  to Steam; Linux runtime checks remain pending.

- Addressed Windows tester feedback: added worker-based lossless FLAC exports
  beside WAV, with actual compression savings and exact PCM16/sample-rate
  preservation; added libflacjs 5.6.0 with MIT/BSD notices in distributions.
  Added separate editor, terminal, guide and menu fonts, including an optional
  installed-font list and safe persisted family names; kept ASCII monospace.
  Aligned shortcut controls, changed alternatives to “or”, and explained the
  disabled Stop Clear button. Added a session audio-output list on the existing
  AudioContext and explicit reduced-motion/animations-off preview messages.
  Verified 144 unit tests, strict build/typecheck, 177 existing smoke checks,
  18 feedback browser checks, 19 packaged Windows feedback checks and 14
  recording checks. Real FLAC roundtrips reproduce both WAV channels exactly.
  Full extracted Windows ZIP distribution checks passed; matching source now
  also includes the Linux packaging configuration.
  Physical output switching/listening is manual. Uploaded Steam Build 25714881
  on 2026-10-04; preview and upload verified, unchanged Linux manifest retained.
  Branch activation is pending; no public product release performed.

- Uploaded and activated combined Windows/Linux Steam Build 25712174 on
  2026-10-04, retaining the unchanged Windows manifest. Published separate
  OS launch/depot settings and assigned Linux to the access packages. Linux
  executable attributes are explicitly mapped for Windows-hosted uploads;
  SteamCMD preview verifies flag 0x20 for Electron and both helpers.
  Fresh server metadata verifies the active build and unavailable release state.
  User reports direct Linux startup but Steam exits after several minutes;
  launch diagnostics are pending, with Linux listening still unverified.

- Added separate native Linux x64 cross-packaging using official Electron,
  TAR.GZ executable permissions, matching application/dependency source,
  sample credits and preview-only Steam depot 5067352 staging. Disabled the
  Windows-only Sonic Pi bridge on Linux. Added platform/preparation unit tests
  and actual ELF/archive/ASAR/source checks. Linux runtime, audio and Steam
  installation acceptance remain pending; see combined upload status above.
  Verified strict build/typecheck, 141 unit tests, 177 browser checks,
  16 Windows desktop regression checks and 23 Linux static package groups;
  official Electron Linux archive SHA-256 verified against release checksums.

- Uploaded the checked Windows update to Steam on 2026-10-04: Build 25711609,
  App 5067350 / depot 5067351. Includes offline piano, user sample sharing,
  piano roll, effect-worklet fix and matching source/licenses. SteamPipe preview
  verified 97 mapped files; upload success and staged app/source hashes verified.
  Branch activation remains separate; no public product release occurred.

- Added user-managed sample sources (SAMPLES / samples / sounds): validated
  HTTPS and GitHub map URLs, author/license metadata, JSON import/export,
  bounded and cancelable sound-list inspection, new-tab demos, confirmed deletion
  and undoable setup insertion before existing music. Source imports do not run
  code. Songs share their loader through existing copy/project/library features.
- Bundled 29 unmodified Salamander Grand Piano V3 MP3 files (Alexander Holm,
  CC BY 3.0), with upstream revision/hashes and attribution in the app, piano
  demo/roll code, editable sources and distribution notices. Piano works offline.
  Kept RolandTR808 excluded while redistribution permission is unresolved.
- Added pure validation/storage/provenance tests and real Strudel browser/desktop
  sample-source checks. No added dependencies or changes to the engine singleton,
  serialized RUN or desktop CSP. Audio measurements do not replace listening.
  Included in uploaded Steam Build 25711609; activation remains pending.
  Verified strict typecheck/build, 139 unit tests, 177 smoke checks, 11 audio
  checks, 75 beginner checks, 14 browser recording checks and 22 desktop sample
  checks with real output. Rebuilt Windows distribution and matching source.


- Fixed desktop AudioWorklet loading: Strudel's embedded data modules were
  blocked by the package policy, and upstream initAudio swallowed that failure.
  Emit the installed bundle's exact worklet modules as local assets without
  relaxing CSP or adding dependencies. Include the build plugin in matching
  source archives and strict typechecking.
- Await exported loadWorklets before evaluation, cache readiness per context,
  and classify missing processors/loading failures as audio errors. Stop once
  per RUN attempt rather than repeat errors or suggest fixing brackets.
- Added regression coverage for keyboard-first shape, crush/coarse/DJF,
  the user's full track, restrictive desktop CSP and deliberate loading failure.
  Piano was subsequently bundled by the sample update above; RolandTR808
  remains excluded pending redistribution permission.
  Verified strict typecheck/build, 128 unit tests, 154 smoke checks, 11 audio
  checks, 14 browser / 12 desktop recording checks, 16 desktop checks and nine
  desktop effect checks. Rebuilt the Windows package with matching source and
  build plugin. Measured output does not establish listening quality; this fix
  has not been uploaded to Steam.


- Added a persistent 16-step piano sketch: chords, held notes, four drum tracks,
  tempo, octave, synth choices, Undo/Redo, keyboard grid navigation and generated
  Strudel code. Creation opens a new tab and preserves existing code. Sketches
  validate saved data and report storage failures without overwriting corrupt
  originals. No automatic recording transcription or simulated playback.
- Added COPY CODE, `copy` / `copycode`, and `pianoroll` / `roll` commands;
  `cmd` aliases app help. Blocked clipboard writes offer selectable code.
  Desktop clipboard permission is restricted to sanitized writes from the app
  origin; clipboard reading remains denied to the renderer.
- Hid the terminal scrollbar while preserving scrolling and keyboard focus;
  other scrollbars use theme colors. Verified 124 unit tests, 23 new browser
  checks and 22 packaged desktop piano/copy checks with real Strudel output.
  Corrected the beginner test's meter installation to precede master-output
  initialization. These additions are not in Steam Build 25710007.


- Published owner-approved Steam application settings on 2026-10-04, fixing
  the empty launch configuration behind the Steam launch error. Verified Steam's
  publication success and fresh metadata: Windows x64, executable
  MusiCo-3/MusiCo-3.exe, name code for music and ReleaseState unavailable.
  Build 25710007 is installed and its app archive matches the checked release.
  This is application-configuration publication, not a public product launch.
  Restarted Steam; verified the installed app window and Steam's successful
  LaunchApp Completed log. No listening result is inferred from launch success.

- Uploaded the checked Windows package with matching source/licenses to Steam
  on 2026-10-04: App 5067350, depot 5067351, Build 25710007. All four staging
  checks passed; SteamPipe preview and the fresh upload success log were verified.
  No automatic branch activation or public release was configured. Installation
  and updates through Steam still require acceptance testing.

- Added persisted master volume/mute, measured stereo output meters and direct
  post-volume WAV recording/export for Strudel. Capture uses an AudioWorklet,
  stereo PCM16 and the actual context rate, with a five-minute cap. STOP finishes
  recording, project changes retain the take, replacement requires confirmation,
  and closure warns before losing recordings. Worklet failures preserve captured
  audio and cannot leave Finish waiting indefinitely. Sonic Pi remains disabled
  for these controls. No new dependencies or simulated output.
- Fixed a false desktop startup error when reload supersedes the initial load
  (ERR_ABORTED). Updated the native unsaved-work message to include recordings.
  Rebuilt Windows packaging, including recent guide, library and companion work.
  Verified strict typecheck/build, 119 unit tests, 123 existing smoke checks,
  11 real audio/resource checks, 14 browser and 12 packaged desktop recording
  checks. Signal checks establish attenuation, silence and valid nonzero PCM;
  desktop listening and Steam distribution remain manual/pending.
  Also passed 16 packaged desktop checks and 15 visible two-minute endurance
  checks: continuous measured output, no clipping/skip errors and responsive
  painting/typing. The meter is verified; waveform/spectrum remain deferred.

- Removed the guide close X and unified guide visibility with the persisted
  beginner toggle, HELP and palette actions, fixing the two-click reopening.
- Added a personal melody/snippet library per engine with editor copying,
  search, load, undoable insertion, confirmed deletion and versioned JSON
  import/export. Imports preserve originals and never execute code; validation,
  corrupt storage and quota errors keep existing data intact.
- Added bundled developer engine discovery, validated descriptors, load/factory
  error isolation, engine-specific project starters and a singleton RUN/STOP
  guard. Extensions require trusted source and rebuilding. Added API/testing/
  license documentation; no arbitrary runtime installer or new dependencies.
  Verified 115 unit tests, strict typecheck/build and 219 browser checks:
  90 existing smoke, 23 library/help, 10 isolated real-output extension,
  21 terminal companions and 75 beginner checks. Desktop packaging/testing and
  Steam distribution of these changes remain pending; no listening claim.

- Added four selectable terminal ASCII companions (cat, bunny, robot, stars),
  None, a Settings preview and persisted slow/normal/fast speed. Terminal
  mascot/mascotspeed settings support Tab completion. Art stays outside the
  live log, appears only during playback, and respects global animations and
  reduced motion with a still frame. No timers, audio changes or dependencies.
  Verified strict typecheck/build, 103 unit tests, 90 existing smoke checks
  and 21 real-production companion checks (including nonzero live Strudel
  output and persistence). Desktop packaging/Steam distribution of this
  addition remains pending; the uploaded build predates these companions.

- Added Windowlight, an original editable/importable 74 BPM lo-fi composition
  with synthesized keys, bass, melody and percussion, plus YouTube usage and
  customization instructions. No sample downloads or new dependencies.
- Added a composition recorder using the actual production app's Strudel output
  with external requests blocked, signal/error checks, soft export fades and
  ffmpeg WAV/MP3 encoding. Verified a 180-second Windowlight recording without
  external resources or browser errors: live peak 0.1495, WAV peak 0.1478,
  no measured clipping. 99 unit tests/typecheck pass; listening remains manual.

- Added an opt-in, skippable startup welcome, preserving first keyboard RUN
  and mouse actions; reduced motion/animations off bypass it. Verified 13
  production-browser and 13 Windows desktop checks, including real audio,
  persistence and mobile layout. Hidden native tests skip screenshot capture;
  painted visuals are verified separately in the real production browser.
- Added local Steam content staging and validated preview-only VDF generation
  for App 5067350, depot 5067351 and provisional name code for music. Staging
  includes matching source/licenses; no Steam upload or public branch change.
- Added four settings/Steam-config unit tests (99 total). App branding and
  persistent user-data paths remain stable while the store name is provisional.

- Added a decorative ASCII headphone bunny beside the guide cat, shown during
  Strudel or Sonic Pi playback. CSS frames respect animations off and reduced
  motion, with no new timer, dependency or audio measurement claims.
- Recorded the owner's Steam Direct fee payment report (2026-10-04). Actual
  payment date/App ID and store/depot setup are still to confirm.

- Completed Milestone B with independent project tabs, per-tab dirty state,
  in-session CodeMirror cursor/undo/redo history, saved workspace restoration
  and multi-tab draft recovery. New/open/import/save-copy preserve existing
  work; tab close asks before discarding and switching stops the single engine.
- Added discoverable SETTINGS, a customize command and palette entry. Persisted
  keyboard bindings reject collisions, unsafe/reserved chords and AltGr;
  current keys appear in toolbar/help/guide and defaults can be reset.
- Added Vaporwave Dreams, Sakura Terminal, Cyberpunk Pink and Classic CMD,
  a color customizer, persistent custom palette and validated versioned theme
  JSON import/export. Invalid imports do not change the active theme.
- Added storage-failure feedback, a focus-contained keyboard-accessible settings
  modal and responsive tabs/settings. No new dependencies; singleton serialized
  RUN and honest engine capabilities are preserved.
- Added 13 pure-logic tests (95 total) and 46 checks in each of call-counting and
  real production customization suites, including save-copy, recovery, editor
  history, remapped real audio and mobile layouts.
- Verified 48 Windows desktop customization checks. Added a native Stay/Leave
  confirmation for unsaved projects on close/reload; automated checks cover
  cancellation and recovery, while visible native dialog acceptance remains manual.
- Included the original Lanterns at Dusk Strudel composition in source archives.
  Added a free Steam release plan documenting costs, AGPL/Steamworks SDK
  compatibility concerns and outstanding antivirus/native listening acceptance.
- Phase 3 startup animation and real-output visualization remain future work.
  Steam publication and new listening/scanner clearance are not claimed.


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
