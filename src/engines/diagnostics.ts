import type { EngineDiagnostic } from './types';

/** Network/decoding failures emitted by Strudel's sample loader. */
export function isResourceFailure(message: string): boolean {
  return /Failed to fetch|fetch failed|NetworkError|Network request failed|Load failed|error loading ["']https?:|could not load|Unable to decode audio|EncodingError/i.test(message);
}

/** Turns whatever an engine threw or logged into a diagnostic, with a line number if one is present. */
export function toDiagnostic(err: unknown): EngineDiagnostic {
  let message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : safeStringify(err);
  message = message.replace(/^\s*\[eval\]\s*(error:)?\s*/i, '').trim() || 'Unknown error';
  const diag: EngineDiagnostic = { message };
  if (isResourceFailure(message)) diag.kind = 'resource';
  else if (/sound .* not found|not found! Is it loaded/i.test(message)) diag.kind = 'sound';

  const loc = (err as { loc?: { line?: number; column?: number } } | null)?.loc;
  // Acorn style: "Unexpected token (3:12)" — column is 0-based
  const acorn = message.match(/\((\d+):(\d+)\)/);
  // Generic style: "line 3 column 12" (mini-notation uses this for the pattern string, so skip it)
  const words = message.match(/line\s+(\d+)(?:,?\s*col(?:umn)?\s+(\d+))?/i);

  if (loc && typeof loc.line === 'number') {
    diag.line = loc.line;
    if (typeof loc.column === 'number') diag.column = loc.column + 1;
  } else if (acorn) {
    diag.line = Number(acorn[1]);
    diag.column = Number(acorn[2]) + 1;
  } else if (words && !/mini/i.test(message)) {
    diag.line = Number(words[1]);
    if (words[2]) diag.column = Number(words[2]);
  }
  return diag;
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

/** True when the code has nothing but whitespace and comments. */
export function isEffectivelyEmpty(code: string): boolean {
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return stripped.trim().length === 0;
}
