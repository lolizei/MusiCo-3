import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor, type CodeEditorHandle } from '../editor/CodeEditor';
import { useEngine } from '../engines/useEngine';
import { explainError } from '../engines/explain';
import { STRUDEL_NAMES } from '../engines/strudel/functions';
import { ENGINES, getEngineDescriptor } from '../engines/registry';
import type { EngineDiagnostic } from '../engines/types';
import { openBrowserStorage } from '../projects/browserStorage';
import { ProjectError, ProjectStore, validateName, type Project } from '../projects/store';
import { useProjectSession } from '../projects/useProjectSession';
import { EXAMPLES, getExample, NEW_PROJECT_TEMPLATE } from '../projects/examples';
import { SONIC_PI_TEMPLATE } from '../engines/sonic-pi/content';
import { useSettings } from '../settings/useSettings';
import { applySettingFromText } from '../settings/settings';
import { THEMES } from '../themes/themes';
import { Terminal, type TerminalHandle } from '../terminal/Terminal';
import { useTerminalLog } from '../terminal/useTerminalLog';
import { executeCommand, type CommandContext, type CompletionData } from '../terminal/commands';
import { BeginnerPanel } from '../tutorials/BeginnerPanel';
import { Dialog, type DialogSpec } from '../ui/Dialog';
import { StatusBar, TitleBar, Toolbar } from '../ui/Chrome';
import { BOOT_BANNER } from '../ui/ascii';
import { useShortcuts } from './useShortcuts';
import { CommandPalette } from './CommandPalette';
import { buildPaletteEntries, type PaletteEntry } from './palette';

const MAX_IMPORT_BYTES = 1_000_000;

