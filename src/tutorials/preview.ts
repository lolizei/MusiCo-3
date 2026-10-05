/** Chain snippets need an audible demo; full layers retain their own code. */
export function snippetPreviewCode(code: string): string {
  const trimmed = code.trim();
  const phrase = 'note("c4 e4 g4 e4").s("triangle").gain(0.15)';
  if (trimmed.startsWith('.')) return `setcpm(120/4)\n$: ${phrase}${trimmed}`;
  if (/^setcp[ms]\s*\(/.test(trimmed) && !trimmed.includes('\n')) return `${trimmed}\n$: ${phrase}`;
  return `setcpm(120/4)\n${trimmed}`;
}
