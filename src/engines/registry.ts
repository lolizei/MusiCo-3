import type { EngineDescriptor, MusicEngine } from './types';
import { StrudelEngine } from './strudel/StrudelEngine';

export const DEFAULT_ENGINE_ID = 'strudel';

export const ENGINES: EngineDescriptor[] = [
  {
    id: 'strudel',
    name: 'Strudel',
    description: 'Pattern-based live coding in JavaScript (strudel.cc). Runs in the browser.',
    language: 'javascript',
    capabilities: { run: true, stop: true, liveUpdate: true, visualization: false },
    available: true,
    create: () => new StrudelEngine(),
  },
  {
    id: 'sonic-pi',
    name: 'Sonic Pi',
    description: 'Ruby-based live coding. Needs Sonic Pi running locally plus a bridge.',
    language: 'javascript',
    capabilities: { run: false, stop: false, liveUpdate: false, visualization: false },
    available: false,
    unavailableReason:
      'Not implemented yet. Sonic Pi cannot run inside a browser; it needs a local bridge (planned for phase 4).',
  },
];

export function getEngineDescriptor(id: string): EngineDescriptor | undefined {
  return ENGINES.find((e) => e.id === id);
}

/**
 * One instance per engine for the whole page lifetime. Stored on globalThis so
 * React StrictMode double-mounts and Vite hot reloads can never create a second
 * audio engine (which would mean duplicate playback).
 */
const KEY = '__beatexeEngineInstances';
type InstanceMap = Map<string, MusicEngine>;

export function getEngineInstance(descriptor: EngineDescriptor): MusicEngine | null {
  if (!descriptor.available || !descriptor.create) return null;
  const g = globalThis as unknown as Record<string, InstanceMap | undefined>;
  const map = (g[KEY] ??= new Map());
  let engine = map.get(descriptor.id);
  if (!engine) {
    engine = descriptor.create();
    map.set(descriptor.id, engine);
  }
  return engine;
}