export default function App() {
  // ---- core state ---------------------------------------------------------------
  const storage = useMemo(() => openBrowserStorage(), []);
  const store = useMemo(() => new ProjectStore(storage.kv), [storage]);
  const { settings, update: updateSettings, replace: replaceSettings } = useSettings(storage.kv);
  const term = useTerminalLog();
  const session = useProjectSession(store);

  const editorRef = useRef<CodeEditorHandle>(null);
  const terminalRef = useRef<TerminalHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialog, setDialog] = useState<{ key: number; spec: DialogSpec } | null>(null);
  const dialogCounter = useRef(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(settings.beginnerMode);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  // Latest values for callbacks that must not go stale.
  const live = useRef({ session, settings });
  live.current = { session, settings };
  const { print, clear } = term;

  const openDialog = useCallback((spec: DialogSpec) => setDialog({ key: ++dialogCounter.current, spec }), []);

  // ---- errors ---------------------------------------------------------------------
  const printError = useCallback(
    (diag: EngineDiagnostic, whilePlaying = false) => {
      const ex = live.current.session.project.engine === 'sonic-pi'
        ? { headline: `Sonic Pi error${diag.line ? ` on line ${diag.line}` : ''}`, line: diag.line, technical: diag.message, details: ['Check the Ruby code and the Sonic Pi connection.'] }
        : explainError(diag, STRUDEL_NAMES);
      if (live.current.settings.beginnerMode) {
        print(whilePlaying ? 'ERROR WHILE PLAYING :(' : 'ERROR DETECTED :(', 'error');
        print(ex.headline, 'error');
        ex.details.forEach((d) => print(`  ${d}`, 'warn'));
        print(`  technical: ${ex.technical}`, 'info');
        print('  need help? press F1 ♡', 'info');
      } else {
        print(`error${ex.line ? ` (line ${ex.line})` : ''}: ${ex.technical}`, 'error');
      }
      if (ex.line) editorRef.current?.markError(ex.line);
    },
    [print],
  );

  const engine = useEngine(session.project.engine, {
    log: (level, message) => print(message, level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'),
    runtimeError: (d) => printError(d, true),
  });

  const withErrors = useCallback(
    (fn: () => void) => {
      try {
        fn();
      } catch (err) {
        print(err instanceof ProjectError ? err.message : `unexpected error: ${(err as Error).message}`, 'error');
      }
    },
    [print],
  );

  // ---- playback -------------------------------------------------------------------
  const run = useCallback(async () => {
    if (!engine.available) {
      print(engine.descriptor?.unavailableReason ?? 'this engine is not available', 'warn');
      return;
    }
    const code = editorRef.current?.getCode() ?? live.current.session.code;
    editorRef.current?.markError(null);
    const wasPlaying = engine.isPlaying();
    const res = await engine.run(code);
    if (res.ok) {
      print(wasPlaying ? engine.descriptor?.capabilities.liveUpdate
        ? '↻ updated: your changes are applied without restarting playback'
        : '↻ replaced the previous music (ctrl+. to stop)'
        : '▶ playing ♡  (ctrl+. to stop)', 'ok');
    } else {
      printError(res.error);
      if (wasPlaying && engine.isPlaying()) print('the previous version keeps playing until you fix it or press stop', 'info');
    }
  }, [engine, print, printError]);

  const stop = useCallback(() => {
    if (!engine.isPlaying()) {
      engine.stop(); // harmless; also silences anything left over
      print('nothing is playing', 'info');
      return;
    }
    engine.stop();
    print('■ stopped', 'ok');
  }, [engine, print]);

  const restart = useCallback(async () => {
    engine.stop();
    await run();
  }, [engine, run]);

  // ---- project actions --------------------------------------------------------------
  const showInEditor = useCallback((code: string) => {
    editorRef.current?.setCode(code);
    editorRef.current?.markError(null);
    editorRef.current?.focus();
  }, []);

  /** Runs `action` right away, or after confirmation when there are unsaved changes. */
  const guardUnsaved = useCallback(
    (action: () => void) => {
      const s = live.current.session;
      if (!s.dirty) return action();
      openDialog({
        type: 'confirm',
        title: 'unsaved changes',
        message: `"${s.project.name}" has changes that are not saved. Continue and lose them?`,
        confirmLabel: 'discard changes',
        cancelLabel: 'keep editing',
        danger: true,
        onConfirm: action,
      });
    },
    [openDialog],
  );

  const switchProject = useCallback(
    (load: () => Project, message: (p: Project) => string) =>
      guardUnsaved(() =>
        withErrors(() => {
          engine.stop();
          const p = load();
          showInEditor(p.code);
          print(message(p), 'ok');
        }),
      ),
    [guardUnsaved, withErrors, engine, showInEditor, print],
  );

  const newProject = useCallback(
    (name?: string) => switchProject(() => session.newProject(name), (p) => `new project: ${p.name}.beat`),
    [switchProject, session],
  );

  const askName = useCallback(
    (title: string, initial: string, confirmLabel: string, apply: (name: string) => void) =>
      openDialog({
        type: 'prompt',
        title,
        message: 'project name',
        initial,
        confirmLabel,
        onSubmit: (value) => {
          const err = validateName(value);
          if (err) return err;
          try {
            apply(value.trim());
            return null;
          } catch (e) {
            return (e as Error).message;
          }
        },
      }),
    [openDialog],
  );

  const save = useCallback(() => {
    const code = editorRef.current?.getCode() ?? live.current.session.code;
    const s = live.current.session;
    if (!s.persisted) {
      askName('save project', store.uniqueName(s.project.name), 'save', (name) => {
        const p = s.save(code, name);
        print(`saved ${p.name}.beat ♡`, 'ok');
      });
      return;
    }
    withErrors(() => {
      const p = s.save(code);
      print(`saved ${p.name}.beat ♡`, 'ok');
    });
  }, [askName, store, withErrors, print]);

  const saveAs = useCallback(
    (name?: string) => {
      const code = editorRef.current?.getCode() ?? live.current.session.code;
      const apply = (n: string) => {
        const p = live.current.session.saveAs(n, code);
        print(`saved a copy as ${p.name}.beat ♡`, 'ok');
      };
      if (name) withErrors(() => apply(name));
      else askName('save as', store.uniqueName(`${live.current.session.project.name}-copy`), 'save copy', apply);
    },
    [askName, store, withErrors, print],
  );

  const rename = useCallback(
    (name?: string) => {
      const apply = (n: string) => {
        const p = live.current.session.rename(n);
        print(`renamed to ${p.name}.beat`, 'ok');
      };
      if (name) withErrors(() => apply(name));
      else askName('rename project', live.current.session.project.name, 'rename', apply);
    },
    [askName, withErrors, print],
  );

  const openProject = useCallback(
    (id: string) => {
      const s = live.current.session;
      if (s.persisted && s.project.id === id) {
        print(`${s.project.name}.beat is already open`, 'info');
        return;
      }
      switchProject(() => s.open(id), (p) => `opened ${p.name}.beat`);
    },
    [switchProject, print],
  );

  const confirmDelete = useCallback(
    (id: string) => {
      const p = store.get(id);
      if (!p) return print('that project no longer exists', 'warn');
      openDialog({
        type: 'confirm',
        title: 'delete project',
        message: `Delete "${p.name}" forever? This cannot be undone. Use export first if you want a backup.`,
        confirmLabel: 'delete forever',
        danger: true,
        onConfirm: () =>
          withErrors(() => {
            const wasOpen = live.current.session.remove(id);
            print(`deleted ${p.name}.beat`, 'ok');
            if (wasOpen) {
              engine.stop();
              const fresh = live.current.session.newProject();
              showInEditor(fresh.code);
              print(`that was the open project, so here is a new one: ${fresh.name}.beat`, 'info');
            }
          }),
      });
    },
    [store, openDialog, withErrors, print, engine, showInEditor],
  );

  const showProjectPicker = useCallback(() => {
    openDialog({
      type: 'picker',
      title: 'open project',
      empty: 'No saved projects yet. Press Ctrl+S to save the one you are working on.',
      items: store.list().map((p) => ({ id: p.id, label: p.name, detail: new Date(p.updatedAt).toLocaleString() })),
      onSelect: openProject,
      deleteLabel: 'delete…',
      onDelete: confirmDelete,
    });
  }, [openDialog, store, openProject, confirmDelete]);

  const loadExample = useCallback(
    (query?: string) => {
      if (!query) {
        openDialog({
          type: 'picker',
          title: 'examples',
          empty: 'No examples available.',
          items: EXAMPLES.map((e) => ({ id: e.id, label: `${'♪'.repeat(e.level)} ${e.title}`, detail: e.description })),
          onSelect: (id) => loadExample(id),
        });
        return;
      }
      const ex = getExample(query);
      if (!ex) return print(`no example "${query}". type examples to see the list`, 'warn');
      switchProject(() => live.current.session.loadExample(ex), () => `loaded example: ${ex.title}. press ctrl+enter to hear it ♡`);
    },
    [openDialog, print, switchProject],
  );

  const tryCode = useCallback(
    (title: string, code: string) =>
      switchProject(() => live.current.session.loadCode(title, code, live.current.session.project.engine), () => 'loaded into the editor. press ctrl+enter to hear it ♡'),
    [switchProject],
  );

  const exportProject = useCallback(() => {
    withErrors(() => {
      const s = live.current.session;
      const text = store.exportProject({ ...s.project, code: editorRef.current?.getCode() ?? s.code });
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${s.project.name.replace(/[^\w\-♡ ]+/g, '_')}.beat.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      print(`exported ${a.download}`, 'ok');
    });
  }, [store, withErrors, print]);

  const onImportFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES) return print('that file is too big to be a BEAT.EXE project', 'error');
      const text = await file.text();
      switchProject(() => live.current.session.importText(text), (p) => `imported ${p.name}.beat ♡`);
    },
    [print, switchProject],
  );

  const showHelp = useCallback(() => {
    setPanelOpen(true);
    executeCommand('help', ctxRef.current);
  }, []);

  // ---- terminal command context ------------------------------------------------
  const ctxRef = useRef<CommandContext>(null as unknown as CommandContext);
  ctxRef.current = {
    print,
    clear,
    run: () => void run(),
    stop,
    restart: () => void restart(),
    newProject,
    save,
    saveAs,
    rename,
    open: (q) => {
      if (!q) return showProjectPicker();
      const p = store.resolve(q);
      if (!p) return print(`no project "${q}". type projects to see the list`, 'warn');
      openProject(p.id);
    },
    remove: (q) => {
      if (!q) return print('usage: delete <number or name>', 'warn');
      const p = store.resolve(q);
      if (!p) return print(`no project "${q}"`, 'warn');
      confirmDelete(p.id);
    },
    listProjects: () =>
      store.list().map((p) => ({
        name: p.name,
        updatedAt: p.updatedAt,
        current: session.persisted && p.id === session.project.id,
      })),
    exportProject,
    importProject: () => fileInputRef.current?.click(),
    listExamples: () => EXAMPLES.map((e) => ({ id: e.id, title: e.title, level: e.level })),
    loadExample,
    engineInfo: () => ({
      current: session.project.engine,
      engines: ENGINES.map((e) => ({ id: e.id, name: e.name, available: e.available, note: e.unavailableReason })),
    }),
    setEngine: (id) => {
      const d = getEngineDescriptor(id);
      if (!d) return print(`unknown engine "${id}"`, 'warn');
      if (!d.available) return print(`${d.name}: ${d.unavailableReason}`, 'warn');
      if (d.id === session.project.engine) return print(`${d.name} is already the engine for this project`, 'info');
      switchProject(() => live.current.session.loadCode(d.id === 'sonic-pi' ? 'sonic-pi-song' : 'strudel-song',
        d.id === 'sonic-pi' ? SONIC_PI_TEMPLATE : NEW_PROJECT_TEMPLATE, d.id),
        () => `new ${d.name} project. ${d.id === 'sonic-pi' ? 'RUN connects to your separate Sonic Pi 5.0.0 installation.' : 'press ctrl+enter to play ♡'}`);
    },
    listThemes: () => THEMES.map((t) => ({ id: t.id, name: t.name, current: t.id === settings.themeId })),
    set: (key, value) => {
      const r = applySettingFromText(settings, key, value);
      if (!r.ok) return print(r.error, 'warn');
      replaceSettings(r.settings);
      if (key.toLowerCase() === 'mode') setPanelOpen(r.settings.beginnerMode);
      print(r.message, 'ok');
    },
    describeSettings: () => [
      `theme       ${settings.themeId}`,
      `fontsize    ${settings.fontSize}`,
      `mode        ${settings.beginnerMode ? 'beginner' : 'advanced'}`,
      `crt         ${settings.crtEffects ? 'on' : 'off'}`,
      `animations  ${settings.animations ? 'on' : 'off'}`,
    ],
    tutorial: () => {
      updateSettings({ beginnerMode: true });
      setPanelOpen(true);
      setTutorialStep(0);
      print('tutorial opened on the right. follow the steps ♡', 'ok');
    },
    help: () => print('commands:', 'info'),
  };

  const getCompletionData = useCallback(
    (): CompletionData => ({
      themes: THEMES.map((t) => t.id),
      examples: EXAMPLES.map((e) => e.id),
      projects: store.list().map((p) => p.name),
      engines: ENGINES.map((e) => e.id),
    }),
    [store],
  );

  // ---- startup -------------------------------------------------------------------
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return; // StrictMode runs effects twice in development
    booted.current = true;
    print(BOOT_BANNER, 'art');
    print('SYSTEM BOOT COMPLETE...', 'info');
    print(`AUDIO ENGINE: ${getEngineDescriptor(session.project.engine)?.name.toUpperCase() ?? session.project.engine}`, 'info');
    print('press ctrl+enter to play · type help for commands', 'ok');
    if (!storage.persistent) {
      print('browser storage is blocked, so saved projects will vanish on reload. use export to keep your work.', 'warn');
    }
    const draft = session.pendingDraft;
    if (draft) {
      openDialog({
        type: 'confirm',
        title: 'recover work?',
        message: `Found unsaved changes to "${draft.name}" from ${new Date(draft.savedAt).toLocaleString()}. Restore them?`,
        confirmLabel: 'restore',
        cancelLabel: 'discard',
        onConfirm: () => {
          session.resolveDraft(true);
          showInEditor(draft.code);
          print(`restored unsaved work for ${draft.name}. press ctrl+s to save it`, 'ok');
        },
        onCancel: () => session.resolveDraft(false),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!live.current.session.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useShortcuts(
    {
      run: () => void run(),
      stop,
      save,
      saveAs: () => saveAs(),
      open: showProjectPicker,
      newProject: () => newProject(),
      openPalette: () => setPaletteOpen(true),
      help: showHelp,
    },
    !dialog && !paletteOpen,
  );

  const playing = engine.state === 'playing';
  const canRun = engine.available && (engine.state !== 'error' || session.project.engine === 'sonic-pi') && !!engine.descriptor?.capabilities.run;

  const paletteEntries = paletteOpen ? buildPaletteEntries({
    themes: THEMES, examples: EXAMPLES, projects: store.list(), engines: ENGINES, canRun, playing,
  }) : [];

  const selectPaletteEntry = (entry: PaletteEntry) => {
    if (entry.disabledReason) return;
    const target = entry.target;
    if (target.kind === 'project') {
      if (target.operation === 'open') openProject(target.id);
      else confirmDelete(target.id);
    } else if (target.kind === 'command') {
      if (target.prepare) terminalRef.current?.prepareCommand(`${target.command} `);
      else { editorRef.current?.focus(); executeCommand(target.command, ctxRef.current); }
    } else if (target.action === 'focus-terminal') terminalRef.current?.focus();
    else if (target.action === 'help') { editorRef.current?.focus(); showHelp(); }
    else if (target.action === 'toggle-help') { setPanelOpen(open => !open); editorRef.current?.focus(); }
    else {
      const next = !settings.beginnerMode;
      updateSettings({ beginnerMode: next }); setPanelOpen(next); editorRef.current?.focus();
    }
  };

  return (
    <div className="app">
      <TitleBar
        projectName={session.project.name}
        dirty={session.dirty}
        persisted={session.persisted}
        engineId={session.project.engine}
        beginnerMode={settings.beginnerMode}
        onEngineChange={(id) => ctxRef.current.setEngine(id)}
        onToggleMode={() => {
          const next = !settings.beginnerMode;
          updateSettings({ beginnerMode: next });
          setPanelOpen(next);
          print(next ? 'beginner mode on: guide, snippets and friendly errors ♡' : 'advanced mode on: short errors, no side panel', 'ok');
        }}
      />
      <Toolbar
        canRun={canRun}
        playing={playing}
        disabledReason={engine.state === 'error' ? 'The audio engine failed to start. Reload the page to retry.' : engine.descriptor?.unavailableReason}
        onRun={() => void run()}
        onStop={stop}
        onRestart={() => void restart()}
        onSave={save}
        onOpen={showProjectPicker}
        onNew={() => newProject()}
        onExamples={() => loadExample()}
        onHelp={showHelp}
        onPalette={() => setPaletteOpen(true)}
      />
      <main className={`workspace ${panelOpen ? 'with-panel' : ''}`}>
        <section className="frame editor-frame" aria-label="Code editor">
          <h2 className="frame-title">project: {session.project.name}.beat</h2>
          <CodeEditor
            ref={editorRef}
            initialCode={session.code}
            language={engine.descriptor?.language}
            onChange={session.setCode}
            onRun={() => void run()}
            onStop={stop}
            onCursor={(line, column) => setCursor({ line, column })}
          />
        </section>
        {panelOpen && (
          <BeginnerPanel
            key={session.project.engine}
            engineId={session.project.engine}
            step={tutorialStep}
            onStepChange={setTutorialStep}
            onTryCode={tryCode}
            onInsert={(code) => editorRef.current?.insertSnippet(code)}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </main>
      <Terminal
        ref={terminalRef}
        lines={term.lines}
        onCommand={(line) => executeCommand(line, ctxRef.current)}
        getCompletionData={getCompletionData}
        onShowCandidates={(c) => print(c.join('   '), 'info')}
      />
      <StatusBar
        descriptor={engine.descriptor}
        state={engine.state}
        animations={settings.animations}
        cursor={cursor}
        storagePersistent={storage.persistent}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.beat.json,application/json"
        hidden
        data-testid="import-input"
        onChange={(e) => {
          void onImportFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {settings.crtEffects && <div className="crt-overlay" aria-hidden="true" />}
      {paletteOpen && <CommandPalette entries={paletteEntries} onClose={() => setPaletteOpen(false)} onSelect={selectPaletteEntry} />}
      {dialog && <Dialog key={dialog.key} spec={dialog.spec} onClose={() => setDialog(null)} />}
    </div>
  );
}
