export interface CodeEditorHandle {
  getCode(): string;
  /** Replaces the whole document and resets undo history. */
  setCode(code: string): void;
  /** Inserts on a new line (or chains a `.method` onto the current line). Undoable. */
  insertSnippet(text: string): void;
  focus(): void;
  /** Highlights a 1-based line as an error, or clears it with null. */
  markError(line: number | null): void;
}

export interface CodeEditorProps {
  initialCode: string;
  onChange(code: string): void;
  onRun(): void;
  onStop(): void;
  onCursor?(line: number, column: number): void;
}
