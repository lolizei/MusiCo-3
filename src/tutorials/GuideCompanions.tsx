import { GuideCat } from './GuideCat';

const FRAMES = [String.raw`      .
   (\_/)
  [^-^ ]
  /|   |\
   d   b`, String.raw`   .
   (\_/)
  [^o^ ]
  \|   |/
   d   b`, String.raw`      .
   (\_/)
  [ -^ ]
  /|   |\
   d   b`, String.raw`        .
   (\_/)
  [^o^ ]
  \|   |/
   d   b`];

/** Decorative playback companion, deliberately unrelated to audio levels/tempo. */
export function GuideCompanions({ playing }: { playing: boolean }) {
  return <div className="guide-companions">
    <GuideCat />
    {playing && <div className="playback-buddy" aria-hidden="true" data-testid="playback-buddy"
      title="A little headphone bunny enjoying your song — decorative animation">
      {FRAMES.map((frame, index) => <pre key={index} className={`buddy-frame buddy-frame-${index}`}>{frame}</pre>)}
    </div>}
  </div>;
}
