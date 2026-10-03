import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export interface PickerItem {
  id: string;
  label: string;
  detail?: string;
}

export type DialogSpec =
  | {
      type: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel?: string;
      danger?: boolean;
      onConfirm(): void;
      onCancel?(): void;
    }
  | {
      type: 'prompt';
      title: string;
      message: string;
      initial: string;
      confirmLabel: string;
      /** Return an error message to keep the dialog open. */
      onSubmit(value: string): string | null;
    }
  | {
      type: 'picker';
      title: string;
      empty: string;
      items: PickerItem[];
      onSelect(id: string): void;
      deleteLabel?: string;
      onDelete?(id: string): void;
    };

interface Props {
  spec: DialogSpec;
  onClose(): void;
}

export function Dialog({ spec, onClose }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<Element | null>(null);

  useEffect(() => {
    restoreFocus.current = document.activeElement;
    const first = boxRef.current?.querySelector<HTMLElement>('[data-autofocus], input, button');
    first?.focus();
    return () => (restoreFocus.current as HTMLElement | null)?.focus?.();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (spec.type === 'confirm') spec.onCancel?.();
      onClose();
    }
    // keep Tab inside the dialog
    if (e.key === 'Tab' && boxRef.current) {
      const focusable = [...boxRef.current.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="frame dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        ref={boxRef}
        onKeyDown={onKeyDown}
        data-testid="dialog"
      >
        <h2 className="frame-title" id="dialog-title">
          {spec.title}
        </h2>
        {spec.type === 'confirm' && <ConfirmBody spec={spec} onClose={onClose} />}
        {spec.type === 'prompt' && <PromptBody spec={spec} onClose={onClose} />}
        {spec.type === 'picker' && <PickerBody spec={spec} onClose={onClose} />}
      </div>
    </div>
  );
}

function ConfirmBody({ spec, onClose }: { spec: Extract<DialogSpec, { type: 'confirm' }>; onClose(): void }) {
  return (
    <>
      <p className="dialog-message">{spec.message}</p>
      <div className="dialog-actions">
        <button
          className="tbtn"
          data-autofocus
          onClick={() => {
            spec.onCancel?.();
            onClose();
          }}
        >
          [ {spec.cancelLabel ?? 'cancel'} ]
        </button>
        <button
          className={`tbtn ${spec.danger ? 'tbtn-danger' : 'tbtn-primary'}`}
          onClick={() => {
            onClose();
            spec.onConfirm();
          }}
          data-testid="dialog-confirm"
        >
          [ {spec.confirmLabel} ]
        </button>
      </div>
    </>
  );
}

function PromptBody({ spec, onClose }: { spec: Extract<DialogSpec, { type: 'prompt' }>; onClose(): void }) {
  const [value, setValue] = useState(spec.initial);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const err = spec.onSubmit(value);
    if (err) setError(err);
    else onClose();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="dialog-message" htmlFor="dialog-input">
        {spec.message}
      </label>
      <input
        id="dialog-input"
        className="dialog-input"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onFocus={(e) => e.target.select()}
        spellCheck={false}
        autoComplete="off"
        data-testid="dialog-input"
        aria-invalid={!!error}
        aria-describedby={error ? 'dialog-error' : undefined}
      />
      {error && (
        <p className="dialog-error" id="dialog-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="tbtn" onClick={onClose}>
          [ cancel ]
        </button>
        <button type="submit" className="tbtn tbtn-primary" data-testid="dialog-confirm">
          [ {spec.confirmLabel} ]
        </button>
      </div>
    </form>
  );
}

function PickerBody({ spec, onClose }: { spec: Extract<DialogSpec, { type: 'picker' }>; onClose(): void }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!spec.items.length) {
    return (
      <>
        <p className="dialog-message">{spec.empty}</p>
        <div className="dialog-actions">
          <button className="tbtn" onClick={onClose}>
            [ close ]
          </button>
        </div>
      </>
    );
  }

  const choose = (id: string) => {
    onClose();
    spec.onSelect(id);
  };

  return (
    <>
      <ul
        className="picker"
        role="listbox"
        tabIndex={0}
        data-autofocus
        aria-activedescendant={`pick-${active}`}
        ref={listRef}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(spec.items.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(spec.items[active].id);
          } else if (e.key === 'Delete' && spec.onDelete) {
            e.preventDefault();
            const id = spec.items[active].id;
            onClose();
            spec.onDelete(id);
          }
        }}
      >
        {spec.items.map((item, i) => (
          <li
            key={item.id}
            id={`pick-${i}`}
            role="option"
            aria-selected={i === active}
            className="picker-item"
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(item.id)}
          >
            <span className="picker-label">
              {i === active ? '▸ ' : '  '}
              {item.label}
            </span>
            {item.detail && <span className="picker-detail">{item.detail}</span>}
          </li>
        ))}
      </ul>
      <p className="dialog-hint">↑↓ move · enter open{spec.onDelete ? ' · del delete' : ''} · esc close</p>
      <div className="dialog-actions">
        {spec.onDelete && (
          <button
            className="tbtn tbtn-danger"
            onClick={() => {
              const id = spec.items[active].id;
              onClose();
              spec.onDelete!(id);
            }}
          >
            [ {spec.deleteLabel ?? 'delete'} ]
          </button>
        )}
        <button className="tbtn" onClick={onClose}>
          [ close ]
        </button>
      </div>
    </>
  );
}
