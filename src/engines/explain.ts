import type { EngineDiagnostic } from './types';
import { isResourceFailure, isAudioFailure } from './diagnostics';

export interface Explanation {
  headline: string;
  details: string[];
  line?: number;
  technical: string;
}

/**
 * Turns a raw engine error into beginner-friendly guidance.
 * Pure function with no engine or DOM access, so it is unit-tested directly.
 */
export function explainError(diag: EngineDiagnostic, knownNames: string[]): Explanation {
  const msg = diag.message;
  const where = diag.line ? `around line ${diag.line}` : 'in your code';
  const base = { line: diag.line, technical: msg };

  if (diag.kind === 'audio' || isAudioFailure(msg)) return {
    ...base,
    headline: 'An audio processor could not start.',
    details: [
      'Playback stopped because an audio effect is unavailable. This is not a bracket or function-name error.',
      'Save or export your code, then restart the app or reload the page to retry.',
      'For the shape-processor error, remove .shape(...) as a temporary workaround. Other effects may need different processors.',
    ],
  };

  if (diag.kind === 'resource' || isResourceFailure(msg)) {
    return {
      technical: msg,
      headline: "A sample could not be downloaded or decoded.",
      details: [
        'Playback stopped because a required sound is unavailable.',
        'Check your connection and the sample URL. The server may be unavailable or the file invalid.',
        'Strudel caches failed downloads: reload after restoring access, or try a built-in synth such as s("sine").',
      ],
    };
  }

  const notDefined = msg.match(/([A-Za-z_$][\w$]*) is not defined/);
  if (notDefined) {
    const name = notDefined[1];
    const guess = closestName(name, knownNames);
    return {
      ...base,
      headline: `"${name}" isn't a function BEAT.EXE knows.`,
      details: [
        guess ? `Did you mean "${guess}"?` : 'Check the spelling of the function name.',
        'Names are case-sensitive: "Note" and "note" are different.',
      ],
    };
  }

  const notFunction = msg.match(/([\w$.]+) is not a function/);
  if (notFunction) {
    const name = notFunction[1].split('.').pop() ?? notFunction[1];
    const guess = closestName(name, knownNames);
    return {
      ...base,
      headline: `"${name}" can't be used like that ${where}.`,
      details: [
        guess && guess !== name ? `Did you mean "${guess}"?` : 'That function may not exist in Strudel.',
        'Press F1 to open the reference and see what you can chain after a pattern.',
      ],
    };
  }

  if (/sound .* not found|not found! Is it loaded/i.test(msg)) {
    const name = msg.match(/sound\s+"?([^\s"!]+)/)?.[1];
    return {
      ...base,
      headline: name ? `The sound "${name}" isn't loaded.` : "A sound isn't loaded.",
      details: [
        'Playback stopped. Check the sound name and sample source before running again.',
        'Built-in synths: sine, square, triangle, sawtooth. Piano is bundled for offline use.',
        'Other banks need their sample map: open SAMPLES and add a loader above your song.',
        'Drum samples (bd, sd, hh, cp…) download from the internet the first time.',
      ],
    };
  }

  if (/\[mini\]|mini-notation|parse error/i.test(msg) && !/Unexpected token/i.test(msg)) {
    return {
      ...base,
      headline: 'One of your pattern strings has a typo.',
      details: [
        'Look inside the quotes, e.g. s("bd sd hh").',
        'Brackets inside patterns must match: [ ] and < >.',
        'Separate sounds with spaces. Use ~ for a rest.',
      ],
    };
  }

  if (/Unterminated string/i.test(msg)) {
    return {
      ...base,
      headline: `A quote is missing ${where}.`,
      details: ['Every pattern string needs an opening and a closing quote: "bd sd"'],
    };
  }

  if (/Unexpected token|Unexpected character|SyntaxError|Unexpected end/i.test(msg)) {
    return {
      ...base,
      headline: `Something seems wrong ${where}.`,
      details: [
        'Check your brackets ( ) and quotes " ".',
        'Each . must be followed by a function name, like .gain(0.5).',
      ],
    };
  }

  if (/nothing to play/i.test(msg)) {
    return {
      ...base,
      headline: 'There is nothing to play yet.',
      details: ['Write a pattern like:  $: s("bd sd")', 'Or load an example with the EXAMPLES button.'],
    };
  }

  return {
    ...base,
    headline: `Something went wrong ${where}.`,
    details: ['Check your brackets and function names.'],
  };
}

/** Closest candidate by edit distance, or null if nothing is reasonably close. */
export function closestName(name: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  const lower = name.toLowerCase();
  for (const c of candidates) {
    if (c.toLowerCase() === lower) return c;
    const d = levenshtein(lower, c.toLowerCase());
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  const limit = Math.max(1, Math.floor(name.length / 3));
  return bestScore <= limit ? best : null;
}

/** Edit distance where swapping two neighbouring letters ("stpo" → "stop") counts as one edit. */
export function levenshtein(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}
