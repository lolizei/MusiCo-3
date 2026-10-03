// Real Vite pipeline and CodeMirror; only the call-counting build aliases Strudel.
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
await build({
  resolve: { alias: { '@strudel/web': fileURLToPath(new URL('./stubs/strudel-web.ts', import.meta.url)) } },
  build: { outDir: 'tests/smoke/dist' },
});
