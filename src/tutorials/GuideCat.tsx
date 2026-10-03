const FRAMES = [
  String.raw` /\_/\
( ^.^ ) ♪
 > ♡ <`,
  String.raw` /\_/\
( -.- ) ♫
 > ♡ <`,
  String.raw` /\_/\
( ^.^ ) ♫
 > ♡ <`,
  String.raw` /\_/\
( ^.- ) ♪
 > ♡ <`,
];

/** CSS-only decoration; no timers or connection to the audio scheduler. */
export function GuideCat() {
  return <div className="guide-cat" aria-hidden="true" data-testid="guide-cat">
    {FRAMES.map((frame, index) => <pre key={index} className={`mascot cat-frame cat-frame-${index}`}>{frame}</pre>)}
  </div>;
}
