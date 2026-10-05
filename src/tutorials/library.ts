import type { KeyValueStore } from '../projects/store';

export interface LibraryEntry { id: string; title: string; engine: string; code: string }
export const LIBRARY_KEY = 'beatexe.library.v1';
export const MAX_LIBRARY_BYTES = 2_000_000;
const MAX_ENTRIES = 100;

/** File/storage validation only. Saved code is never evaluated here. */
export function parseLibrary(text: string): LibraryEntry[] {
  if (new TextEncoder().encode(text).length > MAX_LIBRARY_BYTES) throw new Error('Library file is too large (maximum 2 MB).');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This is not a valid JSON library.'); }
  if (!data || typeof data !== 'object' || !('format' in data) || data.format !== 'beatexe-library' || !('version' in data) || data.version !== 1 || !('entries' in data) || !Array.isArray(data.entries)) {
    throw new Error('Choose a BEAT.EXE library JSON file (version 1).');
  }
  if (data.entries.length > MAX_ENTRIES) throw new Error('A library can contain up to 100 starters.');
  const ids = new Set<string>();
  return data.entries.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid library starter.');
    const item = entry as Partial<Record<keyof LibraryEntry, unknown>>;
    if (typeof item.id !== 'string' || !/^[\w-]{1,80}$/.test(item.id) || ids.has(item.id)) throw new Error('Starter IDs must be unique.');
    if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 60) throw new Error('Give each starter a name of 1–60 characters.');
    if (typeof item.engine !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(item.engine)) throw new Error('Invalid engine ID.');
    if (typeof item.code !== 'string' || !item.code.trim() || item.code.length > 100_000) throw new Error('Starter code must contain 1–100,000 characters.');
    ids.add(item.id);
    return { id: item.id, title: item.title.trim(), engine: item.engine, code: item.code };
  });
}
export function exportLibrary(entries: LibraryEntry[]): string {
  return JSON.stringify({ format: 'beatexe-library', version: 1, entries }, null, 2);
}
/** Imports add content without overwriting starters, even on ID collisions. */
export function mergeLibrary(current: LibraryEntry[], imported: LibraryEntry[]): LibraryEntry[] {
  const merged = [...current];
  for (const entry of imported) {
    if (merged.some(item => item.title === entry.title && item.engine === entry.engine && item.code === entry.code)) continue;
    let id = entry.id;
    for (let suffix = 1; merged.some(item => item.id === id); suffix++) id = `${entry.id.slice(0, 65)}-${suffix}`;
    merged.push({ ...entry, id });
  }
  return parseLibrary(exportLibrary(merged));
}
export function loadLibrary(kv: KeyValueStore): LibraryEntry[] {
  const text = kv.getItem(LIBRARY_KEY);
  return text ? parseLibrary(text) : [];
}
/** Validate before touching storage; quota failures leave previous data intact. */
export function saveLibrary(kv: KeyValueStore, entries: LibraryEntry[]): void {
  const text = exportLibrary(entries);
  parseLibrary(text);
  kv.setItem(LIBRARY_KEY, text);
}
