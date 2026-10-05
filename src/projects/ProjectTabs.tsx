import { useRef } from 'react';
import { tabDirty, type ProjectTab } from './tabs';

interface Props {
  tabs: ProjectTab[];
  activeId: string;
  onSelect(id: string): void;
  onClose(id: string): void;
  onNew(): void;
}
export function ProjectTabs({ tabs, activeId, onSelect, onClose, onNew }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  return <div className="project-tabs" ref={bar}>
    <div role="tablist" aria-label="Open music projects" className="project-tablist" onKeyDown={e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const index = tabs.findIndex(t => t.project.id === activeId);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 :
        (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      onSelect(tabs[next].project.id);
      bar.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>
      {tabs.map(tab => <div className="project-tab" key={tab.project.id} data-active={tab.project.id === activeId}>
        <button className="tbtn" role="tab" id={'tab-' + tab.project.id} aria-controls="music-editor-panel"
          aria-selected={tab.project.id === activeId} tabIndex={tab.project.id === activeId ? 0 : -1}
          onClick={() => onSelect(tab.project.id)} title={tab.project.name + ' · ' + tab.project.engine + (tabDirty(tab) ? ' · unsaved changes' : '')}>
          {tab.project.name}{tabDirty(tab) ? ' ●' : !tab.persisted ? ' ◇' : ''}
        </button>
        <button className="tbtn tab-close" onClick={() => onClose(tab.project.id)} aria-label={'Close ' + tab.project.name}>×</button>
      </div>)}
    </div>
    <button className="tbtn" onClick={onNew} aria-label="New project tab">+</button>
  </div>;
}
