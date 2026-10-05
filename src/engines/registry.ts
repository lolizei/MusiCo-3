import type { EngineDescriptor, MusicEngine } from './types';
import { StrudelEngine } from './strudel/StrudelEngine';
import { SonicPiEngine } from './sonic-pi/SonicPiEngine';
import { NEW_PROJECT_TEMPLATE } from '../projects/examples';
import { SONIC_PI_TEMPLATE } from './sonic-pi/content';
import { GuardedEngine } from './extensions/GuardedEngine';

const sonicPi = typeof window !== 'undefined' ? window.sonicPi : undefined;

export const DEFAULT_ENGINE_ID = 'strudel';
export const EXTENSION_ENGINE_IDS = new Set<string>();

export const ENGINES: EngineDescriptor[] = [
  {
    id: 'strudel',
    starterCode: NEW_PROJECT_TEMPLATE,
    name: 'Strudel',
    description: 'Pattern-based live coding in JavaScript (strudel.cc). Runs in the browser.',
    language: 'javascript',
    capabilities: { run: true, stop: true, liveUpdate: true, visualization: true },
    available: true,
    create: () => new StrudelEngine(),
  },
  {
    id: 'sonic-pi',
    starterCode: SONIC_PI_TEMPLATE,
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
    try {
      const created = descriptor.create();
      engine = EXTENSION_ENGINE_IDS.has(descriptor.id) ? new GuardedEngine(created, descriptor.id) : created;
    } catch (error) {
      descriptor.available = false;
      descriptor.unavailableReason = `Engine could not start: ${error instanceof Error ? error.message : 'invalid adapter'}`;
      return null;
    }
    map.set(descriptor.id, engine);
  }
  return engine;
}
