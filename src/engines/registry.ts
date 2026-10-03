import type { EngineDescriptor, MusicEngine } from './types';
import { StrudelEngine } from './strudel/StrudelEngine';
import { SonicPiEngine } from './sonic-pi/SonicPiEngine';

const sonicPi = typeof window !== 'undefined' ? window.sonicPi : undefined;

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
    description: 'Ruby live coding with a separate Sonic Pi 5.0.0 installation. Windows desktop only.',
    language: 'ruby',
    capabilities: { run: !!sonicPi, stop: !!sonicPi, liveUpdate: false, visualization: false },
    available: !!sonicPi,
    unavailableReason: sonicPi ? undefined : 'Sonic Pi requires the Windows desktop app and a separate Sonic Pi 5.0.0 installation.',
    create: sonicPi ? () => new SonicPiEngine(sonicPi) : undefined,
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
