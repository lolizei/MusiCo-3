import { useRef, useState } from 'react';
import type { KeyValueStore } from '../projects/store';
import { exportLibrary, loadLibrary, MAX_LIBRARY_BYTES, mergeLibrary, parseLibrary, saveLibrary, type LibraryEntry } from './library';

export function PersonalLibrary({ kv, persistent, engineId, getCode, onTryCode, onInsert, onPreview }: {
  kv: KeyValueStore; persistent: boolean; engineId: string; getCode(): string;
  onTryCode(title: string, code: string): void; onInsert(code: string): void;
  onPreview?(title: string, code: string): void;
}) {
  const [loaded] = useState(() => {
    try { return { entries: loadLibrary(kv), error: '' }; }
    catch (error) { return { entries: [] as LibraryEntry[], error: `Your stored library could not be read. It has been preserved: ${error instanceof Error ? error.message : 'storage unavailable'}` }; }
  });
  const [entries, setEntries] = useState(loaded.entries);
  const latest = useRef(entries);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(loaded.error);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const change = (next: LibraryEntry[]): boolean => {
    if (loaded.error) return false;
    try { saveLibrary(kv, next); latest.current = next; setEntries(next); setDeleting(null); return true; }
    catch (error) { setMessage(`Could not save the library. Existing starters are unchanged: ${error instanceof Error ? error.message : 'storage full or blocked'}`); return false; }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_LIBRARY_BYTES) throw new Error('Library file is too large (maximum 2 MB).');
      const imported = parseLibrary(await file.text());
      if (change(mergeLibrary(latest.current, imported))) setMessage('Library imported. Existing starters were kept; nothing has played.');
    } catch (error) { setMessage(`Import failed: ${error instanceof Error ? error.message : 'could not read file'}`); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportLibrary(entries)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'my-music-library.json'; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const visible = entries.filter(entry => entry.engine === engineId && `${entry.title} ${entry.code}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="personal-library">
    <h3 className="step-title">My melodies & snippets</h3>
    <p>Save your own starters for {engineId}. Load opens a project tab; Insert adds code to your current song. {onPreview ? 'Preview plays this starter instead of your song without editing it. RUN plays your editor code again.' : 'Only RUN starts music.'}</p>
    {!persistent && <p role="alert">Storage is blocked. Export your library before closing to keep it.</p>}
    <form onSubmit={event => {
      event.preventDefault();
      try {
        const entry = { id: crypto.randomUUID(), title, engine: engineId, code };
        if (change(mergeLibrary(entries, parseLibrary(exportLibrary([entry]))))) {
          setTitle(''); setCode(''); setMessage('Starter saved to your library.');
        }
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save starter.'); }
    }}>
      <label>Starter name<input maxLength={60} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Starter code<textarea rows={5} value={code} onChange={event => setCode(event.target.value)} spellCheck={false} /></label>
      <div className="library-actions">
        <button type="button" className="tbtn" onClick={() => setCode(getCode())}>[copy from editor]</button>
        <button type="submit" className="tbtn" disabled={!!loaded.error}>[save starter]</button>
      </div>
    </form>
    <div className="library-actions">
      <button className="tbtn" onClick={download} disabled={!!loaded.error}>[export library]</button>
      <button className="tbtn" onClick={() => input.current?.click()} disabled={!!loaded.error}>[import library]</button>
    </div>
    <input ref={input} type="file" accept=".json,application/json" hidden data-testid="library-import" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
    <p role="status" className="hint">{message}</p>
    <label>Find my starters<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <p className="hint">{visible.length} starters for {engineId}. Other engines keep their own starters; exports include all engines.</p>
    {visible.map(entry => <article className="melody-card" key={entry.id}>
      <h4>{entry.title}</h4><pre className="code-preview">{entry.code}</pre>
      <div className="library-actions">
        <button className="tbtn" onClick={() => onTryCode(entry.title, entry.code)} aria-label={`Load ${entry.title}`}>[load]</button>
        {onPreview && <button className="tbtn" onClick={() => onPreview(entry.title, entry.code)} aria-label={`Preview starter ${entry.title}`}>[♫ preview]</button>}
        <button className="tbtn" onClick={() => onInsert(entry.code)} aria-label={`Insert ${entry.title}`}>[insert]</button>
        <button className="tbtn" onClick={() => setDeleting(entry.id)} aria-label={`Delete starter ${entry.title}`}>[delete]</button>
      </div>
      {deleting === entry.id && <div className="library-actions"><p>Delete this starter? Open project code stays intact.</p>
        <button className="tbtn" onClick={() => { if (change(entries.filter(item => item.id !== entry.id))) setMessage('Starter deleted.'); }}>Confirm delete starter</button>
        <button className="tbtn" onClick={() => setDeleting(null)}>Keep starter</button>
      </div>}
    </article>)}
  </section>;
}
