// Record an importable composition through the real production app and Strudel.
// Requires the existing Playwright Chromium installation and ffmpeg on PATH.
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { installOutputMeter } from '../tests/smoke/audio-probe.mjs';

const projectPath = resolve(process.argv[2] ?? 'songs/windowlight.beat.json');
const seconds = Number(process.argv[3] ?? 180);
assert.ok(Number.isFinite(seconds) && seconds >= 10 && seconds <= 1800, 'Duration must be 10–1800 seconds');
const project = JSON.parse(await readFile(projectPath, 'utf8'));
assert.equal(project.engine, 'strudel');
assert.equal(spawnSync('ffmpeg', ['-version'], { windowsHide: true }).status, 0, 'ffmpeg must be on PATH');
const stem = basename(projectPath, '.beat.json');
const output = resolve('release', 'music', stem);
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4186, strictPort: true } });
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(installOutputMeter);
  await page.addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (...args) {
      const result = connect.apply(this, args);
      if (!window.__songRecorder && args[0] instanceof AudioDestinationNode
        && this.context instanceof AudioContext && this instanceof GainNode && this.gain.value > 0) {
        const destination = this.context.createMediaStreamDestination();
        connect.call(this, destination);
        const recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 });
        const chunks = [];
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        window.__songRecorder = { recorder, chunks };
      }
      return result;
    };
  });
  // Prove this composition runs without external manifests or sample downloads.
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4186/')
    ? route.continue() : route.abort());
  await page.goto('http://127.0.0.1:4186/');
  await page.getByTestId('engine-state').filter({ hasText: 'ready' }).waitFor({ timeout: 30000 });
  await page.getByTestId('import-input').setInputFiles(projectPath);
  await page.locator('.cm-content').filter({ hasText: project.code.split(/\r?\n/)[0] }).waitFor();
  await page.getByTestId('btn-run').click();
  await page.getByTestId('engine-state').filter({ hasText: 'playing' }).waitFor();
  await page.waitForFunction(() => !!window.__songRecorder);
  await page.evaluate(() => window.__songRecorder.recorder.start(1000));
  console.log(`Recording ${project.name} from actual Strudel output for ${seconds}s...`);
  for (let remaining = seconds; remaining > 0; remaining -= 30) {
    await page.waitForTimeout(Math.min(remaining, 30) * 1000);
    assert.match(await page.getByTestId('engine-state').innerText(), /playing/);
    console.log(`Recorded ${Math.min(seconds, seconds - remaining + 30)}/${seconds}s`);
  }
  const encoded = await page.evaluate(async () => {
    const { recorder, chunks } = window.__songRecorder;
    await new Promise(resolve => { recorder.onstop = resolve; recorder.stop(); });
    const blob = new Blob(chunks, { type: recorder.mimeType });
    return new Promise(resolve => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  });
  const levels = await page.evaluate(() => window.__levels);
  const terminal = await page.getByTestId('terminal-log').innerText();
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.ok(levels.nonzero > 0 && levels.peak < 0.9 && levels.clipped === 0, JSON.stringify(levels));
  assert.doesNotMatch(terminal, /sound not found|evaluation failed|runtime error/i);
  await page.getByTestId('btn-stop').click();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: resolve(output, `${stem}-in-app.png`) });
  const webm = resolve(output, `${stem}-capture.webm`);
  await writeFile(webm, Buffer.from(encoded, 'base64'));
  const wav = resolve(output, `${stem}.wav`);
  const mp3 = resolve(output, `${stem}.mp3`);
  const runFfmpeg = args => {
    const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { windowsHide: true, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  // Soft opening and ending; no loudness boost or simulated audio.
  runFfmpeg(['-i', webm, '-t', String(seconds), '-af', `afade=t=in:d=3,afade=t=out:st=${seconds - 6}:d=6`,
    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', wav]);
  runFfmpeg(['-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', mp3]);
  const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', wav, '-f', 'f32le', '-c:a', 'pcm_f32le', '-'],
    { windowsHide: true, maxBuffer: 700_000_000 });
  assert.equal(pcm.status, 0);
  let peak = 0, sum = 0;
  for (let i = 0; i < pcm.stdout.length; i += 4) {
    const sample = pcm.stdout.readFloatLE(i); peak = Math.max(peak, Math.abs(sample)); sum += sample * sample;
  }
  assert.ok(peak > 0 && peak < 0.95, 'Exported WAV has headroom');
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ name: project.name, seconds,
    liveOutput: levels, exportedWav: { peak, rms: Math.sqrt(sum / (pcm.stdout.length / 4)) },
    externalResourcesBlocked: true, pageErrors: errors, listeningVerified: false,
    encoding: 'Captured WebM/Opus at 256 kbps; decoded to 48 kHz stereo 16-bit WAV; MP3 at 192 kbps',
  }, null, 2));
  console.log(`Exported WAV + MP3. Live peak ${levels.peak.toFixed(4)}; WAV peak ${peak.toFixed(4)}. Listening unverified.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
