import { spawn } from 'node:child_process';
import { createSocket } from 'node:dgram';
import { access, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { encodeOsc, decodeOsc } from './osc.mjs';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function inspectSonicPi(root) {
  const version = (await readFile(path.join(root, 'VERSION'), 'utf8')).trim();
  if (version !== '5.0.0') throw new Error(`Sonic Pi ${version} is not supported; this bridge targets 5.0.0`);
  const ruby = path.join(root, 'app/server/native/ruby/bin/ruby.exe');
  const daemon = path.join(root, 'app/server/ruby/bin/daemon.rb');
  await Promise.all([access(ruby), access(daemon)]);
  return { root, version, ruby, daemon };
}

/** Own daemon/profile/reply socket: never hijacks the installed app's GUI. */
export class SonicPiBridge {
  constructor(home, listener = () => {}) {
    this.home = home; this.listener = listener; this.state = 'offline';
    this.jobs = new Set(); this.generation = 0; this.serial = Promise.resolve(); this.sequence = 0;
  }
  emit(event) { this.listener(event); }
  setState(state) { this.state = state; this.emit({ type: 'state', state }); }
  send(address, args, port = this.ports?.server) {
    if (!this.socket || !port) throw new Error('Sonic Pi is not connected');
    const socket = this.socket;
    socket.send(encodeOsc(address, args), port, '127.0.0.1', error => { if (error && this.socket === socket) this.fail(error); });
  }
  fail(error) {
    this.setState('error'); this.pending?.resolve({ ok: false, error: { message: error.message } });
    this.pending = null; this.emit({ type: 'error', error: { message: error.message } });
  }
  async connect(root) {
    if (this.child && this.state !== 'error') return { ok: true };
    if (this.connecting) return this.connecting;
    this.connecting = this.boot(root).finally(() => { this.connecting = null; });
    return this.connecting;
  }
  async boot(root) {
    const installation = await inspectSonicPi(root);
    await this.close();
    await mkdir(this.home, { recursive: true });
    this.setState('loading'); this.acked = false; this.engineReady = false;
    this.child = spawn(installation.ruby, [installation.daemon, '--no-scsynth-inputs'], {
      cwd: installation.root, windowsHide: true,
      env: { ...process.env, SONIC_PI_HOME: this.home }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const child = this.child;
    child.on('error', error => { if (this.child === child) this.fail(error); });
    child.on('exit', () => {
      if (this.child !== child) return;
      this.child = null;
      if (!this.closing) this.fail(new Error('Sonic Pi stopped. Reconnect to start a new session.'));
    });
    let output = '';
    this.child.stdout.on('data', chunk => {
      output += chunk.toString();
      const lines = output.split(/\r?\n/); output = lines.pop();
      for (const line of lines) {
        if (!this.ports && /^\d+ \d+ \d+ \d+ \d+ -?\d+$/.test(line.trim())) {
          const [daemon, reply, server, audio, cues, token] = line.trim().split(' ').map(Number);
          this.ports = { daemon, reply, server, audio, cues, token };
          this.socket = createSocket('udp4');
          this.socket.on('error', error => this.fail(error));
          this.socket.on('message', (packet, sender) => {
            if (sender.address !== '127.0.0.1') return;
            try { this.receive(decodeOsc(packet)); } catch { /* Ignore unsupported/untrusted packets. */ }
          });
          this.socket.bind(reply, '127.0.0.1', () => {
            this.keepAlive = setInterval(() => this.send('/daemon/keep-alive', [token], daemon), 3000);
            this.send('/daemon/keep-alive', [token], daemon);
          });
        }
      }
    });
    this.child.stderr.on('data', () => { /* Detailed runtime logs remain in the isolated profile. */ });
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline && this.state === 'loading') {
      if (this.socket?.address && this.ports) this.send('/ping', [this.ports.token, 'musico-ready']);
      if (this.acked && this.engineReady) { this.setState('ready'); return { ok: true }; }
      await pause(300);
    }
    const error = new Error('Sonic Pi did not start. Check the audio device and the Sonic Pi log in this app’s profile.');
    await this.close(); this.setState('error'); throw error;
  }
  receive({ address, args }) {
    if (address === '/ack') this.acked = true;
    if (address === '/supersonic/info' || (address === '/log/info' && String(args[1]).includes('Live Coding begin'))) this.engineReady = true;
    if (address === '/exited-with-boot-error') this.fail(new Error(String(args[0])));
    if (address === '/run/started') {
      const [id, workspace] = args;
      if (this.pending && workspace === this.pending.workspace) {
        this.jobs.add(id); this.pending.job = id; this.setState('playing');
      }
    }
    if (address === '/run/ended') {
      this.jobs.delete(args[0]);
      if (this.jobs.size === 0 && this.state === 'playing') this.setState('ready');
    }
    if (address === '/error' || address === '/syntax_error') {
      const error = { message: String(args[1]), ...(Number(args[3]) > 0 ? { line: Number(args[3]) } : {}) };
      if (this.pending) { this.pending.resolve({ ok: false, error }); this.pending = null; }
      else this.emit({ type: 'error', error });
    }
  }
  run(code) {
    const generation = this.generation;
    const operation = this.serial.then(async () => {
      if (generation !== this.generation) return { ok: false, error: { message: 'Run cancelled by STOP' } };
      if (!this.child || !this.ports || ['offline', 'loading', 'error'].includes(this.state)) return { ok: false, error: { message: 'Connect Sonic Pi before RUN' } };
      if (typeof code !== 'string' || !code.trim()) return { ok: false, error: { message: 'Write some Sonic Pi Ruby first' } };
      // Sonic Pi fades a killed job's mixer for one second after job-ended.
      // Mute and wait for cleanup before unmuting a replacement: job counts
      // alone would miss overlapping audio tails.
      const hadJobs = this.jobs.size > 0;
      this.send('/mixer-output-volume', [this.ports.token, 0, 1]);
      this.send('/stop-all-jobs', [this.ports.token]);
      if (hadJobs) this.quietUntil = Date.now() + 1600;
      const deadline = Date.now() + 3000;
      while (this.jobs.size && Date.now() < deadline) await pause(20);
      if (this.jobs.size) return { ok: false, error: { message: 'Previous Sonic Pi job did not stop; reconnect before retrying' } };
      while (Date.now() < (this.quietUntil ?? 0) && generation === this.generation) await pause(20);
      if (generation !== this.generation) return { ok: false, error: { message: 'Run cancelled by STOP' } };
      this.send('/mixer-output-volume', [this.ports.token, 1, 1]);
      const workspace = `musico_${++this.sequence}`;
      return new Promise(resolve => {
        this.pending = { workspace, resolve, job: null };
        try { this.send('/run-code', [this.ports.token, code, workspace]); }
        catch (error) { this.pending = null; resolve({ ok: false, error: { message: error.message } }); return; }
        const timer = setTimeout(() => {
          if (this.pending?.workspace === workspace) {
            const ok = this.pending.job !== null;
            this.pending = null;
            if (!ok) { this.stop(); resolve({ ok: false, error: { message: 'No Sonic Pi job acknowledgement; playback was stopped' } }); }
            else resolve({ ok: true });
          }
        }, 500);
        timer.unref?.();
      });
    });
    this.serial = operation.catch(() => {}); return operation;
  }
  stop() {
    this.generation++;
    this.pending?.resolve({ ok: false, error: { message: 'Run cancelled by STOP' } }); this.pending = null;
    if (this.ports && this.socket) {
      if (this.jobs.size) this.quietUntil = Date.now() + 1600;
      this.send('/mixer-output-volume', [this.ports.token, 0, 1]);
      this.send('/stop-all-jobs', [this.ports.token]);
    }
  }
  async close() {
    this.closing = true; this.stop(); clearInterval(this.keepAlive);
    if (this.ports && this.socket) this.send('/daemon/exit', [this.ports.token], this.ports.daemon);
    const child = this.child;
    if (child) {
      await Promise.race([new Promise(resolve => child.once('exit', resolve)), pause(6000)]);
      if (child.exitCode === null) child.kill();
    }
    this.socket?.close(); this.socket = null; this.ports = null; this.child = null;
    this.jobs.clear(); this.closing = false; this.setState('offline');
  }
}
