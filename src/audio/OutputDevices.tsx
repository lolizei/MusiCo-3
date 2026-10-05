import { useEffect, useRef, useState } from 'react';

type SelectableContext = AudioContext & { setSinkId?: (id: string) => Promise<void>; sinkId?: string };
type OutputMedia = MediaDevices & { selectAudioOutput?: () => Promise<MediaDeviceInfo> };

/** Switch the existing context's destination; never create a second player. */
export function OutputDevices({ context }: { context: AudioContext | null }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const audio = context as SelectableContext | null;
  const media = navigator.mediaDevices as OutputMedia | undefined;
  const refresh = async () => {
    if (!media?.enumerateDevices) return;
    try { setDevices((await media.enumerateDevices()).filter(device => device.kind === 'audiooutput' && device.deviceId && device.deviceId !== 'default')); }
    catch { setMessage('Output device list is unavailable. System default still works.'); }
  };
  useEffect(() => {
    generation.current++;
    setSelected(typeof audio?.sinkId === 'string' ? audio.sinkId : '');
    setBusy(false);
    void refresh();
    const changed = () => { void refresh(); };
    media?.addEventListener('devicechange', changed);
    return () => { generation.current++; media?.removeEventListener('devicechange', changed); };
  }, [context]);
  const switchTo = async (id: string) => {
    if (!audio?.setSinkId || busy) return;
    const current = generation.current;
    setBusy(true); setMessage('');
    try {
      await audio.setSinkId(id);
      if (current === generation.current) setSelected(id);
    } catch {
      if (current === generation.current) setMessage('Could not select that output. It may be disconnected or permission was denied. Your previous output is unchanged.');
    } finally { if (current === generation.current) setBusy(false); }
  };
  const choose = async () => {
    if (!media?.selectAudioOutput || busy) return;
    try { const device = await media.selectAudioOutput(); await refresh(); await switchTo(device.deviceId); }
    catch { setMessage('Output selection was cancelled or unavailable.'); }
  };
  return <div className="output-device-controls">
    <label>Audio output <select aria-label="Audio output device" value={selected} disabled={!audio?.setSinkId || busy} onChange={event => void switchTo(event.target.value)}>
      <option value="">System default</option>
      {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Output ${index + 1}`}</option>)}
      {selected && !devices.some(device => device.deviceId === selected) && <option value={selected}>Selected output (not in current list)</option>}
    </select></label>
    <button className="tbtn" disabled={!audio?.setSinkId || busy} onClick={() => void refresh()}>Refresh outputs</button>
    {media?.selectAudioOutput && <button className="tbtn" disabled={!audio?.setSinkId || busy} onClick={() => void choose()}>Choose output…</button>}
    {!context ? <span className="hint">Run music to connect output selection.</span> : !audio?.setSinkId ? <span className="hint">Output selection is unsupported here; use your system audio settings.</span> : <span className="hint">Selection lasts for this session. No microphone access is needed.</span>}
    {message && <p role="status">{message}</p>}
  </div>;
}
