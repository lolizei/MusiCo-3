# Installed Strudel API audit (2026-10-03)

`package-lock.json` locks @strudel/web 1.3.0. The published package has no
`types` field or `.d.ts` files. `src/vite-env.d.ts` declares only the checked
subset used by the adapter; no `any` or untyped import cast is required.

| API | Installed source | Behaviour |
| --- | --- | --- |
| initStrudel({ prebake, onEvalError }) | @strudel/web/web.mjs; @strudel/core/repl.mjs | Creates one REPL, registers synths/global functions, then awaits prebake; resolves to REPL. |
| evaluate(code, true) | web.mjs; core/repl.mjs | Awaits evaluation and swaps the scheduler pattern; returns that evaluated Pattern on success. Errors log and call onEvalError, resolving undefined; thrown errors are also caught by the adapter. |
| hush() | web.mjs | Stops the REPL scheduler. |
| samples('github:tidalcycles/dirt-samples') | superdough/sampler.mjs | Fetches and registers a sample manifest. Individual buffers download lazily. |
| getAudioContext() | superdough/audiocontext.mjs; dist/index.mjs exports | Returns the shared AudioContext. |
| getSuperdoughAudioController().output.destinationGain | superdough/superdough.mjs; superdoughoutput.mjs; web re-exports | Returns the final GainNode merging the orbits, connected to the context destination. Master controls adjust that gain; analyzers and recording tap its output without adding another audible connection. Checked 2026-10-04. |
| initAudio() | superdough/superdough.mjs; dist/index.mjs exports | Loads bundled effect worklets. Upstream initAudioOnFirstClick listens only to mousedown, so keyboard RUN explicitly calls initAudio. Upstream catches worklet failures and warns; browser tests assert no such warnings. |
| loadWorklets() | superdough/superdough.mjs; dist/index.mjs exports | Returns a promise for audioWorklet.addModule; rejects on load failure instead of swallowing it. The adapter awaits it before initAudio/evaluation and caches readiness per AudioContext. Checked 2026-10-04. |
| document 'strudel.log' | @strudel/core/logger.mjs | CustomEvent detail: message, optional type, data. Runtime errors can have undefined type and an 'error:' message. |
| Pattern.queryArc(0, 4) | @strudel/core/pattern.mjs; hap.mjs; fraction.mjs | Queries the first four cycles of the successful evaluate result. Haps carry whole/part begin/end Fraction times and value.note/value.s controls. The static note view converts those times with Number, ignores unpitched events, caps displayed notes at 512 and catches query errors. It never evaluates the source again or creates playback. Checked 2026-10-04. |
| initStrudel({ editPattern }) / Pattern.onTrigger(callback, false) | core/repl.mjs setPattern/getTrigger; core/pattern.mjs; webaudio/webaudio.mjs; superdough/superdough.mjs | editPattern wraps each successful evaluated pattern. Non-dominant onTrigger composes existing callbacks and preserves dominantTrigger, so default audio remains unchanged. Callback receives hap, current audio time, cps and absolute target audio time after output. Superdough mutates value.duration to the final duration in seconds; do not divide it by cps or apply clip again. Live piano reads note/sound controls and duration from these actual triggers, uses AudioContext.currentTime and caps the buffer at 512 events. Checked 2026-10-05. |

The shipped dist/index.mjs exports were checked as well as the source files.
The adapter remains a registry singleton and serialises evaluations. STOP
invalidates queued runs and silences an evaluation that finishes after STOP.

Desktop effects fix (2026-10-04): the published bundle contains four
`data:text/javascript;base64` modules. The earlier desktop policy excluded them,
and upstream initAudio swallowed the failure, leaving shape-processor missing.
`build/strudelWorklets.ts` emits these exact bundled modules as same-origin
assets at build time. The desktop CSP stays unchanged, including its exclusion
of data script/worker sources. No dependency sources are modified. Runtime
processor failures are classified as audio failures, stop the scheduler and
report once per RUN attempt. Reload/restart is needed if upstream caches a
failed module load. Browser development has no desktop CSP; production and
packaged desktop tests exercise the actual emitted worklet files.

Automated tests establish API integration, worklet loading, sample requests,
editor behaviour and UI state. They do not establish audible output, seamless
musical timing, absence of audible doubling, or audio quality. Those require
human completion of docs/TESTING.md, especially items 1–7.

## Sample-source update

Installed superdough/sampler.mjs exports samples(source, baseUrl?, options?) via
@strudel/web. The local piano passes an explicit same-origin base ending in /,
since getBaseURL strips that slash and processSampleMap concatenates base+file
rather than using URL resolution. User maps should supply an HTTPS _base ending
in / and relative audio names (or follow upstream prefix conventions). Sample
inspection validates supported string/list/pitched maps; it does not evaluate
JavaScript. Generated loaders use await samples(singleQuotedURL), since double quotes are mini-notation; the installed
Strudel transpiler supports top-level await. Desktop HTTPS fetch/CORS policy
is unchanged. Bundled audio provenance/license is in SAMPLE_LICENSES.md.
