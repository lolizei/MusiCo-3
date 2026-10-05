import type { Flac } from 'libflacjs';
import { MAX_RECORDING_SECONDS } from './wav';

/** Encode our existing PCM16 take, preserving each sample and its sample rate. */
export function encodeFlac(encoder: Flac, wav: ArrayBuffer): Uint8Array<ArrayBuffer> {
  const view = new DataView(wav);
  const text = (start: number, length: number) => String.fromCharCode(...new Uint8Array(wav, start, length));
  if (wav.byteLength < 44 || text(0, 4) !== 'RIFF' || text(8, 4) !== 'WAVE' || text(12, 4) !== 'fmt ' ||
    view.getUint32(16, true) !== 16 || view.getUint16(20, true) !== 1 || view.getUint16(22, true) !== 2 ||
    view.getUint16(34, true) !== 16 || text(36, 4) !== 'data' || view.getUint32(40, true) !== wav.byteLength - 44) throw new Error('Expected a stereo PCM16 recording.');
  const sampleRate = view.getUint32(24, true), frames = (wav.byteLength - 44) / 4;
  if (!Number.isInteger(frames) || frames < 1 || sampleRate < 8000 || sampleRate > 192000 || frames > sampleRate * MAX_RECORDING_SECONDS) throw new Error('Recording sample rate or length is invalid.');
  const id = encoder.create_libflac_encoder(sampleRate, 2, 16, 5, frames, true);
  if (!id) throw new Error('FLAC encoder could not initialize.');
  const chunks: Uint8Array[] = [];
  try {
    if (encoder.init_encoder_stream(id, data => { chunks.push(data.slice()); }) !== 0) throw new Error('FLAC stream could not initialize.');
    for (let first = 0; first < frames; first += 16384) {
      const count = Math.min(16384, frames - first), pcm = new Int32Array(count * 2);
      for (let i = 0; i < pcm.length; i++) pcm[i] = view.getInt16(44 + (first * 2 + i) * 2, true);
      if (!encoder.FLAC__stream_encoder_process_interleaved(id, pcm, count)) throw new Error('FLAC encoding failed. Your WAV is still available.');
    }
    if (!encoder.FLAC__stream_encoder_finish(id)) throw new Error('FLAC encoding could not finish.');
    const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  } finally { encoder.FLAC__stream_encoder_delete(id); }
}
