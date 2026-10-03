# Changelog

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
