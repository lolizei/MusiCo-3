import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createConnection } from 'node:net';
import { once } from 'node:events';
import { SonicPiBridge } from '../../desktop/sonic-pi.mjs';
import { encodeOsc } from '../../desktop/osc.mjs';
import { SONIC_PI_SNIPPETS } from '../../src/engines/sonic-pi/content.ts';

const root = process.argv[2];
if (!root) throw new Error('Pass the Sonic Pi 5.0.0 installation directory');
const profile = await mkdtemp(path.join(os.tmpdir(), 'musico-sonic-test-'));
const events = [];
const bridge = new SonicPiBridge(profile, event => { events.push(event); console.log(JSON.stringify(event)); });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let audio;
const audioSend = (address, args) => {
  const packet = encodeOsc(address, args); const header = Buffer.alloc(4); header.writeUInt32BE(packet.length);
  audio.write(Buffer.concat([header, packet]));
};
function wavPeak(wav) {
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  let offset = 12; let peak = 0; let dataFound = false;
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4); const size = wav.readUInt32LE(offset + 4);
    if (id === 'fmt ') assert.equal(wav.readUInt16LE(offset + 22), 24, 'Recorder must produce 24-bit PCM');
    if (id === 'data') {
      dataFound = true;
      for (let i = offset + 8; i + 3 <= Math.min(wav.length, offset + 8 + size); i += 3) {
        let sample = wav.readUIntLE(i, 3); if (sample & 0x800000) sample -= 0x1000000;
        peak = Math.max(peak, Math.abs(sample) / 0x800000);
      }
      break;
    }
    offset += 8 + size + size % 2;
  }
  assert.ok(dataFound); return peak;
}
try {
  assert.deepEqual(await bridge.connect(path.resolve(root)), { ok: true });
  console.log('PASS Sonic Pi: real daemon and audio engine ready');
  audio = createConnection({ host: '127.0.0.1', port: bridge.ports.audio }); await once(audio, 'connect');
  const recording = path.join(profile, 'synth.wav');
  audioSend('/supersonic/record/start', [recording, 'wav', 24]);
  const result = await bridge.run('use_bpm 120\nlive_loop :musico_melody do\n  play :c4, release: 0.2, amp: 0.2\n  sleep 0.5\nend');
  assert.equal(result.ok, true, JSON.stringify(result));
  await pause(3000);
  audioSend('/supersonic/record/stop', []);
  await pause(2000);
  const wav = await readFile(recording);
  const peak = wavPeak(wav);
  assert.ok(peak > 0 && peak < 0.9, `Real Sonic Pi PCM peak: ${peak}`);
  console.log(`PASS Sonic Pi: actual synth recording peak ${peak}`);
  bridge.stop(); await pause(800); assert.equal(bridge.jobs.size, 0);
  console.log('PASS Sonic Pi: STOP ends owned jobs');
  const invalid = await bridge.run('play (');
  assert.equal(invalid.ok, false); assert.ok(invalid.error.line > 0);
  console.log('PASS Sonic Pi: real syntax error with source line');
  const drum = 'live_loop :musico_drums do\n  sample :bd_haus, amp: 0.2\n  sleep 0.5\nend';
  const updates = path.join(profile, 'rapid-updates.wav');
  audioSend('/supersonic/record/start', [updates, 'wav', 24]);
  for (let i = 0; i < 5; i++) assert.equal((await bridge.run(drum)).ok, true);
  await pause(750); audioSend('/supersonic/record/stop', []); await pause(2000);
  assert.equal(bridge.jobs.size, 1);
  console.log('PASS Sonic Pi: repeated RUN retains one owned job');
  const queued = [bridge.run(drum), bridge.run(drum), bridge.run(drum)]; bridge.stop();
  assert.ok((await Promise.all(queued)).every(result => !result.ok));
  await pause(500); assert.equal(bridge.jobs.size, 0);
  console.log('PASS Sonic Pi: STOP cancels queued runs');
  const before = events.filter(event => event.type === 'error').length;
  for (const snippet of SONIC_PI_SNIPPETS) {
    const result = await bridge.run(snippet.code); assert.equal(result.ok, true, JSON.stringify(result));
    await pause(700); assert.equal(events.filter(event => event.type === 'error').length, before);
    bridge.stop(); await pause(300);
    console.log(`PASS Sonic Pi: Ruby starter ${snippet.title} runs in real runtime`);
  }
  const drums = path.join(profile, 'drums.wav');
  audioSend('/supersonic/record/start', [drums, 'wav', 24]);
  assert.equal((await bridge.run(drum)).ok, true); await pause(2000);
  audioSend('/supersonic/record/stop', []); await pause(2000);
  const drumWav = await readFile(drums);
  const drumPeak = wavPeak(drumWav);
  assert.ok(drumPeak > 0 && drumPeak < 0.9);
  console.log(`PASS Sonic Pi: bundled drum sample produces recorded PCM peak ${drumPeak}`);
  const updatedPeak = wavPeak(await readFile(updates));
  assert.ok(updatedPeak > 0 && updatedPeak <= drumPeak * 1.05, `Rapid RUN peak ${updatedPeak}; single drum peak ${drumPeak}`);
  console.log('PASS Sonic Pi: rapid RUN recordings stay at single-copy output level');
  bridge.stop(); await pause(500);
  const silence = path.join(profile, 'silence.wav');
  audioSend('/supersonic/record/start', [silence, 'wav', 24]); await pause(800);
  audioSend('/supersonic/record/stop', []); await pause(2000);
  const silentWav = await readFile(silence);
  const silentPeak = wavPeak(silentWav);
  assert.ok(silentPeak < 0.0001);
  console.log(`PASS Sonic Pi: STOP produces recorded silence (peak ${silentPeak})`);
  audio.destroy(); audio = null;
  await bridge.close(); await bridge.connect(path.resolve(root));
  assert.equal((await bridge.run(drum)).ok, true); bridge.stop();
  console.log('PASS Sonic Pi: reconnect starts a fresh real runtime');
} finally { audio?.destroy(); await bridge.close(); console.log(`Test profile/logs: ${profile}`); }
