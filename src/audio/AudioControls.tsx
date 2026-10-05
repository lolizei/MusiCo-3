import { useEffect, useRef, useState } from 'react';
import type { EngineAudioOutput, EngineState } from '../engines/types';
import { OutputRecorder } from './Recorder';
import { peakLevel, volumeGain } from './wav';
import { exportFlac } from './flac';
import { OutputDevices } from './OutputDevices';

export function AudioControls({ getOutput, state, supported, volume, muted, onVolume, onMute, name }: {
  getOutput(): EngineAudioOutput | null; state: EngineState; supported: boolean;
  volume: number; muted: boolean; onVolume(value: number): void; onMute(): void; name: string;
}) {
  const [output, setOutput] = useState<EngineAudioOutput | null>(null);
  const [peaks, setPeaks] = useState([0, 0]);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [wav, setWav] = useState<Blob | null>(null);
  const [recordedName, setRecordedName] = useState(name);
  const [error, setError] = useState('');
  const [replace, setReplace] = useState(false);
  const [encoding, setEncoding] = useState(false);
  const [exportInfo, setExportInfo] = useState('');
  const recorder = useRef<OutputRecorder | null>(null);
  const finish = async (instance = recorder.current) => {
    if (!instance) return;
    try { await instance.stop(); if (instance.hasRecording) setWav(instance.wav()); }
    catch (error) { setError(`Recording could not finish: ${error instanceof Error ? error.message : 'audio unavailable'}`); }
  };
  useEffect(() => {
    const next = getOutput();
    setOutput(previous => previous?.node === next?.node ? previous : next);
  }, [getOutput, state]);
  useEffect(() => {
    if (!output) return;
    const instance = new OutputRecorder(output, (duration, active, warning) => {
      setSeconds(duration); setRecording(active);
      if (warning) setError(warning);
      if (!active && instance.hasRecording) setWav(instance.wav());
    });
    recorder.current = instance;
    return () => {
      recorder.current = null;
      void instance.stop().then(() => {
        if (instance.hasRecording) setWav(instance.wav());
        instance.dispose();
      });
    };
  }, [output]);
  useEffect(() => {
    if (!output) return;
    output.node.gain.cancelScheduledValues(output.context.currentTime);
    output.node.gain.setTargetAtTime(volumeGain(volume, muted), output.context.currentTime, 0.01);
  }, [output, volume, muted]);
  useEffect(() => {
    if (state !== 'playing') void finish();
  }, [state]);
  useEffect(() => {
    if (!output || state !== 'playing') { setPeaks([0, 0]); return; }
    const splitter = output.context.createChannelSplitter(2);
    const analysers = [output.context.createAnalyser(), output.context.createAnalyser()];
    const buffers = analysers.map(analyser => { analyser.fftSize = 2048; return new Float32Array(analyser.fftSize); });
    output.node.connect(splitter);
    analysers.forEach((analyser, channel) => splitter.connect(analyser, channel));
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setPeaks(analysers.map((analyser, index) => { analyser.getFloatTimeDomainData(buffers[index]); return peakLevel(buffers[index]); }));
    }, 100);
    return () => { clearInterval(timer); try { output.node.disconnect(splitter); } catch { /* output reset */ } splitter.disconnect(); analysers.forEach(analyser => analyser.disconnect()); };
  }, [output, state]);
  useEffect(() => {
    if (!recording && !wav) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [recording, wav]);
  const start = async () => {
    const instance = recorder.current;
    if (!instance || starting) return;
    setReplace(false); setStarting(true); setError('');
    try { await instance.start(); if (instance.recording) { setWav(null); setRecordedName(name); } }
    catch (error) { setError(`Recording unavailable: ${error instanceof Error ? error.message : 'audio worklet failed'}`); }
    finally { setStarting(false); }
  };
  const download = (file: Blob, extension: string, fileName = recordedName) => {
    const url = URL.createObjectURL(file), link = document.createElement('a');
    link.href = url; link.download = `${fileName.replace(/[^\w -]/g, '_') || 'my-song'}.${extension}`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const saveFlac = async () => {
    if (!wav || encoding) return;
    const take = wav, takeName = recordedName;
    setEncoding(true); setError(''); setExportInfo('');
    try {
      const file = await exportFlac(take);
      download(file, 'flac', takeName);
      const savings = Math.round((1 - file.size / take.size) * 100);
      setExportInfo(savings >= 0 ? `FLAC: ${savings}% smaller than WAV; identical recorded PCM samples.` : 'FLAC preserves the recorded PCM samples; this take is larger than WAV.');
    } catch (error) { setError(error instanceof Error ? error.message : 'FLAC export failed. Your WAV is still available.'); }
    finally { setEncoding(false); }
  };
  return <div className="audio-controls" aria-label="Audio output controls">
    <label className="master-volume">Volume <input type="range" min={0} max={100} value={volume} disabled={!supported} aria-label="Master volume"
      onChange={event => onVolume(Number(event.target.value))} /> <output>{volume}%</output></label>
    <button className="tbtn" disabled={!supported} aria-pressed={muted} onClick={onMute} data-testid="audio-mute">[{muted ? 'unmute' : 'mute'}]</button>
    {output && <div className="output-meters" data-testid="output-meter" aria-label="Measured stereo output">
      {peaks.map((peak, index) => <meter key={index} min={0} max={1} high={0.9} optimum={0.4} value={Math.min(1, peak)} aria-label={index === 0 ? 'Left output level' : 'Right output level'} />)}
      <span className={peaks.some(peak => peak >= 1) ? 'audio-clipping' : ''}>{peaks.some(peak => peak >= 1) ? 'CLIP — lower layer gains' : 'output'}</span>
    </div>}
    <button className="tbtn" disabled={!output || starting || (!recording && state !== 'playing')} onClick={() => recording ? void finish() : wav ? setReplace(true) : void start()} data-testid="audio-record">
      [{starting ? 'preparing…' : recording ? 'finish recording' : 'record WAV'}]
    </button>
    <button className="tbtn" disabled={!wav || recording || starting} onClick={() => { if (wav) download(wav, 'wav'); }} data-testid="audio-export">[export WAV]</button>
    <button className="tbtn" disabled={!wav || recording || starting || encoding} onClick={() => void saveFlac()} data-testid="audio-export-flac">[{encoding ? 'encoding FLAC…' : 'export FLAC'}]</button>
    {exportInfo && <span role="status">{exportInfo}</span>}
    <OutputDevices context={output?.context ?? null} />
    {(recording || wav) && <span data-testid="recording-duration">{recording ? 'REC ' : 'recorded '}{seconds.toFixed(1)}s / 300s</span>}
    {!supported && <span className="hint">This engine does not expose browser audio for volume/meter/recording.</span>}
    {supported && !output && <span className="hint">Audio controls connect when Strudel is ready.</span>}
    {replace && <div className="library-actions"><span>Export first if you want to keep this recording.</span><button className="tbtn" onClick={() => void start()}>Start new recording</button><button className="tbtn" onClick={() => setReplace(false)}>Keep recording</button></div>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
