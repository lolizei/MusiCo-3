# Engine extensions

Add a trusted TypeScript module named `your-name.engine.ts` in this directory.
Export a default `EngineDescriptor` from `../types`. Vite discovers these modules
and bundles them when the app is rebuilt. See `docs/ENGINE_EXTENSIONS.md` for the
adapter API, playback rules and tests required before making an engine available.
This folder contains no pretend playable engine. A descriptor with
`available: false` needs an `unavailableReason` and stays disabled in the selector.
