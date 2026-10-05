import { useCallback, useEffect, useRef, useState } from 'react';
import { ProjectError, validateName, type Draft, type Project, type ProjectStore } from './store';
import { NEW_PROJECT_TEMPLATE, type Example } from './examples';
import { DEFAULT_ENGINE_ID, getEngineDescriptor } from '../engines/registry';
import { activeTab, closeTab, discardWorkspaceChanges, openTab, tabDirty, updateTab, type WorkspaceSession } from './tabs';

export function useProjectSession(store: ProjectStore) {
  const [initial] = useState(() => {
    const snapshot = store.loadWorkspace();
    const recent = store.list()[0];
    const project = recent ?? store.create({ name: 'untitled', engine: DEFAULT_ENGINE_ID, code: NEW_PROJECT_TEMPLATE });
    const fallback = openTab({ tabs: [], activeId: '' }, project, !!recent);
    const oldDraft = !snapshot ? store.loadDraft() : null;
    const draft = oldDraft && (!oldDraft.projectId || store.get(oldDraft.projectId)?.code !== oldDraft.code) ? oldDraft : null;
    return { workspace: snapshot ?? fallback, draft, recovery: snapshot?.tabs.some(tabDirty) ? snapshot : null };
  });
  const [workspace, setWorkspace] = useState<WorkspaceSession>(() => discardWorkspaceChanges(initial.workspace));
  const [pending, setPending] = useState(() => !!initial.recovery || !!initial.draft);
  const [recoveryAvailable, setRecoveryAvailable] = useState(true);
  const latest = useRef(workspace);
  latest.current = workspace;
  // Update the ref synchronously too: typing, saving and switching may happen in one event.
  const change = useCallback((next: WorkspaceSession) => { latest.current = next; setWorkspace(next); }, []);
  const tab = activeTab(workspace);
  const dirtyTabs = workspace.tabs.filter(tabDirty);
  const pendingDraft: Draft | null = pending ? initial.draft ?? (() => {
    const t = initial.recovery!.tabs.find(tabDirty)!;
    return { projectId: t.persisted ? t.project.id : null, name: t.project.name, engine: t.project.engine, code: t.code, savedAt: t.project.updatedAt };
  })() : null;

  useEffect(() => {
    if (pending) return;
    const timer = setTimeout(() => setRecoveryAvailable(store.saveWorkspace(latest.current)), 600);
    return () => clearTimeout(timer);
  }, [workspace, pending, store]);
  useEffect(() => {
    const flush = () => { if (!pending) setRecoveryAvailable(store.saveWorkspace(latest.current)); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [pending, store]);

  const uniqueName = (base: string) => {
    let name = store.uniqueName(base);
    let count = 2;
    while (latest.current.tabs.some(t => t.project.name.toLowerCase() === name.toLowerCase())) name = store.uniqueName(base.slice(0, 54) + '-' + count++);
    return name;
  };
  const load = useCallback((project: Project, persisted: boolean, replace = false) => {
    const current = latest.current;
    change(replace ? updateTab(current, current.activeId, { project, code: project.code, savedCode: project.code, persisted }) : openTab(current, project, persisted));
    return project;
  }, [change]);
  const setCode = useCallback((code: string) => change(updateTab(latest.current, latest.current.activeId, { code })), [change]);
  const newProject = (name?: string) => {
    const err = name ? validateName(name) : null;
    if (err) throw new ProjectError(err);
    const engine = activeTab(latest.current).project.engine;
    return load(store.create({ name: uniqueName(name ?? 'untitled'), engine, code: getEngineDescriptor(engine)?.starterCode ?? '' }), false);
  };
  const open = (id: string) => {
    const p = store.get(id);
    if (!p) throw new ProjectError('That project no longer exists.');
    load(p, true);
    return { ...activeTab(latest.current).project, code: activeTab(latest.current).code };
  };
  const select = (id: string) => {
    const t = latest.current.tabs.find(t => t.project.id === id);
    if (!t) throw new ProjectError('That tab is no longer open.');
    change({ ...latest.current, activeId: id });
    return { ...t.project, code: t.code };
  };
  const close = (id: string) => {
    const engine = activeTab(latest.current).project.engine;
    const fallback = store.create({ name: uniqueName('untitled'), engine, code: getEngineDescriptor(engine)?.starterCode ?? '' });
    change(closeTab(latest.current, id, fallback));
  };
  const save = (currentCode: string, name?: string) => {
    const current = activeTab(latest.current);
    const saved = store.save({ ...current.project, name: name ?? current.project.name, code: currentCode });
    change(updateTab(latest.current, current.project.id, { project: saved, code: currentCode, savedCode: currentCode, persisted: true }));
    return saved;
  };
  const saveAs = (name: string, currentCode: string) => {
    const current = activeTab(latest.current);
    const copy = store.save(store.create({ name, engine: current.project.engine, code: currentCode }));
    return load(copy, true); // Keep the original tab, including its unsaved changes.
  };
  const rename = (name: string) => {
    const err = validateName(name);
    if (err) throw new ProjectError(err);
    const current = activeTab(latest.current);
    if (latest.current.tabs.some(t => t.project.id !== current.project.id && t.project.name.toLowerCase() === name.trim().toLowerCase())) throw new ProjectError('Another open tab already has that name.');
    if (store.isNameTaken(name, current.project.id)) throw new ProjectError('A saved project already has that name.');
    const p = current.persisted ? store.rename(current.project.id, name) : { ...current.project, name: name.trim() };
    change(updateTab(latest.current, current.project.id, { project: p }));
    return p;
  };
  const remove = (id: string) => {
    store.delete(id);
    // Retain open text as an unsaved tab: deleting a saved file never destroys draft code.
    const current = latest.current.tabs.find(t => t.project.id === id);
    if (current) change(updateTab(latest.current, id, { persisted: false }));
    return false;
  };
  const resolveDraft = (restore: boolean): Project | null => {
    if (restore && initial.recovery) change(initial.recovery);
    else if (restore && initial.draft) {
      const d = initial.draft;
      const base = d.projectId ? store.get(d.projectId) : undefined;
      const p = base ?? store.create({ name: uniqueName(d.name), engine: d.engine, code: d.code });
      change(updateTab(openTab(latest.current, p, !!base), p.id, { code: d.code, savedCode: base?.code ?? '' }));
    }
    setPending(false);
    store.clearDraft();
    const current = activeTab(latest.current);
    return restore ? { ...current.project, code: current.code } : null;
  };
  return {
    project: tab.project, persisted: tab.persisted, code: tab.code, dirty: tabDirty(tab),
    tabs: workspace.tabs, activeId: workspace.activeId, anyDirty: dirtyTabs.length > 0,
    recoveryAvailable, pendingDraft, recoveryCount: initial.recovery?.tabs.filter(tabDirty).length ?? 1,
    setCode, newProject, open, select, close, save, saveAs, rename, remove, resolveDraft,
    loadExample: (ex: Example) => load(store.create({ name: uniqueName(ex.id), engine: DEFAULT_ENGINE_ID, code: ex.code }), false, true),
    loadCode: (name: string, code: string, engineId = DEFAULT_ENGINE_ID) => load(store.create({ name: uniqueName(name), engine: engineId, code }), false, true),
    newFromCode: (name: string, code: string, engineId = DEFAULT_ENGINE_ID) => load(store.create({ name: uniqueName(name), engine: engineId, code }), false),
    importText: (text: string) => load(store.importProject(text), true),
  };
}
export type ProjectSession = ReturnType<typeof useProjectSession>;
