import { useEffect, useRef, useState } from 'react';
import type { RunResult } from '../engines/types';

/** Previews share the song engine. STOP invalidates in-flight/queued RUNs. */
export function useSnippetPreview(identity: string, engine: { run(code: string): Promise<RunResult>; stop(): void }, onResult: (title: string, result: RunResult) => void) {
  const [title, setTitle] = useState<string | null>(null);
  const request = useRef(0);
  const active = useRef(false);
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const cancel = () => {
    request.current++;
    if (active.current) engine.stop();
    active.current = false;
    setTitle(null);
  };
  useEffect(() => { request.current++; active.current = false; setTitle(null); }, [identity]);
  const preview = async (name: string, code: string) => {
    const token = ++request.current, origin = identity;
    engine.stop();
    active.current = true;
    setTitle(name);
    let result: RunResult;
    try { result = await engine.run(code); }
    catch (error) { result = { ok: false, error: { message: error instanceof Error ? error.message : 'Preview failed' } }; }
    if (token !== request.current || origin !== currentIdentity.current) return;
    if (!result.ok) { active.current = false; setTitle(null); }
    onResult(name, result);
  };
  return { title, preview, cancel };
}
