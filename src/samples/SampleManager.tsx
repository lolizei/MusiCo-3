import { useEffect, useRef, useState } from 'react';
import type { KeyValueStore } from '../projects/store';
import { Modal } from '../ui/Modal';
import { exportPacks, inspectPack, loadPacks, MAX_PACK_BYTES, mergePacks, packDemo, packLoader, parsePacks, savePacks, validatePack, type SamplePack } from './packs';

const blank = { name: '', source: '', author: '', license: '' };
const messageOf = (e: unknown) => e instanceof Error ? e.message : 'The source could not be read.';
export function SampleManager({ kv, persistent, onClose, onInsert, onCreate }: {
  kv: KeyValueStore; persistent: boolean; onClose(): void;
  onInsert(code: string): void; onCreate(name: string, code: string): void;
}) {
  const [loaded] = useState(() => {
    try { return { packs: loadPacks(kv), error: '' }; }
    catch (e) { return { packs: [] as SamplePack[], error: `Stored sources have been preserved: ${messageOf(e)}` }; }
  });
  const [packs, setPacks] = useState(loaded.packs);
  const latest = useRef(packs);
  const [draft, setDraft] = useState<SamplePack>(blank);
  const [message, setMessage] = useState(loaded.error);
  const [names, setNames] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); }; }, []);
  const change = (next: SamplePack[]) => {
    if (loaded.error) return false;
    try { savePacks(kv, next); latest.current = next; setPacks(next); setDeleting(null); return true; }
    catch (e) { setMessage(`Could not save sources; previous data is unchanged. ${messageOf(e)}`); return false; }
  };
  const inspect = async (pack: SamplePack) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000); setBusy(pack.source);
    try {
      const sounds = await inspectPack(pack.source, controller.signal);
      if (mounted.current && request.current === controller) { setNames(prev => ({ ...prev, [pack.source]: sounds })); setMessage(`Found ${sounds.length} sounds. Audio downloads when you press RUN.`); }
    } catch (e) {
      if (mounted.current && request.current === controller) setMessage(`Cannot read this list. Check the URL, internet access and CORS permission. ${messageOf(e)}`);
    } finally { window.clearTimeout(timeout); if (mounted.current && request.current === controller) setBusy(null); }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_PACK_BYTES) throw new Error('Sample source file exceeds 1 MB.');
      const incoming = parsePacks(await file.text());
      if (mounted.current && change(mergePacks(latest.current, incoming))) setMessage('Sources imported. No code or sound has been run.');
    } catch (e) { if (mounted.current) setMessage(messageOf(e)); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportPacks(packs)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'beat-sample-sources.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <Modal title="sample sources ♡" onClose={onClose}>
    <p>Add your own Strudel sample maps without an app update. Insert a loader above your song, then RUN. COPY CODE, project export and your starter library include that loader so others can use the same source.</p>
    <article className="melody-card">
      <h3>Included piano · works offline</h3>
      <p>Salamander Grand Piano V3 by Alexander Holm · CC BY 3.0. MP3 samples from dough-samples; audio unchanged, paths adapted for this app.</p>
      <p className="hint sample-source-url">License: https://creativecommons.org/licenses/by/3.0/ · Original: https://archive.org/details/SalamanderGrandPianoV3</p>
      <p className="hint">When sharing music made with this piano, keep the credit and license link. Sample files remain separately licensed from the app.</p>
      <button className="tbtn" onClick={() => onCreate('piano-demo', '// Piano: Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0)\n// https://creativecommons.org/licenses/by/3.0/\n// https://archive.org/details/SalamanderGrandPianoV3\n$: note("c4 e4 g4 b4 g4 e4").s("piano").gain(0.25).room(0.2)\n')}>[new piano demo]</button>
    </article>
    <p className="hint">External sources need internet and browser access (CORS). Use samples you own or have permission to use/share. Entered credits are supplied by you and are not a license verification. A source can override existing sound names.</p>
    {!persistent && <p role="alert">Storage is temporary. Export your sources before closing.</p>}
    <form className="library-form" onSubmit={e => {
      e.preventDefault();
      try {
        const pack = validatePack(draft);
        if (latest.current.some(p => p.source === pack.source)) throw new Error('This source is already saved.');
        if (change(mergePacks(latest.current, [pack]))) { setDraft(blank); setMessage('Source saved. Add its loader to a song before RUN.'); }
      } catch (error) { setMessage(messageOf(error)); }
    }}>
      <label>Name<input aria-label="Sample source name" maxLength={60} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required /></label>
      <label>Sample-map URL<input aria-label="Sample map URL" placeholder="https://…/strudel.json or github:owner/repo" maxLength={2000} value={draft.source} onChange={e => setDraft({ ...draft, source: e.target.value })} required /></label>
      <label>Author / credit<input aria-label="Sample author" maxLength={200} value={draft.author} onChange={e => setDraft({ ...draft, author: e.target.value })} /></label>
      <label>License / permission<input aria-label="Sample license" placeholder="e.g. CC0 or a license URL" maxLength={500} value={draft.license} onChange={e => setDraft({ ...draft, license: e.target.value })} /></label>
      <button className="tbtn" type="submit" disabled={!!loaded.error}>[save source]</button>
    </form>
    <div className="library-actions">
      <button className="tbtn" onClick={download}>[export sources]</button>
      <button className="tbtn" onClick={() => input.current?.click()} disabled={!!loaded.error}>[import sources]</button>
    </div>
    <input type="file" accept=".json,application/json" ref={input} hidden data-testid="sample-import" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
    <p role="status" className="hint">{message}</p>
    {!packs.length && <p className="hint">No custom sources saved yet.</p>}
    {packs.map(pack => <article className="melody-card" key={pack.source}>
      <h3>{pack.name}</h3><p className="sample-source-url">{pack.source}</p>
      <p className="hint">{pack.author || 'Author not supplied'} · {pack.license || 'License not supplied — check the source before sharing'}</p>
      <div className="library-actions">
        <button className="tbtn" onClick={() => onInsert(packLoader(pack))} aria-label={`Insert source ${pack.name}`}>[add loader to current song]</button>
        <button className="tbtn" disabled={busy !== null} onClick={() => void inspect(pack)} aria-label={`Inspect source ${pack.name}`}>[{busy === pack.source ? 'checking…' : 'check sound list'}]</button>
        <button className="tbtn" onClick={() => setDeleting(pack.source)} aria-label={`Delete source ${pack.name}`}>[delete source]</button>
      </div>
      {names[pack.source] && <div className="sample-sounds"><p>Choose a sound to open a demo in a new Strudel tab (showing up to 200 sounds):</p>{names[pack.source].slice(0, 200).map(sound => <button className="tbtn" key={sound} onClick={() => onCreate(`${pack.name} demo`, packDemo(pack, sound))}>{sound}</button>)}</div>}
      {deleting === pack.source && <p>Remove this saved source? Existing song code stays unchanged. <button className="tbtn" onClick={() => { if (change(latest.current.filter(p => p.source !== pack.source))) setMessage('Source removed. Restart the app to clear sounds already registered by RUN.'); }}>[confirm delete]</button> <button className="tbtn" onClick={() => setDeleting(null)}>[cancel]</button></p>}
    </article>)}
  </Modal>;
}
