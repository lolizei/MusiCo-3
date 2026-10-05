# Manual audio checklist

## Live piano keyboard

Run `npm run test:live-piano` or `node tests/smoke/live-piano.mjs PATH_TO_EXE`.
Tests use the actual bundled piano with external networking blocked, measure
final output, verify exact chord/scale key highlights, advancing bars, rests,
STOP, instrument changes and motion preferences. No listening claim is inferred.
Use **live piano** below the editor, then RUN a song with `.s("piano")`.
Listen and compare the keys against the notes/chords; try a different instrument
and a snippet preview. Highlights describe scheduled note duration, so release
and reverb tails can remain audible after keys release. This is a note-event
visual, not audio transcription. Animations must be on and system reduced motion
off to animate. Closing the note panel pauses visual work, not playback.

## Windows tester feedback: FLAC, panel fonts, outputs and animations

Run `npm run test:feedback` and `node tests/smoke/tester-feedback.mjs PATH_TO_EXE`
for the packaged app. Unit tests decode real FLAC back to the exact PCM16 samples
at 44.1/48 kHz, including extrema and distinct stereo channels. Integration tests
record the real synth, download WAV/FLAC during playback and compare every decoded
sample, compression and sample rate. They verify actual font CSS/persistence,
named installed Windows fonts, output API/default routing, narrow shortcut grids,
advancing CSS frames and reduced-motion explanation. No listening verdict is inferred.

Manual: record a song, export both formats and play them in another player. Check
that duration and sound match. FLAC savings depend on the song. Try installed
fonts separately for each panel; missing fonts must fall back and ASCII must keep
its shape. With music playing, select headphones then speakers, confirm routing
and STOP by ear, unplug the selected device and check recovery. Use Refresh outputs
if the list changes; System default returns control to OS routing. Selection is
session-only and is not exclusive WASAPI or a bit-perfect playback guarantee.
Check terminal companions while playing: Animations on and system reduced motion
off should animate; otherwise Settings explains the still frame. None hides them.

## Native Linux package

Run `npm run desktop:linux:share` then `npm run test:linux:package`.
Static cross-host checks inspect the actual ELF architecture, TAR permissions,
ASAR assets, source and licenses. They do not launch Linux or confirm audio.
Follow [Linux acceptance](LINUX.md) on a Linux desktop and then from Steam.

## Effect worklets and the shape-processor regression

    npm run test:worklets
    node tests/smoke/worklets.mjs release/win-unpacked/MusiCo-3.exe

Tests keyboard-first `.shape(0.45)`, crush/coarse/DJF effects, same-origin
worklet URLs, ten seconds of the user's seven-layer track, measured output,
and no full-scale samples during that observation. Desktop mode also checks
the unchanged restrictive CSP. A forced module-load failure checks a stopped
status, an audio-specific explanation, and no repeating error messages.
There are eight browser checks and nine desktop checks. Distribution testing
also exercises these processors from the final ZIP outside the repository.

Manual: save/export before replacing or restarting the app. RUN the corrected
track with `.shape(0.45)` enabled, listen for its bass and other layers, and
verify STOP. RolandTR808 still requires an independently licensed sample source. The later
sample update bundles the Salamander piano; this effect fix alone did not.


## Piano roll, copy and terminal scrollbars

    npm run test:piano
    node tests/smoke/piano.mjs --desktop release/win-unpacked/MusiCo-3.exe

The browser suite has 23 checks, the packaged desktop suite 22. They use real
CodeMirror and Strudel and check weighted note playback, generated drum/chord
patterns, actual clipboard writes, the manual-copy fallback, preserved editor
tabs, independent sketch Undo/Redo, keyboard grid movement, held notes, close /
reopen persistence, mobile scrolling and storage failures. Browser mode also
checks corrupt draft preservation. Desktop testing uses an isolated profile.
Clipboard tests overwrite the system clipboard with fixture music code.
`npm run test:distribution` repeats the 22 desktop piano/copy checks from the
final ZIP extracted outside the repository, alongside the existing desktop,
customization and startup checks.

