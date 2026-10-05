import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { isolateHistory, redo, undo } from '@codemirror/commands';
import { EditorView, keymap, Decoration, type DecorationSet } from '@codemirror/view';
import { Compartment, EditorState, Prec, StateEffect, StateField, EditorSelection, type Extension } from '@codemirror/state';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { tags as t } from '@lezer/highlight';
import { strudelCompletions } from './completions';
import type { CodeEditorHandle, CodeEditorProps } from './types';

export type { CodeEditorHandle } from './types';

// ---- error line highlighting -------------------------------------------------

const setErrorLine = StateEffect.define<number | null>();

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (!effect.is(setErrorLine)) continue;
      if (effect.value == null) {
        deco = Decoration.none;
      } else {
        const n = Math.min(Math.max(1, effect.value), tr.state.doc.lines);
        deco = Decoration.set([Decoration.line({ class: 'cm-beat-error-line' }).range(tr.state.doc.line(n).from)]);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---- look ----------------------------------------------------------------------

const terminalTheme = EditorView.theme(
  {
    '&': { color: 'var(--fg)', backgroundColor: 'transparent', height: '100%', fontSize: 'var(--editor-font-size)' },
    '.cm-scroller': { fontFamily: 'var(--font-editor, var(--font-mono))', lineHeight: '1.55' },
    '.cm-content': { caretColor: 'var(--accent)' },
    '.cm-cursor, .cm-dropCursor': { borderLeft: '2px solid var(--accent)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--selection) !important' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--fg-muted)', border: 'none', borderRight: '1px dashed var(--border)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--selection) 45%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--accent)' },
    '.cm-matchingBracket': { outline: '1px solid var(--highlight)', backgroundColor: 'transparent' },
    '.cm-beat-error-line': { backgroundColor: 'color-mix(in srgb, var(--error) 18%, transparent)', boxShadow: 'inset 3px 0 0 var(--error)' },
    '.cm-tooltip': { backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--fg)' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--selection)', color: 'var(--accent)' },
    '.cm-completionInfo': { maxWidth: '320px', padding: '6px 10px' },
    '.cm-panels': { backgroundColor: 'var(--bg-raised)', color: 'var(--fg)', borderTop: '1px solid var(--border)' },
    '.cm-panels input, .cm-panels button': { fontFamily: 'var(--font-mono)' },
    '.cm-searchMatch': { backgroundColor: 'color-mix(in srgb, var(--highlight) 30%, transparent)' },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  { tag: t.comment, color: 'var(--fg-muted)', fontStyle: 'italic' },
  { tag: [t.string, t.special(t.string)], color: 'var(--highlight)' },
  { tag: [t.number, t.bool], color: 'var(--accent)' },
  { tag: [t.keyword, t.operator], color: 'var(--accent)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--fg)', fontWeight: 'bold' },
  { tag: t.labelName, color: 'var(--warn)' },
  { tag: [t.variableName, t.propertyName], color: 'var(--fg)' },
  { tag: t.invalid, color: 'var(--error)' },
]);

// ---- component -----------------------------------------------------------------

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const language = useRef(new Compartment());
  const states = useRef(new Map<string, EditorState>());
  const activeSession = useRef(props.sessionId);
  const languageExtensions = () => propsRef.current.language === 'ruby' ?
    [StreamLanguage.define(ruby)] : [javascript(), javascriptLanguage.data.of({ autocomplete: strudelCompletions })];

  const buildExtensions = (): Extension[] => [
    Prec.highest(
      keymap.of([
        { key: 'Mod-z', run: undo, shift: redo, preventDefault: true },
      ]),
    ),
    basicSetup,
    language.current.of(languageExtensions()),
    terminalTheme,
    syntaxHighlighting(highlight),
    errorLineField,
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ 'aria-label': 'Music code editor', spellcheck: 'false' }),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) propsRef.current.onChange(u.state.doc.toString());
      if (u.selectionSet || u.docChanged) {
        const head = u.state.selection.main.head;
        const line = u.state.doc.lineAt(head);
        propsRef.current.onCursor?.(line.number, head - line.from + 1);
      }
    }),
  ];

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({ doc: propsRef.current.initialCode, extensions: buildExtensions() }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor is created once; content changes go through the handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || activeSession.current === props.sessionId) return;
    if (activeSession.current) states.current.set(activeSession.current, view.state);
    activeSession.current = props.sessionId;
    const cached = props.sessionId ? states.current.get(props.sessionId) : undefined;
    view.setState(cached && cached.doc.toString() === props.initialCode ? cached :
      EditorState.create({ doc: props.initialCode, extensions: buildExtensions() }));
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    propsRef.current.onCursor?.(line.number, head - line.from + 1);
  }, [props.sessionId]);

  useEffect(() => {
    if (!props.openSessionIds) return;
    for (const id of states.current.keys()) if (!props.openSessionIds.includes(id)) states.current.delete(id);
  }, [props.openSessionIds]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: language.current.reconfigure(languageExtensions()) });
  }, [props.language]);

  useImperativeHandle(ref, () => ({
    getCode: () => viewRef.current?.state.doc.toString() ?? '',
    setCode: (code: string) => {
      const view = viewRef.current;
      if (!view) return;
      // A fresh state also resets undo history, so ctrl+z can't jump into another project.
      view.setState(EditorState.create({ doc: code, extensions: buildExtensions() }));
      propsRef.current.onChange(code);
    },
    insertSnippet: (text: string) => {
      const view = viewRef.current;
      if (!view) return;
      const { state } = view;
      const head = state.selection.main.head;
      const line = state.doc.lineAt(head);
      let insert: string;
      let from: number;
      if (text.startsWith('.')) {
        // method snippets chain onto the end of the current line
        from = line.to;
        insert = text;
      } else {
        from = line.to;
        insert = line.text.trim() ? `\n${text}` : text;
      }
      view.dispatch({ changes: { from, insert }, selection: EditorSelection.cursor(from + insert.length), scrollIntoView: true, annotations: isolateHistory.of('full') });
      view.focus();
    },
    prependSnippet: (text: string) => {
      const view = viewRef.current;
      if (!view || view.state.doc.toString().includes(text.trim())) return;
      view.dispatch({ changes: { from: 0, insert: text }, selection: EditorSelection.cursor(0), scrollIntoView: true, annotations: isolateHistory.of('full') });
    },
    focus: () => viewRef.current?.focus(),
    markError: (line: number | null) => viewRef.current?.dispatch({ effects: setErrorLine.of(line) }),
  }));

  return <div ref={hostRef} className="code-editor" data-testid="code-editor" />;
});
