import type { Plugin } from 'vite';

/** The published Strudel bundle embeds self-contained worklets as data URLs.
 * Emit them as same-origin assets so Electron's CSP can stay restricted. */
export function strudelWorkletAssets(): Plugin {
  return {
    name: 'strudel-local-worklets',
    apply: 'build',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/@strudel/web/dist/index.mjs')) return;
      let count = 0;
      const transformed = code.replace(/(["'])data:text\/javascript;base64,([A-Za-z0-9+/=]+)\1/g, (_match: string, _quote: string, encoded: string) => {
        const reference = this.emitFile({ type: 'asset', name: `strudel-worklet-${count++}.mjs`, source: Buffer.from(encoded, 'base64') });
        return `import.meta.ROLLUP_FILE_URL_${reference}`;
      });
      if (!count) this.error('Strudel worklet format changed: audit the installed bundle before packaging.');
      return { code: transformed, map: null };
    },
  };
}
