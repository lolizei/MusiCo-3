export const SONIC_PI_TEMPLATE = `# Sonic Pi 5.0.0 — install separately, then RUN to connect.\n# Ruby runs in a native runtime: only run code you trust.\nuse_bpm 100\n\nlive_loop :melody do\n  use_synth :beep\n  play :c4, release: 0.2, amp: 0.25\n  sleep 0.5\nend\n`;

export const SONIC_PI_SNIPPETS = [
  { title: 'Quiet melody', code: 'use_bpm 90\nlive_loop :melody do\n  use_synth :beep\n  play (ring :c4, :e4, :g4, :c5).tick, release: 0.2, amp: 0.25\n  sleep 0.5\nend' },
  { title: 'Kick and snare', code: 'use_bpm 100\nlive_loop :drums do\n  sample :bd_haus, amp: 0.3\n  sleep 1\n  sample :sn_dub, amp: 0.25\n  sleep 1\nend' },
  { title: 'Soft bass', code: 'use_bpm 100\nlive_loop :bass do\n  use_synth :sine\n  play (ring :c2, :c2, :eb2, :g2).tick, release: 0.3, amp: 0.3\n  sleep 0.5\nend' },
  { title: 'Gentle chord', code: 'use_bpm 80\nlive_loop :pad do\n  use_synth :beep\n  play chord(:c4, :major), release: 1, amp: 0.15\n  sleep 4\nend' },
] as const;
