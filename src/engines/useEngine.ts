import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEngineDescriptor, getEngineInstance } from './registry';
import type { EngineDiagnostic, EngineState, LogLevel, RunResult } from './types';

export interface EngineSink {
  log(level: LogLevel, message: string): void;
  runtimeError(diagnostic: EngineDiagnostic): void;
}

/**
 * Connects React to the engine singleton for `engineId`. The engine itself is
 * never recreated by re-renders; switching engines stops the previous one.
 */
export function useEngine(engineId: string, sink: EngineSink) {
  const descriptor = getEngineDescriptor(engineId);
  const engine = useMemo(() => (descriptor ? getEngineInstance(descriptor) : null), [descriptor]);
  const [state, setState] = useState<EngineState>(engine?.getState() ?? 'offline');
  const sinkRef = useRef(sink);
  sinkRef.current = sink;

  useEffect(() => {
    if (!engine) {
      setState('offline');
      return;
    }
    engine.setListener({
      state: setState,
      log: (level, message) => sinkRef.current.log(level, message),
      runtimeError: (d) => sinkRef.current.runtimeError(d),
    });
    // Loads Strudel and the sample list in the background. Sound only
    // starts after the user presses RUN (browser autoplay rules).
    engine.init().catch(() => {
      /* reported through the listener */
    });
    return () => {
      engine.setListener(null);
    };
  }, [engine]);

  // Stop the old engine when the user switches to a different one.
  const prev = useRef(engine);
  useEffect(() => {
    if (prev.current && prev.current !== engine) prev.current.stop();
    prev.current = engine;
  }, [engine]);

  const run = useCallback(
    async (code: string): Promise<RunResult> => {
      if (!engine) {
        return {
          ok: false,
          error: { message: descriptor?.unavailableReason ?? `engine "${engineId}" is not available` },
        };
      }
      return engine.run(code);
    },
    [engine, descriptor, engineId],
  );

  const stop = useCallback(() => engine?.stop(), [engine]);
  const isPlaying = useCallback(() => engine?.isPlaying() ?? false, [engine]);
  const getAudioOutput = useCallback(() => {
    try { return engine?.getAudioOutput?.() ?? null; } catch { return null; }
  }, [engine]);
  const getPianoSnapshot = useCallback(() => engine?.getPianoSnapshot?.() ?? null, [engine]);
  const getLivePianoFrame = useCallback(() => engine?.getLivePianoFrame?.() ?? null, [engine]);

  return { descriptor, state, run, stop, isPlaying, getAudioOutput, getPianoSnapshot, getLivePianoFrame, available: !!engine };
}
