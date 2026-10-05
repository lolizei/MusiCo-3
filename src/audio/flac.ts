/** One short-lived encoder worker per export; it never connects to live audio. */
export async function exportFlac(wav: Blob): Promise<Blob> {
  const buffer = await wav.arrayBuffer();
  const worker = new Worker(new URL('./flac.worker.ts', import.meta.url));
  return new Promise((resolve, reject) => {
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { finish(); reject(new Error('FLAC export timed out. Your WAV is still available.')); }, 120000);
    worker.onmessage = (event: MessageEvent<{ buffer?: ArrayBuffer; error?: string }>) => {
      finish();
      if (event.data.buffer instanceof ArrayBuffer) resolve(new Blob([event.data.buffer], { type: 'audio/flac' }));
      else reject(new Error(event.data.error || 'FLAC export failed.'));
    };
    worker.onerror = () => { finish(); reject(new Error('FLAC encoder could not load. Your WAV is still available.')); };
    worker.postMessage(buffer, [buffer]);
  });
}
