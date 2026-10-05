import { ENGINES, EXTENSION_ENGINE_IDS } from './registry';
import { loadExtensionModules, type ExtensionModule, type ExtensionIssue } from './extensions/catalogue';

export const EXTENSION_ISSUES: ExtensionIssue[] = [];
const modules = import.meta.glob<ExtensionModule>('./extensions/*.engine.ts');
export async function loadEngineExtensions(): Promise<void> {
  const existing = new Set(ENGINES.map(engine => engine.id));
  EXTENSION_ISSUES.push(...await loadExtensionModules(ENGINES, modules));
  for (const engine of ENGINES) if (!existing.has(engine.id)) EXTENSION_ENGINE_IDS.add(engine.id);
}
