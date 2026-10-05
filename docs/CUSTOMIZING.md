# Customize MusiCo-3

## Inside the app

PIANO ROLL opens a separate saved one-bar sketch. Choose tempo, octave, synth
and note length, then toggle melody/chord cells and kick/snare/hi-hat/clap steps.
Create Strudel tab opens generated code in a new tab; RUN starts playback.
The sketch is independent of subsequent editor changes. COPY CODE (or `copy`)
copies the current editor text; `cmd` lists the app commands. These terminal
commands do not access the Windows shell. Scrollbars follow the current theme;
the terminal hides its scrollbar while retaining wheel and keyboard scrolling.


Click SETTINGS, use Ctrl/Cmd+, or type customize in the terminal. Change theme,
editor text size, beginner explanations, CRT effects and animations. Settings
apply immediately and persist in your profile; a warning appears if storage
is blocked/full. The animation setting and reduced-motion preference control
our CSS guide cat.

Under Terminal companion, choose Dancing cat, Headphone bunny, Tiny robot,
Twinkling stars or None, with slow/normal/fast speed. A preview shows your
choice. The companion appears beside the terminal log while an engine reports
playback, and disappears on STOP. Colors follow your theme. Animations off or
reduced motion shows a still frame. This is decoration, not a sound meter.
Your choice and speed persist in this browser/desktop profile.

Choose one of seven presets: Midnight Terminal, Matrix Green, Amber CRT,
Vaporwave Dreams, Sakura Terminal, Cyberpunk Pink or Classic CMD. Expand
Customize colors / share a theme to change all ten colors. Edits create a
separate custom palette, preserving built-in presets. Export theme JSON shares
that palette; Import theme JSON validates format version, name and every
#RRGGBB color. Invalid or oversized files leave your appearance intact.
Low-contrast text combinations show a readability hint.

Keyboard shortcuts: click Change beside an action and press your chosen keys.
Use Ctrl/Cmd or Alt plus a key, or a function key. Escape cancels recording.
Conflicts and reserved browser/system/editor shortcuts are rejected. Clear
unwanted bindings except Stop, or Reset keyboard shortcuts to restore defaults.
Toolbar tooltips and HELP reflect your current RUN/STOP bindings. Source code
comments may show default shortcuts. Search/replace, completion and undo/redo
keep CodeMirror's native shortcuts.

Terminal examples:

    theme amber
    theme vaporwave
    theme sakura
    theme cyberpunk
    theme cmd
    set fontsize 18
    set crt off
    set animations off
    set mascot robot
    set mascotspeed slow
    set mascot off
    set mode advanced
    customize

## Your melody & snippet library

Open HELP → library. Name a starter and paste code, or Copy from editor, then
Save starter. It stays in this profile and is separate from project saves.
Search your starters; Load opens a project tab through the usual draft check,
and Insert adds code to your current song with an undo step. Only RUN plays.
You can save both melodies and effect fragments; choose Insert for fragments
that need the current pattern. The form uses the selected project's engine.

Export library downloads `my-music-library.json` for sharing/backup. Import
validates the format and merges new content without overwriting starters.
Exact duplicates are skipped; colliding IDs are renamed. Up to 100 starters
and 2 MB per library are allowed, with at most 100,000 characters per starter.
Other-engine entries stay stored but only appear when that engine is selected.
Unsupported engines remain unavailable. Deletion asks for a second click and
does not change open project code. A storage warning means export is needed
before closing; unreadable stored libraries are preserved rather than overwritten.

The guide's X was removed. Use the beginner/advanced button to hide/show it,
or HELP/F1 to open it; these actions now share the same preference.

## Developer engine extensions

Follow [ENGINE_EXTENSIONS.md](ENGINE_EXTENSIONS.md) to implement a trusted
MusicEngine adapter. Place its default descriptor in a `*.engine.ts` file
under `src/engines/extensions`, then rebuild. Engines are discoverable in the
selector and palette, with separate starters/libraries. Available adapters
must implement real playback and STOP; incomplete adapters remain disabled.
Imported library JSON adds song code and never installs an engine.

## Project tabs and recovery

NEW opens another tab; OPEN and IMPORT keep your current drafts. Opening a saved
project that is already open selects its existing draft. Save As opens a saved
copy while retaining original edits. Each tab has independent text, dirty state,
cursor and undo/redo history during the session. Undo history and cursor position
are not persisted across application restarts.

Click tabs or use Alt+Left/Right. Keyboard focus on the tab bar supports Left,
Right, Home and End. Switching stops playback and does not automatically run
another tab. Use RUN on the selected tab. One engine plays at a time.

SAVE saves the selected project. Closing a dirty or never-saved tab asks before
losing it; cancelling retains the work. Clean tabs reopen after restart. If
any tab has edits, recovery offers all drafts together. Discard recovery reverts
all tabs to their last saved/loaded code. Draft storage is best effort; export
songs regularly if storage is limited. Project deletion removes the saved copy;
open editor text is retained as an unsaved tab. The workspace supports up to
100 open tabs with a clear message before exceeding that limit.

Use export/import to share .beat.json songs. Ctrl+F opens search/replace,
Ctrl+Z undoes, Ctrl+Shift+Z redoes and a dot opens Strudel method completion.

## Customize the application source

The terminal's Volume and Mute controls persist. RUN, then Record WAV to capture
Strudel's final stereo output at the selected volume. Finish recording or STOP,
then Export WAV. A take is limited to five minutes and survives project changes
until replaced or the app closes. Export before closing; it is held in memory.
This records the app's music, not your microphone or other Windows programs.
Sonic Pi native audio is not connected to these controls. CLIP means you should
lower the music's layer gains; the meter is a short-window peak indicator.

Matching source archives include the dependency lockfile and build scripts.
Relevant modules: src/themes/, src/settings/, src/projects/, src/tutorials/,
src/editor/ and src/styles/global.css. Original importable compositions live
under songs/. Rebuild source changes with npm run desktop:build. Editing an
exported song changes the song; editing app source and rebuilding changes the
program. New defaults do not overwrite existing preferences.

Preserve singleton/serialized engine behavior, AGPL licensing and dependency
notices when sharing builds. See STEAM_RELEASE.md for the planned free release
and the Steamworks SDK licensing question.

Enable Welcome animation on next launch in SETTINGS, or use set startup on. It is off by default. Skip, any key, or a click outside the welcome continues immediately without consuming editor/RUN input. Reduced motion and animations off bypass it.

## Add and share your own sample sources

Use SAMPLES (or terminal samples / sounds) in a Strudel project. You can add
HTTPS or GitHub sample maps without rebuilding the app. Insert the loader above
your song and share the whole code with credits. See [SAMPLES.md](SAMPLES.md)
and [SAMPLE_LICENSES.md](SAMPLE_LICENSES.md). Engine adapters still require a
trusted developer integration and rebuild; sample sources do not install engines.
