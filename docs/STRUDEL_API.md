# Installed Strudel API audit (2026-10-03)

`package-lock.json` locks @strudel/web 1.3.0. The published package has no
`types` field or `.d.ts` files. `src/vite-env.d.ts` declares only the checked
subset used by the adapter; no `any` or untyped import cast is required.

| API | Installed source | Behaviour |
| --- | --- | --- |
| initStrudel({ prebake, onEvalError }) | @strudel/web/web.mjs; @strudel/core/repl.mjs | Creates one REPL, registers synths/global functions, then awaits prebake; resolves to REPL. |
| evaluate(code, true) | web.mjs; core/repl.mjs | Awaits evaluation and swaps the scheduler pattern. Errors log and call onEvalError, resolving undefined; thrown errors are also caught by the adapter. |
| hush() | web.mjs | Stops the REPL scheduler. |
| samples('github:tidalcycles/dirt-samples') | superdough/sampler.mjs | Fetches and registers a sample manifest. Individual buffers download lazily. |
| getAudioContext() | superdough/audiocontext.mjs; dist/index.mjs exports | Returns the shared AudioContext. |
| initAudio() | superdough/superdough.mjs; dist/index.mjs exports | Loads bundled effect worklets. Upstream initAudioOnFirstClick listens only to mousedown, so keyboard RUN explicitly calls initAudio. Upstream catches worklet failures and warns; browser tests assert no such warnings. |
| document 'strudel.log' | @strudel/core/logger.mjs | CustomEvent detail: message, optional type, data. Runtime errors can have undefined type and an 'error:' message. |

The shipped dist/index.mjs exports were checked as well as the source files.
The adapter remains a registry singleton and serialises evaluations. STOP
invalidates queued runs and silences an evaluation that finishes after STOP.

Automated tests establish API integration, worklet loading, sample requests,
editor behaviour and UI state. They do not establish audible output, seamless
musical timing, absence of audible doubling, or audio quality. Those require
human completion of docs/TESTING.md, especially items 1–7.
