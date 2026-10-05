import { useEffect, useRef, useState } from 'react';
import { MASCOT } from './ascii';

/** A welcome, never a pretend loading screen. Input always reaches the app. */
export function StartupGreeting({ enabled, animations }: { enabled: boolean; animations: boolean }) {
  const box = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(() => enabled && animations && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => setVisible(false);
    const outsidePointer = (event: PointerEvent) => {
      // Keep the Skip button mounted until its click has actually completed.
      if (!(event.target instanceof Node) || !box.current?.contains(event.target)) dismiss();
    };
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { if (motion.matches) dismiss(); };
    const timeout = window.setTimeout(dismiss, 2400);
    window.addEventListener('keydown', dismiss, true);
    window.addEventListener('pointerdown', outsidePointer, true);
    motion.addEventListener('change', motionChanged);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('keydown', dismiss, true);
      window.removeEventListener('pointerdown', outsidePointer, true);
      motion.removeEventListener('change', motionChanged);
    };
  }, [visible]);
  if (!visible || !enabled || !animations) return null;
  return <section ref={box} className="startup-greeting" aria-label="Welcome" data-testid="startup-greeting">
    <pre className="startup-cat" aria-hidden="true">{MASCOT}</pre>
    <div><p>hello, music maker ♡</p><small>Your next little song starts here.</small></div>
    <button className="tbtn" onClick={() => setVisible(false)}>Skip welcome</button>
  </section>;
}
