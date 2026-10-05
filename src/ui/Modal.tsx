import { useEffect, useRef, type ReactNode } from 'react';

/** Shared focus containment for settings and other custom panels. */
export function Modal({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="frame dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={box}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRef.current(); }
        if (e.key !== 'Tab') return;
        const items = [...(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? [])];
        const target = e.shiftKey ? items.at(-1) : items[0];
        if (document.activeElement === (e.shiftKey ? items[0] : items.at(-1))) { e.preventDefault(); target?.focus(); }
      }}>
      <h2 className="frame-title" id="settings-title">{title}</h2>
      {children}
      <div className="dialog-actions"><button className="tbtn" onClick={onClose}>[ Done ]</button></div>
    </div>
  </div>;
}
