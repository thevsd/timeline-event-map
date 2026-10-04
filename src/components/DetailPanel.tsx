import { useEffect, useRef } from 'react';
import { useWorld } from '../context';
import { corporateOf, hasCorporateMap } from '../lib/corporate';
import type { ThreadDoc } from '../model/schema';
import { pageKey, type FormTarget, type PanelPage } from '../types';
import { EventForm } from './editor/EventForm';
import { LaneItemForm } from './editor/LaneItemForm';
import { PersonForm } from './editor/PersonForm';
import { SettingsForm } from './editor/SettingsForm';
import { TermForm } from './editor/TermForm';
import { ThreadForm } from './editor/ThreadForm';
import type { FormProps } from './editor/form';
import { CompanyPage } from './panel/CompanyPage';
import { EventPage } from './panel/EventPage';
import { LanePage } from './panel/LanePage';
import { PersonPage } from './panel/PersonPage';
import { TermPage } from './panel/TermPage';
import { ThreadPage } from './panel/ThreadPage';
import type { OpenPage } from './panel/parts';

interface DetailPanelProps {
  /** Page to show; null closes the panel. */
  page: PanelPage | null;
  /** There is an earlier page to return to. */
  canGoBack: boolean;
  /** For an event page: its 1-based position among the visible events, or 0 if filtered out. */
  position: number;
  total: number;
  /** Active filters, so the person and thread pages can show their toggle state. */
  person: string | null;
  thread: string | null;
  /** Corporate-map step, for the company page. */
  mapStep: number;
  /** Whether the timeline is being edited: pages then offer an Edit button. */
  editing: boolean;
  onBack(): void;
  onClose(): void;
  /** Move to the previous (-1) or next (+1) visible event. */
  onStep(direction: -1 | 1): void;
  /** Open another page on top of this one. */
  onOpen: OpenPage;
  onFilterPerson(name: string | null): void;
  onFilterThread(id: string | null): void;
  /** What the editing forms need from the shell. */
  form: FormProps;
  /** Pick a thread's events by clicking cards. */
  onPickThread(thread: ThreadDoc): void;
}

const PAGE_LABEL: Record<PanelPage['kind'], string> = {
  event: 'Event',
  person: 'Person',
  thread: 'Thread',
  lane: 'Lane',
  company: 'Corporate map',
  term: 'Glossary',
  form: 'Editing',
};

/** The form that edits what a page shows; null for pages that are not editable. */
function formFor(page: PanelPage): FormTarget | null {
  switch (page.kind) {
    case 'event': return { type: 'event', id: page.id };
    case 'person': return { type: 'person', name: page.name };
    case 'thread': return { type: 'thread', id: page.id };
    case 'lane': return { type: 'laneItem', id: page.id };
    case 'term': return { type: 'term', id: page.id };
    default: return null;
  }
}

/**
 * Side panel that slides in from the right. It shows one page at a time (an event, a person,
 * a thread, a lane entry, a glossary term, or a form that edits one of these); pages link to
 * each other and the header steps back.
 */
export function DetailPanel(props: DetailPanelProps) {
  const { page, canGoBack, position, total, editing, onBack, onClose, onStep, onOpen } = props;
  const world = useWorld();
  const open = page !== null;
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the last page rendered while the panel slides shut.
  const last = useRef(page);
  if (page) last.current = page;
  const shown = page ?? last.current;
  const key = shown ? pageKey(shown) : '';

  // A new page starts at the top.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [key]);

  const isEvent = shown?.kind === 'event';
  const editTarget = shown && editing ? formFor(shown) : null;
  const label = shown?.kind === 'lane' ? (world.lane?.title ?? PAGE_LABEL.lane) : shown ? PAGE_LABEL[shown.kind] : '';
  return (
    <aside id="panel" className={`panel${open ? ' open' : ''}`} aria-label="Detail" aria-hidden={!open} inert={!open}>
      <div className="panel-in">
        <div className="phead">
          {canGoBack && (
            <button className="iconbtn" type="button" id="pback" aria-label="Back" title="Back" onClick={onBack}>
              ←
            </button>
          )}
          <span className="pos">
            {label}
            {isEvent && position > 0 ? ` · ${position} of ${total}` : ''}
          </span>
          {editTarget && (
            <button className="textbtn" type="button" id="pedit" title="Edit this" onClick={() => onOpen({ kind: 'form', form: editTarget })}>
              Edit
            </button>
          )}
          {isEvent && (
            <>
              <button className="iconbtn" type="button" aria-label="Previous event" title="Previous event" onClick={() => onStep(-1)}>
                ‹
              </button>
              <button className="iconbtn" type="button" aria-label="Next event" title="Next event" onClick={() => onStep(1)}>
                ›
              </button>
            </>
          )}
          <button className="iconbtn" type="button" aria-label="Close detail" title="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pscroll" ref={scroller} data-page={key}>
          {shown && <Page key={key} {...props} shown={shown} />}
        </div>
      </div>
    </aside>
  );
}

/** The page body for whichever kind is showing. Ids that are unknown, or beyond the reader's progress, render nothing. */
function Page({ shown, person, thread, mapStep, onOpen, onFilterPerson, onFilterThread, form, onPickThread }: DetailPanelProps & { shown: PanelPage }) {
  const world = useWorld();
  switch (shown.kind) {
    case 'event': {
      const event = world.eventById.get(shown.id);
      return event ? <EventPage event={event} onOpen={onOpen} /> : null;
    }
    case 'person':
      return <PersonPage name={shown.name} filtered={person === shown.name} onFilter={onFilterPerson} onOpen={onOpen} />;
    case 'thread': {
      const found = world.threadById.get(shown.id);
      return found ? <ThreadPage thread={found} filtered={thread === found.id} onFilter={onFilterThread} onOpen={onOpen} /> : null;
    }
    case 'lane': {
      const item = world.laneById.get(shown.id);
      return item ? <LanePage item={item} onOpen={onOpen} /> : null;
    }
    case 'company': {
      const node = hasCorporateMap(world.doc) ? corporateOf(world).nodeById.get(shown.id) : undefined;
      return node ? <CompanyPage node={node} step={mapStep} onOpen={onOpen} /> : null;
    }
    case 'term': {
      const term = world.termById.get(shown.id);
      return term ? <TermPage term={term} onOpen={onOpen} /> : null;
    }
    case 'form': {
      const target = shown.form;
      switch (target.type) {
        case 'event': return <EventForm id={target.id} {...form} />;
        case 'person': return <PersonForm name={target.name} {...form} />;
        case 'term': return <TermForm id={target.id} {...form} />;
        case 'thread': return <ThreadForm id={target.id} {...form} onPickOnTimeline={onPickThread} />;
        case 'laneItem': return <LaneItemForm id={target.id} {...form} />;
        case 'settings': return <SettingsForm {...form} />;
      }
    }
  }
}
