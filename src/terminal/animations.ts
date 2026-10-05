/** Decorative frames only: these do not measure sound or follow the beat. */
export const TERMINAL_ANIMATIONS = [
  { id: 'off', name: 'None', frames: [] },
  { id: 'cat', name: 'Dancing cat', frames: [
    ' /\\_/\\\n( o.o )\n /| |\\\n  U U',
    ' /\\_/\\\n( ^.^ )\n \\| |/\n  U U',
    ' /\\_/\\\n( -.- )\n /| |\\\n  U U',
    ' /\\_/\\\n( ^o^ )\n \\| |/\n  U U',
  ] },
  { id: 'bunny', name: 'Headphone bunny', frames: [
    ' (\\_/)\n [^-^]\n /| |\\\n  d b', ' (\\_/)\n [^o^]\n \\| |/\n  d b',
    ' (\\_/)\n [-.-]\n /| |\\\n  d b', ' (\\_/)\n [^o^]\n \\| |/\n  d b',
  ] },
  { id: 'robot', name: 'Tiny robot', frames: [
    '  .-.\n [o_o]\n /|#|\\\n  |_|', '  .-.\n [^_^]\n \\|#|/\n  |_|',
    '  .-.\n [-_-]\n /|#|\\\n  |_|', '  .-.\n [^o^]\n \\|#|/\n  |_|',
  ] },
  { id: 'stars', name: 'Twinkling stars', frames: [
    ' .   +\n   *\n +   .\n   .', ' +   .\n   .\n .   *\n   +',
    ' .   *\n   +\n *   .\n   .', ' *   .\n   .\n .   +\n   *',
  ] },
] as const;

export type TerminalAnimationId = typeof TERMINAL_ANIMATIONS[number]['id'];
export const ANIMATION_SPEEDS = { slow: 3.2, normal: 1.6, fast: 0.8 } as const;
export type AnimationSpeed = keyof typeof ANIMATION_SPEEDS;
export function isTerminalAnimation(value: unknown): value is TerminalAnimationId {
  return TERMINAL_ANIMATIONS.some(animation => animation.id === value);
}
export function isAnimationSpeed(value: unknown): value is AnimationSpeed {
  return typeof value === 'string' && Object.hasOwn(ANIMATION_SPEEDS, value);
}
