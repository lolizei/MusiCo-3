# Windowlight

An original 74 BPM lo-fi instrumental for quiet YouTube backgrounds: warm
Dmaj7, Bm7, Em9 and A6 keys, round bass, sparse melody, a soft kick and brushed
noise percussion. No vocals, borrowed melodies, recordings or downloaded samples.

## Play and customize

Choose **Strudel** in MusiCo-3/code for music. Use the terminal command `import`
and select `windowlight.beat.json`, then RUN. Alternatively, paste the contents
of `windowlight.strudel` into a new editor tab. The song loops until STOP.

- Change `74` in `setcpm(74/4)` to change the tempo.
- Lower a layer's `.gain(...)` to make it quieter.
- Remove a complete `$:` layer to mute that instrument.
- The `~` symbols are rests. Replace notes to change the melody.
- Chords change every two bars; the harmonic phrase repeats every eight bars.

The supplied three-minute recording has a three-second fade-in and six-second
fade-out. Use the WAV in your video editor, and lower its volume under narration
to suit your voice. MP3 is provided for convenient preview. For longer videos,
extend the composition's playback and record again, or crossfade repeated audio
clips; the faded three-minute export is not a seamless loop.

## Record again

From the repository, with Playwright Chromium installed and ffmpeg on PATH:

    npm run build
    node scripts/render-song.mjs songs/windowlight.beat.json 180

The recorder imports the project into the actual production app, presses RUN,
and captures Strudel's live final output. It blocks all external downloads and
checks playback state, browser errors and output headroom throughout recording.
It writes audio, a screenshot and measured results under
`release/music/windowlight/`. The test server binds only to `127.0.0.1` and
closes after recording.

Encoding: browser MediaRecorder captures stereo WebM/Opus at 256 kbps; ffmpeg
decodes to 48 kHz, 16-bit WAV and creates a 192 kbps MP3. The WAV is decoded
from a lossy capture, not an uncompressed master from the engine.

## Use in videos

You have permission to use this original composition and its supplied recording
in your YouTube videos, including monetized videos, and to modify it. Attribution
is optional; suggested credit: “Windowlight — made with code for music.”
This permission concerns this composition and recording. The app and its engine
retain their existing AGPL licenses. No guarantee about automated Content ID
matching is made.

Audio output and export levels are measured automatically. Audible balance and
musical quality still need your listening check; the assistant cannot hear it.
