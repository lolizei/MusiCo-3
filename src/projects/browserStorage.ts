import { createMemoryStore, type KeyValueStore } from './store';

/**
 * localStorage when available. Some browsers block it (private mode, strict
 * cookie settings); then data lives in memory and `persistent` is false so the
 * UI can warn the user that saving won't survive a reload.
 */
export function openBrowserStorage(): { kv: KeyValueStore; persistent: boolean } {
  try {
    const ls = window.localStorage;
    const probe = '__beatexe_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { kv: ls, persistent: true };
  } catch {
    return { kv: createMemoryStore(), persistent: false };
  }
}
