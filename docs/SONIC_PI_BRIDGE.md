# Sonic Pi engine — proposed design

Status: user approved the desktop-first design on 2026-10-03. The implementation
targets Sonic Pi 5.0.0 and passes real-runtime and desktop integration tests.
Listening, concurrent Sonic Pi GUI playback and native consent/picker acceptance
remain manual; this is an experimental prerelease engine.

## Implementation refinement after inspecting 5.0.0

Sonic Pi 5.0.0 includes a headless boot harness. Rather than commandeer the GUI's
reply port, the app starts an owned daemon from the separate installation, with
SONIC_PI_HOME pointing into this app's profile. The daemon supplies dynamic
server/reply ports and its session token. The app binds the reply port on
127.0.0.1, sends keepalives and authenticated OSC commands, and receives real job
start/end and error events. Shutdown asks the owned daemon to exit.

This isolates stop-all-jobs to the app-owned runtime. RUN stops/replaces that
runtime's previous job and serializes submissions. It may leave a short gap;
liveUpdate remains false. STOP also mutes the owned output. Replacement waits
1.6 seconds for the old job's mixer cleanup before unmuting, because Sonic Pi's
job-ended message precedes its one-second audio fade. Selecting the engine only opens a Ruby project;
first RUN requests native consent and the installation folder. The saved folder
is revalidated, and consent is requested again in each new app session.

Sonic Pi's separate audio control port in 5.0.0 uses TCP, so the test-only
recording probe uses length-prefixed OSC over TCP to record actual final PCM.
The production bridge needs only UDP to control Spider. Visualization stays false.
No Sonic Pi binaries or third-party runtime sources are bundled in MusiCo-3.

The preload is intentionally narrow, but run accepts user Ruby. After consenting
to connect, any code evaluated in this renderer can invoke that bridge. The
native prompt explains the implications; renderer isolation alone does not
sandbox Ruby. Install/run trusted code only.

## Recommended first release: Windows desktop bridge

Keep Sonic Pi as a separately installed application. Add a small transport in
Electron's main process using Node's UDP sockets for OSC, with a narrow preload
API exposing only connect, run, stop and diagnostic events to the sandboxed
renderer. No shell execution or general filesystem API is exposed. The helper
must only send to loopback; it must not open a LAN-facing service.

The browser build will continue to show Sonic Pi as unavailable. A later browser
bridge would need a separately started loopback WebSocket helper, origin checks,
an unpredictable session token and explicit connection controls. That is more
setup for a beginner than the desktop transport and is outside the first version.

## Real protocol, not cue simulation

Sonic Pi's documented port 4560 receives OSC **cues**. Sending code to that port
does not execute a program. Its internal Spider API has a separate server port
and a per-session integer token. Source inspection shows `/run-code` takes token,
code and optional workspace; `/stop-job` takes token and a job ID. These internals
are version-sensitive, so the implementation must target a specific installed
Sonic Pi version, inspect that version's source, and verify discovery and replies
against it. Do not assume the development branch is the user's installed version.

A spike must first prove a reliable status/error channel without stealing the
Sonic Pi GUI's reply port. A successful UDP send is not confirmation that code
ran. If independent replies or job tracking are unavailable, report that limitation
and keep the engine disabled instead of calling the implementation complete.

## Editor and playback integration

- Add a Ruby language mode and engine-specific snippets, examples and errors.
  JavaScript/Strudel projects remain separate; engine switching must offer a new
  project rather than trying to execute JavaScript as Ruby.
- Keep one adapter instance in the existing registry and serialize RUN.
- Track the jobs belonging to this app. Re-running one-shot code must replace
  the previous owned job; named live loops need verified update behavior.
  STOP cancels queued runs and stops owned jobs. Do not silently stop unrelated
  music being played in Sonic Pi's own editor.
- Report connected, unavailable, playing and failed states from real replies;
  surface Ruby line errors without crashing the UI. Disconnect disables RUN.
- Sonic Pi Ruby can access the operating system in the external runtime. Explain
  this before first connection; the renderer sandbox does not sandbox Ruby.
- Audio comes from Sonic Pi/SuperCollider, outside the browser AudioContext.
  Visualization stays false. Do not show Strudel meters for Sonic Pi output.

## Dependencies, installation and licensing

UDP/OSC transport can use Node's standard library with a small, tested packet
codec. A CodeMirror Ruby grammar would be a justified dependency because the
editor currently supports only JavaScript. No automatic Sonic Pi download,
system setting changes or antivirus exceptions are part of this design.

The project remains AGPL-3.0-or-later. Do not bundle Sonic Pi or its audio runtime
until their exact version's license and redistribution requirements are reviewed.
A future Steam release still needs corresponding project/Strudel source and
must account for the separate Sonic Pi installation and audio routing.

## Completion criteria

Test real Sonic Pi on Windows: connection/authentication, synth and drum output,
Ruby syntax/runtime errors, rapid RUN with no duplicates, STOP/queue cancellation,
reconnect after restart, engine switching and isolation from GUI-owned playback.
Unit tests cover the codec, command ordering and diagnostics. Integration tests
use the installed Sonic Pi runtime, not an OSC recording fake. User listening
confirmation is required before declaring the engine usable.

The registry enables Sonic Pi only in the desktop build containing the tested
bridge. Browser builds disable it. Do not claim full acceptance until the remaining
manual criteria pass.

Sources checked 2026-10-03:
- [Official OSC tutorial](https://sonic-pi.net/tutorial-12.html)
- [Spider API source (development branch)](https://github.com/sonic-pi-net/sonic-pi/blob/dev/app/server/ruby/bin/spider-server.rb)
- [Daemon port allocation (development branch)](https://github.com/sonic-pi-net/sonic-pi/blob/dev/app/server/ruby/bin/daemon.rb)
