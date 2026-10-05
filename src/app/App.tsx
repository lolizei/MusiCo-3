import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor, type CodeEditorHandle } from '../editor/CodeEditor';
import { SampleManager } from '../samples/SampleManager';
import { PianoRoll } from '../editor/piano/PianoRoll';
import { NoteView } from '../editor/piano/NoteView';
import { useSnippetPreview } from '../tutorials/useSnippetPreview';
import { snippetPreviewCode } from '../tutorials/preview';
import { Modal } from '../ui/Modal';
import { useEngine } from '../engines/useEngine';
import { explainError } from '../engines/explain';
import { STRUDEL_NAMES } from '../engines/strudel/functions';
import { ENGINES, getEngineDescriptor } from '../engines/registry';
import type { EngineDiagnostic } from '../engines/types';
import { openBrowserStorage } from '../projects/browserStorage';
import { ProjectError, ProjectStore, validateName, type Project } from '../projects/store';
import { useProjectSession } from '../projects/useProjectSession';
import { ProjectTabs } from '../projects/ProjectTabs';
import { tabDirty } from '../projects/tabs';
import { EXAMPLES, getExample } from '../projects/examples';
import { EXTENSION_ISSUES } from '../engines/loadExtensions';
import { useSettings } from '../settings/useSettings';
import { applySettingFromText } from '../settings/settings';
import { SettingsPanel } from '../settings/SettingsPanel';
import { shortcutLabel } from '../settings/shortcuts';
import { availableThemes } from '../themes/themeFiles';
import { Terminal, type TerminalHandle } from '../terminal/Terminal';
import { useTerminalLog } from '../terminal/useTerminalLog';
import { executeCommand, type CommandContext, type CompletionData } from '../terminal/commands';
import { BeginnerPanel } from '../tutorials/BeginnerPanel';
import { Dialog, type DialogSpec } from '../ui/Dialog';
import { StatusBar, TitleBar, Toolbar } from '../ui/Chrome';
import { BOOT_BANNER } from '../ui/ascii';
import { StartupGreeting } from '../ui/StartupGreeting';
import { AudioControls } from '../audio/AudioControls';
import { useShortcuts } from './useShortcuts';
import { CommandPalette } from './CommandPalette';
import { buildPaletteEntries, type PaletteEntry } from './palette';

const MAX_IMPORT_BYTES = 1_000_000;

