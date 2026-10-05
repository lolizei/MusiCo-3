export const MAX_RECORDING_SECONDS = 300;
export function wavHeader(frames: number, sampleRate: number): ArrayBuffer {
  if (!Number.isInteger(frames) || frames < 1 || !Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || frames > sampleRate * MAX_RECORDING_SECONDS) throw new Error('Invalid WAV recording length or sample rate.');
  const header = new ArrayBuffer(44), view = new DataView(header);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, 36 + frames * 4, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 2, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, frames * 4, true);
  return header;
}
export function peakLevel(samples: Float32Array): number {
  let peak = 0;
  for (const sample of samples) if (Number.isFinite(sample)) peak = Math.max(peak, Math.abs(sample));
  return peak;
}
export function volumeGain(volume: number, muted: boolean): number {
  return muted ? 0 : Math.min(100, Math.max(0, Number.isFinite(volume) ? volume : 80)) / 100;
}
