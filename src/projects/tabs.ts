import { ProjectError, type Project } from './store';

export interface ProjectTab {
  project: Project;
  code: string;
  savedCode: string;
  persisted: boolean;
}
export interface WorkspaceSession {
  tabs: ProjectTab[];
  activeId: string;
}
export const tabDirty = (tab: ProjectTab) => tab.code !== tab.savedCode;
export const activeTab = (workspace: WorkspaceSession) => workspace.tabs.find(t => t.project.id === workspace.activeId)!;

export function openTab(workspace: WorkspaceSession, project: Project, persisted: boolean): WorkspaceSession {
  if (workspace.tabs.length >= 100 && !workspace.tabs.some(t => t.project.id === project.id)) {
    throw new ProjectError('You have 100 tabs open. Save or export your work and close a tab before opening another.');
  }
  return {
    tabs: workspace.tabs.some(t => t.project.id === project.id) ? workspace.tabs :
      [...workspace.tabs, { project, code: project.code, savedCode: project.code, persisted }],
    activeId: project.id,
  };
}
export function updateTab(workspace: WorkspaceSession, id: string, patch: Partial<ProjectTab>): WorkspaceSession {
  const tabs = workspace.tabs.map(t => t.project.id === id ? { ...t, ...patch } : t);
  const changed = tabs.find((_, i) => workspace.tabs[i].project.id === id);
  return { tabs, activeId: workspace.activeId === id && changed ? changed.project.id : workspace.activeId };
}
/** The caller must confirm discarding dirty work and supply a fallback for the last tab. */
export function closeTab(workspace: WorkspaceSession, id: string, fallback: Project): WorkspaceSession {
  const index = workspace.tabs.findIndex(t => t.project.id === id);
  if (index < 0) return workspace;
  const tabs = workspace.tabs.filter(t => t.project.id !== id);
  if (!tabs.length) return openTab({ tabs: [], activeId: '' }, fallback, false);
  return { tabs, activeId: workspace.activeId === id ? tabs[Math.min(index, tabs.length - 1)].project.id : workspace.activeId };
}

/** Treat storage as untrusted input. Reject incomplete snapshots without destroying the original. */
export function parseWorkspace(raw: string | null): WorkspaceSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('tabs' in value) || !('activeId' in value)) return null;
    if (!Array.isArray(value.tabs) || !value.tabs.length || value.tabs.length > 100 || typeof value.activeId !== 'string') return null;
    const tabs: ProjectTab[] = [];
    for (const item of value.tabs) {
      if (!item || typeof item !== 'object') return null;
      const tab = item as Partial<ProjectTab>;
      const p = tab.project;
      if (!p || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || typeof p.engine !== 'string'
        || typeof p.code !== 'string' || p.formatVersion !== 1 || !Number.isFinite(p.createdAt) || !Number.isFinite(p.updatedAt)
        || typeof tab.code !== 'string' || typeof tab.savedCode !== 'string' || typeof tab.persisted !== 'boolean'
        || tabs.some(t => t.project.id === p.id)) return null;
      tabs.push({ project: p, code: tab.code, savedCode: tab.savedCode, persisted: tab.persisted });
    }
    if (!tabs.some(t => t.project.id === value.activeId)) return null;
    return { tabs, activeId: value.activeId };
  } catch { return null; }
}

export function discardWorkspaceChanges(workspace: WorkspaceSession): WorkspaceSession {
  return { ...workspace, tabs: workspace.tabs.map(t => ({ ...t, code: t.savedCode })) };
}
