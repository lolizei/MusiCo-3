import type { KeyValueStore } from '../projects/store';

export interface SamplePack { name: string; source: string; author: string; license: string }
export const PACKS_KEY = 'beatexe.samples.v1';
export const MAX_PACK_BYTES = 1_000_000;

/** Resolve the same github:owner/repo/ref/path shorthand supported by Strudel. */
export function sampleSource(input: string): string {
  const source = input.trim();
  if (source.startsWith('github:')) {
    const parts = source.slice(7).split('/');
    if (parts.length < 2 || parts.some(p => !/^[\w.-]+$/.test(p) || p === '.' || p === '..')) throw new Error('Use github:owner/repo/ref/path (ref defaults to main).');
    return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts[2] ?? 'main'}/${parts.slice(3).join('/') || 'strudel.json'}`;
  }
  let url: URL;
  try { url = new URL(source); } catch { throw new Error('Paste an HTTPS sample-map URL or github:owner/repo.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || source.length > 2000) throw new Error('Use an HTTPS URL without login details or a fragment.');
  return url.href;
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f\u2028\u2029]/.test(value)) throw new Error(`Invalid ${field}.`);
  return value.trim();
}
export function validatePack(value: unknown): SamplePack {
  if (!value || typeof value !== 'object') throw new Error('Invalid sample source.');
  const p = value as Record<string, unknown>;
  const name = text(p.name, 'name', 60);
  if (!name) throw new Error('Give this source a name.');
  return { name, source: sampleSource(text(p.source, 'source', 2000)), author: text(p.author, 'author', 200), license: text(p.license, 'license', 500) };
}
export function exportPacks(packs: SamplePack[]): string {
  return JSON.stringify({ format: 'beatexe-samples', version: 1, packs }, null, 2);
}
export function parsePacks(input: string): SamplePack[] {
  if (new TextEncoder().encode(input).length > MAX_PACK_BYTES) throw new Error('Sample source file exceeds 1 MB.');
  const data: unknown = JSON.parse(input);
  if (!data || typeof data !== 'object' || !('format' in data) || data.format !== 'beatexe-samples' || !('version' in data) || data.version !== 1 || !('packs' in data) || !Array.isArray(data.packs) || data.packs.length > 100) throw new Error('Choose a BEAT.EXE sample-source JSON file (version 1, up to 100 sources).');
  const packs = data.packs.map(validatePack);
  if (new Set(packs.map(p => p.source)).size !== packs.length) throw new Error('Duplicate sample sources.');
  return packs;
}
export function mergePacks(current: SamplePack[], imported: SamplePack[]): SamplePack[] {
  return parsePacks(exportPacks([...current, ...imported.filter(p => !current.some(c => c.source === p.source))]));
}
export function loadPacks(kv: KeyValueStore): SamplePack[] { const value = kv.getItem(PACKS_KEY); return value ? parsePacks(value) : []; }
export function savePacks(kv: KeyValueStore, packs: SamplePack[]): void { const data = exportPacks(packs); parsePacks(data); kv.setItem(PACKS_KEY, data); }
/** Credits are comments, not executable input. Source URLs are quoted as JS strings. */
export function packLoader(input: SamplePack): string {
  const p = validatePack(input);
  // Strudel treats double-quoted strings as mini-notation. Setup URLs need
  // single quotes; preserve JS escaping and also escape any apostrophes.
  const url = JSON.stringify(p.source).slice(1, -1).replace(/'/g, "\\'");
  return `// Sample source: ${p.name}\n// Author: ${p.author || 'not supplied'} | License: ${p.license || 'not supplied — check with the source owner'}\nawait samples('${url}')\n\n`;
}
export function packDemo(pack: SamplePack, sound: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,119}$/.test(sound)) throw new Error('Choose a sound with a simple name before creating a demo.');
  return `${packLoader(pack)}// Press RUN after reviewing the source above.\n$: note("c4 e4 g4 e4").s(${JSON.stringify(sound)}).gain(0.15)\n`;
}

/** Validate JSON data only; neither importing nor inspecting a map runs code. */
export function soundNames(input: string, source: string): string[] {
  if (new TextEncoder().encode(input).length > MAX_PACK_BYTES) throw new Error('Sample map exceeds 1 MB.');
  const data: unknown = JSON.parse(input);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected a Strudel JSON sample map.');
  const map = data as Record<string, unknown>;
  const base = map._base === undefined ? new URL('.', sampleSource(source)).href.replace(/\/$/, '') : sampleSource(text(map._base, 'base URL', 2000));
  const entries = Object.entries(map).filter(([name]) => name !== '_base');
  if (!entries.length || entries.length > 5000) throw new Error('Sample map must have 1–5000 sounds.');
  let count = 0;
  const file = (v: unknown) => {
    if (typeof v !== 'string' || !v || v.length > 2000 || ++count > 20_000) throw new Error('Invalid or excessive sample files.');
    if (/^[a-z][a-z0-9+.-]*:/i.test(v)) throw new Error('Use relative audio paths with an HTTPS _base in the sample map.');
    sampleSource(base + v);
  };
  for (const [name, value] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,119}$/.test(name)) throw new Error(`Unsupported sound name: ${name.slice(0, 120)}`);
    if (typeof value === 'string') file(value);
    else if (Array.isArray(value) && value.length) value.forEach(file);
    else if (value && typeof value === 'object' && Object.keys(value).length) {
      for (const [pitch, files] of Object.entries(value)) {
        if (!/^[A-Ga-g](?:#|s|b)?-?\d+$/.test(pitch) && !/^\d+$/.test(pitch)) throw new Error('Invalid pitched sample key.');
        if (Array.isArray(files) && files.length) files.forEach(file); else file(files);
      }
    } else throw new Error('Invalid sample list.');
  }
  return entries.map(([name]) => name).sort();
}

/** Bounded, cancelable JSON download. Audio files are fetched by Strudel on RUN. */
export async function inspectPack(source: string, signal: AbortSignal): Promise<string[]> {
  const response = await fetch(sampleSource(source), { signal, credentials: 'omit' });
  if (!response.ok) throw new Error(`Sample list download failed (HTTP ${response.status}).`);
  sampleSource(response.url || source); // reject redirects to non-HTTPS sources
  if (!response.body) throw new Error('Sample list has no response body.');
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_PACK_BYTES) throw new Error('Sample map exceeds 1 MB.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return soundNames(new TextDecoder().decode(bytes), response.url || source);
}
