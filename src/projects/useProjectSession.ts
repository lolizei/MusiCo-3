import { useCallback, useEffect, useRef, useState } from 'react';
import { ProjectError, validateName, type Draft, type Project, type ProjectStore } from './store';
import { NEW_PROJECT_TEMPLATE, type Example } from './examples';
import { DEFAULT_ENGINE_ID } from '../engines/registry';
import { SONIC_PI_TEMPLATE } from '../engines/sonic-pi/content';

const DRAFT_DELAY_MS = 600;

interface SessionState {
  project: Project;
  /** Code as last saved (or as loaded, for unsaved projects). Used for dirty tracking. */
  savedCode: string;
  persisted: boolean;
}

/**
 * Owns "what project is open". The editor holds the live text; this hook is
 * told about every change through `setCode` so it can track unsaved work and
 * write recovery drafts.
 */
export function useProjectSession(store: ProjectStore) {
  // A draft from a previous session is read once and held until the user decides.
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(() => {
    const draft = store.loadDraft();
    if (!draft) return null;
    const saved = draft.projectId ? store.get(draft.projectId) : undefined;
    return saved && saved.code === draft.code ? null : draft;
  });

  const [session, setSession] = useState<SessionState>(() => {
    const recent = store.list()[0];
    if (recent) return { project: recent, savedCode: recent.code, persisted: true };
    const fresh = store.create({ name: 'untitled', engine: DEFAULT_ENGINE_ID, code: NEW_PROJECT_TEMPLATE });
    return { project: fresh, savedCode: fresh.code, persisted: false };
  });
  const [code, setCodeState] = useState(session.project.code);
  const dirty = code !== session.savedCode;

  // ---- recovery drafts -------------------------------------------------------
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (pendingDraft) return; // never overwrite a draft the user hasn't answered about
    if (draftTimer.current) clearTimeout(draftTimer.current);
    if (!dirty) {
      store.clearDraft();
      return;
    }
    draftTimer.current = setTimeout(() => {
      store.saveDraft({
        projectId: session.persisted ? session.project.id : null,
        name: session.project.name,
        engine: session.project.engine,
        code,
      });
    }, DRAFT_DELAY_MS);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [code, dirty, pendingDraft, session, store]);

  // Write the draft immediately when the tab is closing (the timer may not fire).
  const latest = useRef({ code, dirty, session });
  latest.current = { code, dirty, session };
  useEffect(() => {
    const flush = () => {
      const { code: c, dirty: d, session: s } = latest.current;
      if (d) store.saveDraft({ projectId: s.persisted ? s.project.id : null, name: s.project.name, engine: s.project.engine, code: c });
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [store]);

  // ---- helpers -----------------------------------------------------------------
  const load = useCallback((project: Project, persisted: boolean, savedCode = project.code) => {
    setSession({ project, savedCode, persisted });
    setCodeState(project.code);
    return project;
  }, []);

  const setCode = useCallback((c: string) => setCodeState(c), []);

  const newProject = useCallback(
    (name?: string) => {
      const err = name ? validateName(name) : null;
      if (err) throw new ProjectError(err);
      const engine = latest.current.session.project.engine;
      const p = store.create({ name: store.uniqueName(name ?? 'untitled'), engine, code: engine === 'sonic-pi' ? SONIC_PI_TEMPLATE : NEW_PROJECT_TEMPLATE });
      return load(p, false);
    },
    [store, load],
  );

  const open = useCallback(
    (id: string) => {
      const p = store.get(id);
      if (!p) throw new ProjectError('That project no longer exists.');
      return load(p, true);
    },
    [store, load],
  );

  const loadExample = useCallback(
    (ex: Example) => load(store.create({ name: store.uniqueName(ex.id), engine: DEFAULT_ENGINE_ID, code: ex.code }), false),
    [store, load],
  );

  const loadCode = useCallback(
    (name: string, newCode: string, engineId = DEFAULT_ENGINE_ID) =>
      load(store.create({ name: store.uniqueName(name), engine: engineId, code: newCode }), false),
    [store, load],
  );

  /**
   * Saves in place. `currentCode` comes straight from the editor so a save
   * right after typing never misses the last keystrokes. For never-saved
   * projects the app asks for a name first.
   */
  const save = useCallback(
    (currentCode: string, name?: string) => {
      const { project } = latest.current.session;
      const saved = store.save({ ...project, name: name ?? project.name, code: currentCode });
      setSession({ project: saved, savedCode: currentCode, persisted: true });
      setCodeState(currentCode);
      return saved;
    },
    [store],
  );

  /** Saves a copy under a new name and switches to it. */
  const saveAs = useCallback(
    (name: string, currentCode: string) => {
      const { project } = latest.current.session;
      const copy = store.create({ name, engine: project.engine, code: currentCode });
      const saved = store.save(copy);
      setSession({ project: saved, savedCode: currentCode, persisted: true });
      setCodeState(currentCode);
      return saved;
    },
    [store],
  );

  const rename = useCallback(
    (name: string) => {
      const err = validateName(name);
      if (err) throw new ProjectError(err);
      const { project, persisted, savedCode } = latest.current.session;
      if (persisted) {
        const p = store.rename(project.id, name);
        setSession({ project: p, savedCode, persisted });
        return p;
      }
      if (store.isNameTaken(name)) throw new ProjectError(`A project called "${name.trim()}" already exists.`);
      const p = { ...project, name: name.trim() };
      setSession({ project: p, savedCode, persisted });
      return p;
    },
    [store],
  );

  /** Deletes a saved project. Returns true if it was the open one (caller loads something else). */
  const remove = useCallback(
    (id: string) => {
      store.delete(id);
      return latest.current.session.persisted && latest.current.session.project.id === id;
    },
    [store],
  );

  const importText = useCallback((text: string) => load(store.importProject(text), true), [store, load]);

  const resolveDraft = useCallback(
    (restore: boolean): Project | null => {
      const draft = pendingDraft;
      setPendingDraft(null);
      if (!draft || !restore) {
        store.clearDraft();
        return null;
      }
      const base = draft.projectId ? store.get(draft.projectId) : undefined;
      if (base) {
        setSession({ project: base, savedCode: base.code, persisted: true });
      } else {
        const p = store.create({ name: store.uniqueName(draft.name), engine: draft.engine, code: draft.code });
        setSession({ project: p, savedCode: NEW_PROJECT_TEMPLATE, persisted: false });
      }
      setCodeState(draft.code);
      return base ?? null;
    },
    [pendingDraft, store],
  );

  return {
    project: session.project,
    persisted: session.persisted,
    code,
    dirty,
    pendingDraft,
    setCode,
    newProject,
    open,
    loadExample,
    loadCode,
    save,
    saveAs,
    rename,
    remove,
    importText,
    resolveDraft,
  };
}

export type ProjectSession = ReturnType<typeof useProjectSession>;
