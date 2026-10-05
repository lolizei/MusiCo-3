import { ANIMATION_SPEEDS, TERMINAL_ANIMATIONS, type AnimationSpeed, type TerminalAnimationId } from './animations';

export function TerminalAnimation({ selection, speed, preview = false }: {
  selection: TerminalAnimationId; speed: AnimationSpeed; preview?: boolean;
}) {
  const animation = TERMINAL_ANIMATIONS.find(item => item.id === selection);
  if (!animation?.frames.length) return null;
  const duration = ANIMATION_SPEEDS[speed];
  return <div className={`terminal-art${preview ? ' terminal-art-preview' : ''}`} aria-hidden="true"
    data-testid={preview ? 'terminal-animation-preview' : 'terminal-animation'} data-animation={selection}
    title={`${animation.name} — decorative animation`}>
    {animation.frames.map((frame, index) => <pre key={index} className={`terminal-art-frame terminal-art-frame-${index}`}
      style={{ animationDuration: `${duration}s`, animationDelay: `${-duration * ((4 - index) % 4) / 4}s` }}>{frame}</pre>)}
  </div>;
}
