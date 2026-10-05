# Add an engine from source

This developer extension system adds engines when you rebuild the application.
Users can select installed engines normally and save engine-specific melodies
in the guide's library tab. A library JSON file contains code starters, not engine
implementations. It never installs or automatically executes an engine.

Create `src/engines/extensions/my-engine.engine.ts`. Export a default descriptor:

```ts
import type { EngineDescriptor } from '../types';
import { MyEngine } from './MyEngine';

export default {
  id: 'my-engine',
  name: 'My engine',
  description: 'Explain what it plays and any installation requirements.',
  language: 'javascript', // currently javascript or ruby
  starterCode: 'Your working example here',
  capabilities: { run: true, stop: true, liveUpdate: false, visualization: false },
  available: true,
  create: () => new MyEngine(),
} satisfies EngineDescriptor;
```

Implement `MusicEngine` from `src/engines/types.ts` in `MyEngine.ts`:

| Method | Responsibility |
| --- | --- |
| `id` | Match the descriptor ID. |
| `setListener(listener)` | Deliver state, logs and runtime diagnostics; null detaches it. |
| `init()` | Idempotent initialization; do not start music. Report failure and reject. |
| `run(code)` | Evaluate/replace playback and return a `RunResult`. Never add another scheduler. |
| `stop()` | Immediately cancel/silence owned playback, including work still initializing. |
| `isPlaying()` / `getState()` | Report actual playback/engine state. |

The registry retains one instance per ID. Extensions get a guard which
serializes RUN, cancels queued RUN on STOP, silences late results and contains
adapter exceptions. The adapter still must implement real cancellation and
silence: a wrapper cannot silence a backend whose STOP is broken. Register
unimplemented adapters with `available: false`, all capabilities false and an
`unavailableReason`, without a fake audio implementation. Duplicate IDs never
replace built-ins; invalid metadata/import failures are reported in the terminal
and skipped. A factory failure disables the engine rather than crashing React.

NEW/engine selection use your starterCode (or an empty project); your guide
shows the descriptor and library, without Strudel-specific lessons. The built-in
EXAMPLES catalogue still contains Strudel projects; loading one switches to
Strudel rather than translating its code. Existing imported project files keep
their engine IDs, and missing engines remain unavailable.

Only add trusted source modules. They run as application code, not sandboxed
plugins. There is no arbitrary URL/script installer and no renderer Node access.
A native helper requires a separately reviewed desktop IPC integration; the
current preload exposes Sonic Pi only. Do not bypass the renderer sandbox.

Verify real output, STOP silence, repeated RUN without duplicated playback,
STOP during initialization/evaluation, runtime errors, reconnect, project
persistence and engine switching. Unit-test adapter logic and run the existing
browser/desktop suites. Keep visualization false until real output is exposed
and verified. An adapter may implement `getAudioOutput()` returning
`{ context: AudioContext, node: GainNode }` for its final master gain, and declare
`capabilities.visualization: true` once that real output is verified. The app
adjusts this gain and taps stereo output for meters/WAV; do not return a source
or per-layer gain. Return null until ready. Without output, no meter or recording
is fabricated. `npm run build`
bundles extensions for the browser; `npm run desktop:build` packages them for
Windows. Rebuild and distribute matching source for changed desktop builds.

Preserve AGPL-3.0-or-later and document added dependencies/licenses. For Steam,
check engine/backend license compatibility before distribution, particularly
the unresolved Steamworks SDK restrictions in `docs/STEAM_RELEASE.md`.
