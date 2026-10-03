# Manual audio checklist

Run `npm run dev`, open Chrome, use headphones at low volume.

1. Page loads, terminal shows SYSTEM BOOT COMPLETE, status "ready ♡". No console errors.
2. EXAMPLES → "Your first beat" → RUN. You hear kick + snare within ~2s (first load downloads samples).
3. While playing, change "bd sd bd sd" to "bd bd sd bd", press Ctrl+Enter. Rhythm updates without restarting playback (it can change mid-cycle), no gap, no second copy playing.
4. Press Ctrl+Enter 5 times fast. Still exactly one copy playing (no flanging/doubling, no louder).
5. Type `BROKEN(((` on a new line, RUN. Friendly error, line highlighted, old music keeps playing.
6. Ctrl+. → silence within one cycle. STOP button does the same.
7. Load every example (1–6) and RUN each. Each makes the described sound; no "sound not found" warnings.
8. Turn off Wi-Fi, reload, run `$: note("c3 e3 g3").s("sawtooth")`. Synth plays; drum examples show a clear warning instead of failing silently.
9. First action after reload is Ctrl+Enter (no click). Audio still starts.
10. `set crt on`, `set animations on`, play the full track for 2 minutes while typing. No audio dropouts, typing stays responsive.
11. Ctrl+S, name it, reload. Project reopens with the same code. Theme persists.
12. Edit without saving, close the tab, reopen. Recovery dialog appears and restores the code.
13. In the editor: Ctrl+F search, Ctrl+Z/Ctrl+Shift+Z, autocomplete after typing `.` shows methods with explanations.

## Automated verification

From the project directory:

    npm ci
    npx playwright install chromium
    npm run typecheck
    npm test
    npm run build
    npm run test:smoke

Playwright is a development dependency so the smoke tests run on Windows and
Linux without machine-specific paths. The first suite builds with Vite and
real CodeMirror, replacing only Strudel for deterministic call counting.
The second suite serves the normal `dist/` production build using Vite preview
and the actual installed Strudel package. Run `npm run build` first.
Ports 4173 and 4174 must be free. Real sample checks require network access.
Screenshots are written under tests/smoke/ (call-count suite) and
 tests/smoke/artifacts/ (real suite).

A passing browser suite does **not** confirm audible sound. Please report
manual items 1–7 individually as pass/fail, including what you heard and any
terminal/console messages. Also check item 9 to confirm keyboard-only startup
on your own browser/audio device. Items 8 and 10–13 remain manual acceptance
checks even where portions have automated coverage.


## Output-level and resource-failure regressions

    npm run test:audio

This test observes Melody and Full track for 32 seconds each, measuring the
actual final live output gain node in both stereo channels. It ignores offline
reverb rendering and muted scheduling nodes. It asserts nonzero samples and
peaks below 0.9, records results to tests/smoke/artifacts/audio-levels.json,
and checks that blocked downloads stop playback, report once, and allow a
built-in synth to run. These finite measurements cannot guarantee headroom
for every random pattern outcome, user edit or extended session, and do not
replace a listening check. This is a test-only analyser, not an app visualizer.

For an existing saved Melody/Full track project, load the bundled example again
to pick up its revised gains. Saved project code is intentionally preserved.
After a failed sample download, restore access and reload before retrying the
same sample URL: Strudel caches failed requests. A sample fault stops all layers
so the status reports an actual stopped scheduler, even for mixed synth/drum code.

## Visible performance and keyboard activation

    npm run test:endurance

Opens an isolated, visible Chromium window on loopback port 4176. It requires
the normal browser user-activation policy and inspects startup without granting
a synthetic gesture: the AudioContext must remain suspended until Ctrl+Enter.
After sample warmup, it plays Full track for at least 120 seconds with CRT and
animations enabled, types into real CodeMirror, measures final output in each
five-second interval and records rendering/typing responsiveness and engine logs.
Reports and a screenshot go to tests/smoke/artifacts/. Run it alone to avoid
other test browsers competing for resources. It cannot hear dropouts or prove
performance on your own Brave profile/audio device.

## Command palette

Ctrl+Shift+P opens the palette from the editor or terminal; COMMANDS also opens
it. Try `th am`, select Amber CRT, and reload to check persistence. Use arrow
keys and Enter; Escape should restore the previous focus. Search for Sonic Pi:
it must stay disabled in the browser build; the Windows desktop build enables
the separately installed engine. Choose `set` to prepare terminal input. Choose save or
delete to verify their existing dialogs, including cancelling a deletion.
The smoke suite covers these actions and verifies palette RUN evaluates once.

Acceptance record: on 2026-10-03 the user reported items 1–7 passed by ear in
Brave, followed by “I think.” Treat this as qualified user confirmation; reopen
any item if a listening issue is reported. Items 8–10 retain the manual scope
described above.

## Beginner note/melody guide

    npm run test:beginner

Uses the real production build, CodeMirror and Strudel. Checks the accessible
note table, unsaved-work protection, snippet filtering/insertion/undo, CSS cat
frames, reduced motion and animation settings, plus 320px/390px layouts.
Evaluates all 53 snippets with suitable source patterns for effect fragments
and measures nonzero output/headroom for all five melody starters. Listen to
the starters yourself; automated PCM measurements are not listening acceptance.

## Sonic Pi bridge

    npm run test:sonic-pi -- "C:/Program Files/Sonic Pi"
    node tests/smoke/sonic-pi-desktop.mjs "C:/Program Files/Sonic Pi"

Requires a separate Sonic Pi **5.0.0** Windows installation. The runtime test
boots the actual owned daemon in a temporary profile, records synth/drum PCM
and STOP silence, exercises Ruby errors, rapid runs, queue cancellation, all
four starters and reconnect. The desktop test exercises the packaged renderer,
preload, selector, per-engine projects and restart/reconnect. Tests bypass the
native consent/picker only in an isolated test profile with an explicit test
installation path. That native UI still needs manual verification.

Manual: select Sonic Pi, reject the native prompt and ensure no runtime starts;
RUN again and accept/select the installed folder. Listen to all four starters,
repeat RUN five times, STOP, try a Ruby error, reconnect, save/reopen, and switch
between engines. Also verify stopping this app leaves a separate Sonic Pi GUI's
music intact, and that closing the app leaves no owned runtime processes.
Do not mark desktop/Sonic Pi audio accepted until the user confirms by ear.

## Packaged Windows checks

    npm run desktop:build
    npm run test:desktop
    node scripts/desktop-release.mjs
    npm run test:distribution

To repeat Sonic Pi desktop checks against that extracted copy as well, pass
the separately installed runtime path:

    npm run test:distribution -- "C:/Program Files/Sonic Pi"

Desktop tests use isolated profiles. The packaged-app test covers the secure
origin, renderer isolation, asset boundaries, real synth output/STOP silence,
editor search/undo/redo, palette themes, saved projects and restart persistence.
The distribution test extracts the final ZIP outside the project directory
and repeats the desktop checks against that copy, including verifying source
and customization guides are present. Debugging ports used by Playwright are
test-only; normal launches do not open a debugging port or web server. Connecting
Sonic Pi starts its owned runtime's loopback control sockets.
After these checks, run the listening checklist in the desktop app: the Brave
listening confirmation does not verify a separate desktop browser/audio device.
