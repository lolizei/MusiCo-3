# MusiCo-3 — BEAT.EXE ♡ terminal music studio

Live coding music editor with a retro hacker-terminal look. Strudel is the first engine.

    npm install
    npm run dev        # http://localhost:5173
    npm test           # unit tests (node:test via tsx)
    npm run build      # typecheck + production build

## Structure

    src/app/          App shell, global shortcuts
    src/editor/       CodeMirror 6 editor, Strudel autocomplete
    src/engines/      adapter interface, registry, error explanations
    src/engines/strudel/  Strudel adapter (official @strudel/web), function docs
    src/projects/     project store (localStorage), session hook, examples
    src/terminal/     app commands (no OS access), terminal UI
    src/themes/       themes as CSS variables
    src/settings/     persisted settings
    src/tutorials/    beginner panel, tutorial steps, snippets
    src/ui/           title bar, toolbar, status bar, dialogs, ASCII art
    tests/unit/       pure-logic + adapter tests
    tests/smoke/      Vite browser tests (real editor; call-counting and real-Strudel suites)

## Status (v0.1.0 — Milestone A accepted; Milestone B in progress)

Verified locally on Windows with installed packages:
- `npm install` succeeded; package-lock.json records @strudel/web 1.3.0.
- Full strict `npm run typecheck`, including React, CodeMirror and Strudel adapter.
- Production `npm run build`; Vite reports large bundle warnings only.
- 66/66 unit tests, including serial RUN, STOP cancellation and palette search.
- 40/40 call-counting smoke checks and 43/43 real production integration checks,
  including command palette interactions.
- Vite smoke tests use the real CodeMirror editor. Only Strudel is replaced in
  the call-counting suite; the integration suite uses the normal production build.
- Real Strudel worklet loading, sample loading/evaluation and keyboard RUN/STOP.
- Real editor search/replace, completion information and undo/redo.
- Mobile layout checked at 390px and 320px.
- 15/15 visible endurance checks: audio stays suspended until keyboard RUN under
  normal user-activation policy; 120 seconds of Full track with CRT/animations
  and typing retains real output with no measured clipping, long rendering
  freeze or steady-playback skip/error logs. This does not verify audibility.

Checklist follow-up implemented:
- Melody and Full track have lower layer gains; saved project code is unchanged.
- Sample access/decoding failures stop playback and show a recoverable unavailable status, with one explanation per RUN attempt.
- Update messages describe continuous playback without promising next-cycle timing.
- 11/11 output/resource integration checks pass. Over 32 seconds per example, measured peaks were 0.5022 (Melody) and 0.6969 (Full track), with no full-scale samples observed.
- `npm run test:audio` measures both final live output channels and tests blocked sample downloads using the real Strudel build. Results are saved in tests/smoke/artifacts/audio-levels.json.

The user confirmed checklist items 1–7 by ear in Brave, then qualified that
confirmation with “I think.” Milestone A is accepted on that reported result;
any subsequently noticed sound issue should be reopened. Instrumental output
measurements alone are not listening verification.

Milestone B implemented and verified in automated browser tests:
- Ctrl+Shift+P or COMMANDS opens a searchable command palette.
- Fuzzy search includes all terminal commands/aliases, themes, examples, saved
  project actions and available engine choices. Unsupported engines stay disabled.
- Commands needing arguments prepare terminal input; existing save/delete and
  unsaved-work dialogs remain in use. Escape restores focus.
- Multiple editor tabs and configurable keyboard shortcuts remain to implement.

Manual checks still useful: offline reload (item 8), first keyboard RUN in your
own Brave profile (item 9), and audible performance with visible effects (item 10).

Run `npx playwright install chromium` once, then `npm run test:smoke`.
Playwright is a development dependency for portable browser tests.
See docs/STRUDEL_API.md for the installed package source audit.
Phases 3–4 remain deferred while Milestone B is in progress.

## Known limitations

- Strudel is AGPL-3.0; the project is licensed AGPL-3.0-or-later. A Steam release must offer source.
- Drum samples (github:tidalcycles/dirt-samples) need internet on first use. Synths work offline.
- Ctrl+N can't be captured in Chrome; new project is Alt+N.
- No BPM display: the tempo can't be read back from Strudel reliably.
- Sonic Pi is listed but disabled (not implemented).

See docs/TESTING.md for the manual audio checklist.

## License

This project is licensed under GNU AGPL-3.0-or-later. See [LICENSE](LICENSE).
The Strudel dependency is licensed under AGPL-3.0.
