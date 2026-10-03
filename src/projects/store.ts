/**
 * Project persistence. Storage is injected so the same code runs against
 * localStorage in the browser and an in-memory map in tests.
 */

export const PROJECT_FORMAT_VERSION = 1;
export const MAX_NAME_LENGTH = 60;

export interface Project {
  formatVersion: number;
  id: string;
  name: string;
  /** Engine id, e.g. "strudel". Code is never translated between engines. */
  engine: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

export interface Draft {
  /** null when the work was never saved as a project */
  projectId: string | null;
  name: string;
  engine: string;
  code: string;
  savedAt: number;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class ProjectError extends Error {}

const PROJECTS_KEY = 'beatexe.projects.v1';
const DRAFT_KEY = 'beatexe.draft.v1';

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'The name cannot be empty.';
  if (name.length > MAX_NAME_LENGTH) return `Keep names under ${MAX_NAME_LENGTH} characters.`;
  if (/[\u0000-\u001f]/.test(name)) return 'The name contains invisible control characters.';
  return null;
}

function defaultId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class ProjectStore {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly now: () => number = () => Date.now(),
    private readonly makeId: () => string = defaultId,
  ) {}

  // ---- reading -----------------------------------------------------------

  private readAll(): Project[] {
    const raw = this.kv.getItem(PROJECTS_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isProject);
    } catch {
      // Corrupt data is never silently overwritten: keep a backup copy.
      this.kv.setItem(`${PROJECTS_KEY}.corrupt-backup`, raw);
      return [];
    }
  }

  private writeAll(projects: Project[]): void {
    try {
      this.kv.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch (err) {
      throw new ProjectError(
        `Could not save: browser storage is full or blocked (${(err as Error).message}). Export your project as a file to keep it safe.`,
      );
    }
  }

  /** Most recently changed first. */
  list(): Project[] {
    return this.readAll().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  get(id: string): Project | undefined {
    return this.readAll().find((p) => p.id === id);
  }

  findByName(name: string): Project | undefined {
    const n = name.trim().toLowerCase();
    return this.readAll().find((p) => p.name.toLowerCase() === n);
  }

  /** Finds a project by exact name, or by its number in `list()` (1-based). */
  resolve(query: string): Project | undefined {
    const q = query.trim();
    if (/^\d+$/.test(q)) return this.list()[Number(q) - 1];
    return this.findByName(q);
  }

  isNameTaken(name: string, exceptId?: string): boolean {
    const p = this.findByName(name);
    return !!p && p.id !== exceptId;
  }

  uniqueName(base: string, exceptId?: string): string {
    const clean = base.trim().slice(0, MAX_NAME_LENGTH - 4) || 'untitled';
    if (!this.isNameTaken(clean, exceptId)) return clean;
    for (let i = 2; ; i++) {
      const candidate = `${clean}-${i}`;
      if (!this.isNameTaken(candidate, exceptId)) return candidate;
    }
  }

  // ---- writing -----------------------------------------------------------

  /** Builds a new project object. It is not stored until `save` is called. */
  create(input: { name: string; engine: string; code: string }): Project {
    const t = this.now();
    return {
      formatVersion: PROJECT_FORMAT_VERSION,
      id: this.makeId(),
      name: input.name.trim(),
      engine: input.engine,
      code: input.code,
      createdAt: t,
      updatedAt: t,
    };
  }

  save(project: Project): Project {
    const err = validateName(project.name);
    if (err) throw new ProjectError(err);
    if (this.isNameTaken(project.name, project.id)) {
      throw new ProjectError(`A project called "${project.name.trim()}" already exists. Pick another name.`);
    }
    const saved: Project = { ...project, name: project.name.trim(), updatedAt: this.now() };
    const all = this.readAll().filter((p) => p.id !== project.id);
    all.push(saved);
    this.writeAll(all);
    return saved;
  }

  rename(id: string, newName: string): Project {
    const p = this.get(id);
    if (!p) throw new ProjectError('That project no longer exists.');
    return this.save({ ...p, name: newName });
  }

  delete(id: string): boolean {
    const all = this.readAll();
    const next = all.filter((p) => p.id !== id);
    if (next.length === all.length) return false;
    this.writeAll(next);
    return true;
  }

  // ---- drafts (crash / tab-close recovery) --------------------------------

  saveDraft(draft: Omit<Draft, 'savedAt'>): void {
    try {
      this.kv.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: this.now() }));
    } catch {
      // Drafts are best effort; a failing draft must never block editing.
    }
  }

  loadDraft(): Draft | null {
    const raw = this.kv.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
      const d = JSON.parse(raw) as Draft;
      return typeof d.code === 'string' && typeof d.name === 'string' ? d : null;
    } catch {
      return null;
    }
  }

  clearDraft(): void {
    this.kv.removeItem(DRAFT_KEY);
  }

  // ---- files -------------------------------------------------------------

  exportProject(project: Project): string {
    const { formatVersion, name, engine, code, createdAt, updatedAt } = project;
    return JSON.stringify({ app: 'beat.exe', formatVersion, name, engine, code, createdAt, updatedAt }, null, 2);
  }

  /** Parses an exported file and stores it under a free name. Always gets a new id. */
  importProject(text: string): Project {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new ProjectError('That file is not a BEAT.EXE project (it is not valid JSON).');
    }
    if (!data || typeof data !== 'object' || typeof data.code !== 'string') {
      throw new ProjectError('That file is not a BEAT.EXE project (no code found).');
    }
    if (typeof data.formatVersion === 'number' && data.formatVersion > PROJECT_FORMAT_VERSION) {
      throw new ProjectError('That project was made with a newer version of BEAT.EXE.');
    }
    const name = typeof data.name === 'string' && !validateName(data.name) ? data.name : 'imported';
    const engine = typeof data.engine === 'string' ? data.engine : 'strudel';
    const project = this.create({ name: this.uniqueName(name), engine, code: data.code });
    return this.save(project);
  }
}

function isProject(v: unknown): v is Project {
  const p = v as Project;
  return (
    !!p &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.code === 'string' &&
    typeof p.engine === 'string' &&
    typeof p.updatedAt === 'number'
  );
}