Manual: open PIANO ROLL, choose a note length, set C4/E4/G4 in one column,
then add a kick and snare. Create Strudel tab, RUN, and listen to the chord
and rhythm. STOP, copy the code into a text editor, and reopen the sketch.
Restart the app and verify the sketch remains. It is a one-bar builder, not
a transcription tool or a live representation of edited project code.
In the terminal, use `cmd`, `copy`, and `pianoroll`. Scroll old terminal lines
with the wheel or focus the output with Tab and use Page Up/Down. Other panels
keep visible scrollbars colored by the selected theme. Listening is manual.


## Personal libraries and developer engines

`npm run test:library` builds the real production app and checks guide toggles,
library saving/search/sharing/import rejection, per-engine filtering, undoable
insertion, real Strudel output, deletion, reload, quota handling and mobile
layouts. It then builds a separate extension-test app with an actual oscillator
adapter to check discovery, bad-import isolation, starter/editor selection,
output, live update, STOP silence and engine-specific libraries. This fixture
is never included in production dist or installed as an end-user engine.
The standard `npm run test:smoke` now also includes these 23 library/help and
10 extension checks after the existing 40 call-count and 50 real-Strudel checks.

Unit tests cover library limits/collision merging/corrupt data, descriptor
validation, import failures, serialized RUN, STOP during initialization and
evaluation, and adapter exceptions. See ENGINE_EXTENSIONS.md for the manual
and backend-specific tests required for each new engine. A working test tone
does not certify someone else's adapter. Desktop verification of these changes
and actual listening remain separate; the uploaded Steam build predates them.

## Customizable terminal companions

Run `npm run test:terminal` for real-production-browser checks of all four
ASCII choices, Settings preview, terminal commands, persisted selection/speed,
real Strudel playback, four-frame visibility, STOP/None, log separation,
animations off/reduced motion and 320px/390px layouts. No listening verdict
is inferred. Manually try SETTINGS → Terminal companion in the desktop build
after rebuilding it; the currently uploaded Steam build predates this feature.

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
Reports and a screenshot go to tests/smoke/artifacts/. The temporary test window
is labeled and blocks extra clicks, paste and unrelated shortcuts only during
the timed typing phase to prevent interference; the app itself is unchanged. Run it alone to avoid
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

Desktop tests use isolated profiles and hide only their temporary native
windows to avoid desktop input changing the scripted checks. Screenshots and
PCM probes still inspect the real renderer/audio; visible-effects endurance
has its own headed browser test. The packaged-app test covers the secure
origin, renderer isolation, asset boundaries, real synth output/STOP silence,
editor search/undo/redo, palette themes, saved projects and restart persistence.
The distribution test extracts the final ZIP outside the project directory
and repeats the desktop checks against that copy, including verifying source
and customization guides are present. Debugging ports used by Playwright are
test-only; normal launches do not open a debugging port or web server. Connecting
Sonic Pi starts its owned runtime's loopback control sockets.
After these checks, run the listening checklist in the desktop app: the Brave
listening confirmation does not verify a separate desktop browser/audio device.

## Project tabs, shortcuts and theme customization (0.2.0)

    npm run test:customization
    node tests/smoke/customization.mjs --desktop release/win-unpacked/MusiCo-3.exe

Uses real CodeMirror in both the call-counting build and production Strudel.
Checks independent drafts and undo/redo, reopening an existing project, all-tab
recovery (including unanswered reload and discard), Save As preserving edits,
close confirmation/fallback, custom RUN call counts or real output, tab STOP,
shortcut conflicts/reserved keys, theme import/export/rejection, persistence,
keyboard navigation and 320px/390px layouts. Desktop mode uses an isolated
profile. Screenshots go under tests/smoke/artifacts/.

Manual: open two songs, edit both, switch tabs and undo independently. Save one,
restart and recover the other. Remap RUN/STOP, reload and verify on your keyboard.
Choose every theme, enlarge text, toggle effects and try your own custom theme
file. Check settings with keyboard navigation and with a screen reader. Listen
in the actual desktop app; signal measurements do not verify speaker output.