export default function App() {
  // ---- core state ---------------------------------------------------------------
  const storage = useMemo(() => openBrowserStorage(), []);
  const store = useMemo(() => new ProjectStore(storage.kv), [storage]);
  const { settings, update: updateSettings, replace: replaceSettings, settingsSaved } = useSettings(storage.kv);
  const term = useTerminalLog();
  const session = useProjectSession(store);

  const editorRef = useRef<CodeEditorHandle>(null);
  const terminalRef = useRef<TerminalHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialog, setDialog] = useState<{ key: number; spec: DialogSpec } | null>(null);
  const dialogCounter = useRef(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pianoOpen, setPianoOpen] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const panelOpen = settings.beginnerMode;
  const setPanelOpen = useCallback((open: boolean) => updateSettings({ beginnerMode: open }), [updateSettings]);
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
        print('  need help? open HELP ♡', 'info');
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
  const [noteLabel, setNoteLabel] = useState('');
  const audition = useSnippetPreview(session.activeId, engine, (title, result) => {
    if (result.ok) { setNoteLabel(`preview: ${title}`); print(`♫ preview: ${title}. Editor unchanged; STOP silences it, RUN plays your song.`, 'ok'); }
    else {
      // Preview errors belong to snippet code, not the editor's line numbers.
      print(`Preview failed: ${result.error.message}`, 'error');
    }
  });
  const run = useCallback(async () => {
    if (!engine.available) {
      print(engine.descriptor?.unavailableReason ?? 'this engine is not available', 'warn');
      return;
    }
    const code = editorRef.current?.getCode() ?? live.current.session.code;
    audition.cancel();
    const tabId = live.current.session.activeId;
    editorRef.current?.markError(null);
    const wasPlaying = engine.isPlaying();
    const res = await engine.run(code);
    if (live.current.session.activeId !== tabId) return;
    if (res.ok) {
      setNoteLabel(live.current.session.project.name);
      print(wasPlaying ? engine.descriptor?.capabilities.liveUpdate
        ? '↻ updated: your changes are applied without restarting playback'
        : `↻ replaced the previous music (${shortcutLabel(live.current.settings.shortcuts.stop)} to stop)`
        : `▶ playing ♡  (${shortcutLabel(live.current.settings.shortcuts.stop)} to stop)`, 'ok');
    } else {
      printError(res.error);
      if (wasPlaying && engine.isPlaying()) print('the previous version keeps playing until you fix it or press stop', 'info');
    }
  }, [engine, print, printError]);

  const stop = useCallback(() => {
    const wasPlaying = engine.isPlaying();
    audition.cancel();
    if (!wasPlaying) {
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
  const showInEditor = useCallback((_code: string) => {
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
    (load: () => Project, message: (p: Project) => string, preserve = false) => {
      const apply = () =>
        withErrors(() => {
          engine.stop();
          const p = load();
          showInEditor(p.code);
          print(message(p), 'ok');
        });
      if (preserve) apply(); else guardUnsaved(apply);
    },
    [guardUnsaved, withErrors, engine, showInEditor, print],
  );

  const newProject = useCallback(
    (name?: string) => switchProject(() => session.newProject(name), (p) => `new tab: ${p.name}.beat`, true),
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
        engine.stop();
        const p = live.current.session.saveAs(n, code);
        print(`saved a copy as ${p.name}.beat ♡`, 'ok');
      };
      if (name) withErrors(() => apply(name));
      else askName('save as', store.uniqueName(`${live.current.session.project.name}-copy`), 'save copy', apply);
    },
    [askName, store, withErrors, print, engine],
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
      switchProject(() => s.open(id), (p) => `opened ${p.name}.beat`, true);
    },
    [switchProject, print],
  );

  const selectTab = useCallback((id: string) => {
    if (id === live.current.session.activeId) return;
    withErrors(() => {
      engine.stop();
      const p = live.current.session.select(id);
      print(`switched to ${p.name}.beat. Press RUN to play.`, 'info');
    });
  }, [withErrors, engine, print]);

  const closeProjectTab = useCallback((id: string) => {
    const tab = live.current.session.tabs.find(t => t.project.id === id);
    if (!tab) return;
    const close = () => withErrors(() => {
      if (live.current.session.activeId === id) engine.stop();
      live.current.session.close(id);
    });
    if (tabDirty(tab) || !tab.persisted) openDialog({
      type: 'confirm', title: 'close tab?', message: `Close "${tab.project.name}" and discard its unsaved work? Save or export first to keep it.`,
      confirmLabel: 'close and discard', cancelLabel: 'keep editing', danger: true, onConfirm: close,
    });
    else close();
  }, [withErrors, engine, openDialog]);

  const cycleTab = (direction: number) => {
    const s = live.current.session;
    const index = s.tabs.findIndex(t => t.project.id === s.activeId);
    selectTab(s.tabs[(index + direction + s.tabs.length) % s.tabs.length].project.id);
  };

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
      empty: 'No saved projects yet. Press SAVE to save the one you are working on.',
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
      switchProject(() => live.current.session.loadExample(ex), () => `loaded example: ${ex.title}. press RUN to hear it ♡`);
    },
    [openDialog, print, switchProject],
  );

  const tryCode = useCallback(
    (title: string, code: string) =>
      switchProject(() => live.current.session.loadCode(title, code, live.current.session.project.engine), () => 'loaded into the editor. press RUN to hear it ♡'),
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
      try {
        const text = await file.text();
        switchProject(() => live.current.session.importText(text), (p) => `imported ${p.name}.beat ♡`, true);
      } catch (err) { print(`Could not read that project file: ${err instanceof Error ? err.message : 'unknown error'}`, 'error'); }
    },
    [print, switchProject],
  );

  const showHelp = useCallback(() => {
    setPanelOpen(true);
    executeCommand('help', ctxRef.current);
  }, []);

  // ---- terminal command context ------------------------------------------------
  const copyCode = useCallback(async () => {
    const code = editorRef.current?.getCode() ?? live.current.session.code;
    try { await navigator.clipboard.writeText(code); print('editor code copied ♡', 'ok'); }
    catch { setCopyFallback(code); print('clipboard unavailable: select the code and press Ctrl+C', 'warn'); }
  }, [print]);

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
      switchProject(() => live.current.session.loadCode(`${d.id}-song`,
        d.starterCode ?? '', d.id),
        () => `new ${d.name} project. ${d.id === 'sonic-pi' ? 'RUN connects to your separate Sonic Pi 5.0.0 installation.' : 'press RUN to play ♡'}`);
    },
    listThemes: () => availableThemes(settings.customTheme).map((t) => ({ id: t.id, name: t.name, current: t.id === settings.themeId })),
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
      `startup     ${settings.startupAnimation ? 'on' : 'off'} (next launch)`,
      `mascot      ${settings.terminalAnimation} (during playback)`,
      `mascotspeed  ${settings.terminalAnimationSpeed}`,
    ],
    tutorial: () => {
      updateSettings({ beginnerMode: true });
      setPanelOpen(true);
      setTutorialStep(0);
      print('tutorial opened on the right. follow the steps ♡', 'ok');
    },
    help: () => {
      print('commands:', 'info');
      print(`keys: ${shortcutLabel(settings.shortcuts.run)} run · ${shortcutLabel(settings.shortcuts.stop)} stop · ${shortcutLabel(settings.shortcuts.save)} save`, 'info');
    },
    customize: () => setSettingsOpen(true),
    copyCode: () => void copyCode(),
    pianoRoll: () => setPianoOpen(true),
    sampleManager: () => {
      if (live.current.session.project.engine !== 'strudel') { print('Sample sources are available for Strudel projects.', 'info'); return; }
      setSamplesOpen(true);
    },
    quit: () => {
      if (!window.desktopApp) { print('quit is available in the desktop app. Save or export, then close this browser tab.', 'info'); return; }
      void window.desktopApp.quit().catch(() => print('Could not close the app. Use the window close button.', 'error'));
    },
  };

  const getCompletionData = useCallback(
    (): CompletionData => ({
      themes: availableThemes(settings.customTheme).map((t) => t.id),
      examples: EXAMPLES.map((e) => e.id),
      projects: store.list().map((p) => p.name),
      engines: ENGINES.map((e) => e.id),
    }),
    [store, settings.customTheme],
  );

  // ---- startup -------------------------------------------------------------------
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return; // StrictMode runs effects twice in development
    booted.current = true;
    print(BOOT_BANNER, 'art');
    print('SYSTEM BOOT COMPLETE...', 'info');
    print(`AUDIO ENGINE: ${getEngineDescriptor(session.project.engine)?.name.toUpperCase() ?? session.project.engine}`, 'info');
    print('press RUN to play · type help for commands', 'ok');
    for (const issue of EXTENSION_ISSUES) print(`Engine extension skipped (${issue.file}): ${issue.message}`, 'warn');
    if (!storage.persistent) {
      print('browser storage is blocked, so saved projects will vanish on reload. use export to keep your work.', 'warn');
    }
    const draft = session.pendingDraft;
    if (draft) {
      openDialog({
        type: 'confirm',
        title: 'recover work?',
        message: `Found unsaved changes in ${session.recoveryCount} tab(s), including "${draft.name}". Restore all of them?`,
        confirmLabel: 'restore',
        cancelLabel: 'discard',
        onConfirm: () => {
          const restored = session.resolveDraft(true);
          if (restored && restored.id === session.activeId) editorRef.current?.setCode(restored.code);
          showInEditor(restored?.code ?? draft.code);
          print(`restored unsaved work for ${draft.name}. press SAVE to save it`, 'ok');
        },
        onCancel: () => session.resolveDraft(false),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!live.current.session.anyDirty) return;
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
      settings: () => setSettingsOpen(true),
      nextTab: () => cycleTab(1),
      previousTab: () => cycleTab(-1),
    },
    !dialog && !paletteOpen && !settingsOpen && !pianoOpen && !samplesOpen && copyFallback === null,
    settings.shortcuts,
  );

  const playing = engine.state === 'playing';
  const canRun = engine.available && (engine.state !== 'error' || session.project.engine === 'sonic-pi') && !!engine.descriptor?.capabilities.run;

  const paletteEntries = paletteOpen ? buildPaletteEntries({
    themes: availableThemes(settings.customTheme), examples: EXAMPLES, projects: store.list(), engines: ENGINES, canRun, playing,
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
    else if (target.action === 'toggle-help') { setPanelOpen(!panelOpen); editorRef.current?.focus(); }
    else if (target.action === 'settings') setSettingsOpen(true);
    else {
      const next = !settings.beginnerMode;
      updateSettings({ beginnerMode: next }); setPanelOpen(next); editorRef.current?.focus();
    }
  };

  return (
    <div className="app">
      <StartupGreeting enabled={settings.startupAnimation} animations={settings.animations} />
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
        onSettings={() => setSettingsOpen(true)}
        onCopy={() => void copyCode()}
        onPianoRoll={() => setPianoOpen(true)}
        onSamples={() => setSamplesOpen(true)}
        samplesEnabled={session.project.engine === 'strudel'}
        shortcuts={settings.shortcuts}
        liveUpdate={!!engine.descriptor?.capabilities.liveUpdate}
      />
      <main className={`workspace ${panelOpen ? 'with-panel' : ''}`}>
        <section className="frame editor-frame" aria-label="Code editor" id="music-editor-panel" role="tabpanel" aria-labelledby={'tab-' + session.activeId}>
          <h2 className="frame-title">project: {session.project.name}.beat</h2>
          <ProjectTabs tabs={session.tabs} activeId={session.activeId} onSelect={selectTab} onClose={closeProjectTab} onNew={() => newProject()} />
          {!session.recoveryAvailable && <p className="settings-error" role="alert">Draft storage is full or blocked. Export your work to keep it safe.</p>}
          <CodeEditor
            ref={editorRef}
            initialCode={session.code}
            sessionId={session.activeId}
            openSessionIds={session.tabs.map(t => t.project.id)}
            language={engine.descriptor?.language}
            onChange={session.setCode}
            onRun={() => void run()}
            onStop={stop}
            onCursor={(line, column) => setCursor({ line, column })}
          />
          {session.project.engine === 'strudel' && <NoteView snapshot={engine.getPianoSnapshot()} label={noteLabel} getLiveFrame={engine.getLivePianoFrame} playing={playing} animations={settings.animations} />}
        </section>
        {panelOpen && (
          <BeginnerPanel
            key={session.project.engine}
            kv={storage.kv}
            persistent={storage.persistent}
            getCode={() => editorRef.current?.getCode() ?? live.current.session.code}
            playing={playing}
            engineId={session.project.engine}
            shortcuts={settings.shortcuts}
            step={tutorialStep}
            onStepChange={setTutorialStep}
            onTryCode={tryCode}
            onInsert={(code) => editorRef.current?.insertSnippet(code)}
            previewTitle={engine.state === 'blocked' || engine.state === 'error' ? null : audition.title}
            onPreview={(title, code) => void audition.preview(title, snippetPreviewCode(code))}
            onStopPreview={stop}
          />
        )}
      </main>
      <Terminal
        ref={terminalRef}
        audioControls={<AudioControls getOutput={engine.getAudioOutput} state={engine.state} supported={!!engine.descriptor?.capabilities.visualization}
          volume={settings.masterVolume} muted={settings.masterMuted} onVolume={masterVolume => updateSettings({ masterVolume })}
          onMute={() => updateSettings({ masterMuted: !settings.masterMuted })} name={session.project.name} />}
        playing={playing}
        animation={settings.terminalAnimation}
        animationSpeed={settings.terminalAnimationSpeed}
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
      {settingsOpen && <SettingsPanel settings={settings} settingsSaved={settingsSaved && storage.persistent} onClose={() => setSettingsOpen(false)} onUpdate={patch => {
        updateSettings(patch);
        if (patch.beginnerMode !== undefined) setPanelOpen(patch.beginnerMode);
      }} />}
      {dialog && <Dialog key={dialog.key} spec={dialog.spec} onClose={() => setDialog(null)} />}
      {pianoOpen && <PianoRoll kv={storage.kv} persistent={storage.persistent} onClose={() => setPianoOpen(false)} onCreate={code => {
        switchProject(() => live.current.session.newFromCode('piano-roll', code, 'strudel'), () => 'piano sketch opened in a new Strudel tab. Press RUN to play ♡', true);
        setPianoOpen(false);
      }} />}
      {samplesOpen && <SampleManager kv={storage.kv} persistent={storage.persistent} onClose={() => setSamplesOpen(false)} onInsert={code => {
        editorRef.current?.prependSnippet(code);
        setSamplesOpen(false);
        print('sample loader added above your song. Review the source, then RUN; COPY CODE includes it.', 'info');
      }} onCreate={(name, code) => {
        switchProject(() => live.current.session.newFromCode(name.slice(0, 60), code, 'strudel'), () => 'sample demo opened in a new Strudel tab. Press RUN to play ♡', true);
        setSamplesOpen(false);
      }} />}
      {copyFallback !== null && <Modal title="copy editor code" onClose={() => setCopyFallback(null)}>
        <p>Select the code below and press Ctrl+C to copy it.</p>
        <textarea className="piano-code" aria-label="Code to copy" readOnly value={copyFallback} onFocus={e => e.target.select()} />
      </Modal>}
    </div>
  );
}
