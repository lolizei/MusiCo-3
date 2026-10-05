import type { Flac } from 'libflacjs';
import libraryUrl from 'libflacjs/dist/libflac.js?url&no-inline';
import { encodeFlac } from './flacEncode';

// Self-contained asm.js build: no remote download, extra WASM policy or Node.
const scope = self as unknown as { Flac: Flac; importScripts(url: string): void; postMessage(message: unknown, transfer?: Transferable[]): void; onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null };
scope.onmessage = async event => {
  try {
    scope.importScripts(libraryUrl);
    const flac = scope.Flac;
    if (!flac.isReady()) await new Promise<void>(resolve => flac.on('ready', resolve));
    const bytes = encodeFlac(flac, event.data);
    scope.postMessage({ buffer: bytes.buffer }, [bytes.buffer]);
  } catch (error) { scope.postMessage({ error: error instanceof Error ? error.message : 'FLAC export failed.' }); }
};
