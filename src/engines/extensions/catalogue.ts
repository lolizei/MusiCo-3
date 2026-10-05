import type { EngineDescriptor } from '../types';

export interface ExtensionModule { default: EngineDescriptor }
export interface ExtensionIssue { file: string; message: string }

/** Check metadata before adding an engine; built-ins can never be replaced. */
export function validateExtension(value: unknown, existing: readonly EngineDescriptor[]): EngineDescriptor {
  if (!value || typeof value !== 'object') throw new Error('Export a default EngineDescriptor.');
  const descriptor = value as Partial<Record<keyof EngineDescriptor, unknown>>;
  if (typeof descriptor.id !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(descriptor.id)) throw new Error('Use a lowercase engine ID with letters, numbers or hyphens.');
  if (existing.some(engine => engine.id === descriptor.id)) throw new Error(`Engine ID "${descriptor.id}" is already registered.`);
  for (const field of ['name', 'description'] as const) {
    if (typeof descriptor[field] !== 'string' || !descriptor[field].trim() || descriptor[field].length > 1000) throw new Error(`Provide a ${field}.`);
  }
  if (!['javascript', 'ruby'].includes(String(descriptor.language))) throw new Error('Editor language must be javascript or ruby.');
  if (typeof descriptor.available !== 'boolean') throw new Error('Declare whether the engine is available.');
  const capabilities = descriptor.capabilities;
  if (!capabilities || typeof capabilities !== 'object') throw new Error('Declare engine capabilities.');
  const declared = capabilities as Partial<Record<'run' | 'stop' | 'liveUpdate' | 'visualization', unknown>>;
  for (const key of ['run', 'stop', 'liveUpdate', 'visualization'] as const) {
    if (typeof declared[key] !== 'boolean') throw new Error(`Declare a boolean ${key} capability.`);
  }
  if (descriptor.available && (typeof descriptor.create !== 'function' || !('run' in capabilities && capabilities.run) || !('stop' in capabilities && capabilities.stop))) throw new Error('Available engines require a factory and working RUN/STOP.');
  if (!descriptor.available && (typeof descriptor.unavailableReason !== 'string' || !descriptor.unavailableReason.trim())) throw new Error('Explain why the engine is unavailable.');
  if (descriptor.starterCode !== undefined && (typeof descriptor.starterCode !== 'string' || descriptor.starterCode.length > 100_000)) throw new Error('Starter code must be text, at most 100,000 characters.');
  const checked = value as EngineDescriptor;
  return { ...checked, capabilities: { ...checked.capabilities } };
}

/** Faulty imports or metadata are reported and skipped, never replace existing engines. */
export async function loadExtensionModules(registry: EngineDescriptor[], modules: Record<string, () => Promise<ExtensionModule>>): Promise<ExtensionIssue[]> {
  const issues: ExtensionIssue[] = [];
  for (const [file, load] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
    try { registry.push(validateExtension((await load()).default, registry)); }
    catch (error) { issues.push({ file, message: error instanceof Error ? error.message : 'Extension could not load.' }); }
  }
  return issues;
}