Desktop customization runs 48 checks (46 shared checks plus two native-close checks). It captures an actual Electron theme download to its temporary test profile and supplies automated Stay/Leave answers. Manually edit a project, close the Windows app, check that Stay keeps your edits, then Leave and reopen to restore the draft. The visible native confirmation is not automatically accepted as a manual pass.

Playback buddy: the production smoke suite has 50 checks, including playback-only visibility, placement beside the guide cat, CSS animation, reduced-motion/static behavior, animations-off behavior, STOP removal and 320px layout. It uses the real Strudel build. This decoration does not represent audio levels or beat timing.

## Master output and WAV recording

    npm run test:recording
    node tests/smoke/recording.mjs release/win-unpacked/MusiCo-3.exe

These real-output checks measure master attenuation and mute silence, inspect
the actual meter, download stereo PCM16 WAV and validate its headers, duration
and nonzero samples. They cover STOP, previous-take protection, persistence and
project switching. Browser mode also checks 320px/390px layout. Desktop mode
uses a visible temporary window and isolated profile, and saves the download to
that profile automatically. Neither mode captures microphone or system audio.

Manual: RUN a song, lower volume and mute/unmute while listening. Record a take,
finish and export; play the WAV in another player and compare with the app.
Try STOP during recording, a five-minute automatic finish and closing with an
unexported take. Export before closing; recordings are not persisted or restored.
PCM16 clamps over-full-scale samples; lower layer gains if the meter shows CLIP.

Optional startup: node tests/smoke/startup.mjs checks the real production build; pass release/win-unpacked/MusiCo-3.exe as its argument to check the desktop. It has 13 checks for opt-in persistence, auto-dismiss, Skip, keyboard RUN with measured output, pointer input, reduced motion, animations off and 320px width. Steam staging: node tests/smoke/steam.mjs <staging-folder> checks identity, preview VDFs and matching app/source; this is not a SteamPipe upload/installation test.

## User sample sources and offline piano

    node tests/smoke/samples.mjs
    node tests/smoke/samples.mjs release/win-unpacked/MusiCo-3.exe

Run npm run build first for browser tests, or desktop:build for the desktop.
These checks use real CodeMirror, Strudel, worklets and audio decoding/output;
only the external sample host is a deterministic network fixture. They block
all other external requests to test the included piano offline. They cover
new tabs, metadata-only saving/import, JSON-only inspection, undo/redo, duplicate
loader insertion, actual clipboard sharing, real user-source sample playback,
export/import validation, storage failure, persistence, confirmed deletion and
preservation of corrupt storage. Browser mode also checks the 320px layout.
The distribution suite repeats desktop checks from the ZIP outside the project.
Unit tests verify format/URL limits, source merge/storage, safe code generation,
download bounds, piano-roll credits and all bundled piano hashes.

Manual: open SAMPLES → new piano demo, RUN and listen, then STOP. Try the same
with internet disconnected. Add a sample map you own or are licensed to use,
check its sound list, add its loader and share the complete copied song with
another user. Verify they can RUN it without adding an app update. Credit/license
metadata is user-supplied; source availability and redistribution rights are
separate from measured playback. See SAMPLES.md and SAMPLE_LICENSES.md.
# Note view, snippet previews and desktop quit

Run `npm run test:note-preview` for real-browser note/audio checks and separate
fake call-counting cancellation checks. To test the packaged Windows app:
`node tests/smoke/note-preview.mjs --desktop release/note-preview/win-unpacked/MusiCo-3.exe`.
The test uses a fresh temporary profile and native close-dialog responses for
Stay/Exit; it does not modify your saved music.

Manual acceptance: RUN a melody and open **show note view** below the editor.
Check chords and rests; change the code and RUN to refresh. Preview a layer,
effect and tempo snippet from HELP → snippets, then a personal library starter.
Listen for the intended sound, check that editor code is unchanged, press
**stop preview**, and RUN to play the editor again. Try `quit` while a project
or recording is unsaved: Stay must retain the app and work; save/export and
`exit` must close it. The note view shows pattern timing over cycles 1–4, not
an audio envelope, and may differ from later random/live-input events.
