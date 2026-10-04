import type { ReactNode } from 'react';
import { useWorld } from '../../context';
import type { PanelPage } from '../../types';
import { CategoryGlyph } from '../CategoryGlyph';
import { Prose } from '../Prose';

/** Opens another page from inside the panel. */
export type OpenPage = (page: PanelPage) => void;

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="sec">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((text) => (
        <li key={text}>
          <Prose text={text} />
        </li>
      ))}
    </ul>
  );
}

/** A row that opens a timeline event. `prefix` is shown before the title, e.g. a step number. Renders nothing for an event the reader has not reached. */
export function EventLink({ id, onOpen, prefix, note }: { id: string; onOpen: OpenPage; prefix?: ReactNode; note?: string }) {
  const event = useWorld().eventById.get(id);
  if (!event) return null;
  return (
    <button type="button" className={`link cat-${event.category}`} data-go={id} onClick={() => onOpen({ kind: 'event', id })}>
      {prefix}
      <CategoryGlyph category={event.category} />
      <span className="lbody">
        <span className="lt">{event.title}</span>
        {note && <span className="ln">{note}</span>}
      </span>
      <span className="ld">{event.when.replace(/^c\. /, '')}</span>
    </button>
  );
}

/** A list of event rows. */
export function EventLinks({ ids, onOpen, numbered = false }: { ids: readonly string[]; onOpen: OpenPage; numbered?: boolean }) {
  return (
    <div className="links">
      {ids.map((id, i) => (
        <EventLink key={id} id={id} onOpen={onOpen} prefix={numbered ? <span className="num">{i + 1}</span> : undefined} />
      ))}
    </div>
  );
}

/** A toggle that narrows the timeline to the page's subject. */
export function FilterToggle({ active, label, onToggle }: { active: boolean; label: string; onToggle(): void }) {
  return (
    <button type="button" className="toggle" aria-pressed={active} onClick={onToggle}>
      {active ? 'Showing only these events. Show all' : label}
    </button>
  );
}
