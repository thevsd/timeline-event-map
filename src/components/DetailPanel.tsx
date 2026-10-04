import { useEffect, useRef } from 'react';
import { CORP_NODE_BY_ID, EVENT_BY_ID, REAL_BY_ID, THREAD_BY_ID } from '../data';
import type { PanelPage } from '../types';
import { CompanyPage } from './panel/CompanyPage';
import { EventPage } from './panel/EventPage';
import { PersonPage } from './panel/PersonPage';
import { RealPage } from './panel/RealPage';
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
  onBack(): void;
  onClose(): void;
  /** Move to the previous (-1) or next (+1) visible event. */
  onStep(direction: -1 | 1): void;
  /** Open another page on top of this one. */
  onOpen: OpenPage;
  onFilterPerson(name: string | null): void;
  onFilterThread(id: string | null): void;
}

const PAGE_LABEL: Record<PanelPage['kind'], string> = {
  event: 'Event',
  person: 'Person',
  thread: 'Thread',
  real: 'Real history',
  company: 'Corporate map',
};

const pageKey = (page: PanelPage) => `${page.kind}:${page.kind === 'person' ? page.name : page.id}`;

/**
 * Side panel that slides in from the right. It shows one page at a time (an event, a person,
 * a thread, a real-history entry or a company); pages link to each other and the header steps back.
 */
export function DetailPanel(props: DetailPanelProps) {
  const { page, canGoBack, position, total, onBack, onClose, onStep, onOpen } = props;
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
            {shown ? PAGE_LABEL[shown.kind] : ''}
            {isEvent && position > 0 ? ` · ${position} of ${total}` : ''}
          </span>
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
          {shown && <Page {...props} shown={shown} onOpen={onOpen} />}
        </div>
      </div>
    </aside>
  );
}

/** The page body for whichever kind is showing. Unknown ids render nothing. */
function Page({ shown, person, thread, mapStep, onOpen, onFilterPerson, onFilterThread }: DetailPanelProps & { shown: PanelPage }) {
  switch (shown.kind) {
    case 'event': {
      const event = EVENT_BY_ID.get(shown.id);
      return event ? <EventPage event={event} onOpen={onOpen} /> : null;
    }
    case 'person':
      return <PersonPage name={shown.name} filtered={person === shown.name} onFilter={onFilterPerson} onOpen={onOpen} />;
    case 'thread': {
      const found = THREAD_BY_ID.get(shown.id);
      return found ? <ThreadPage thread={found} filtered={thread === found.id} onFilter={onFilterThread} onOpen={onOpen} /> : null;
    }
    case 'real': {
      const real = REAL_BY_ID.get(shown.id);
      return real ? <RealPage real={real} onOpen={onOpen} /> : null;
    }
    case 'company': {
      const node = CORP_NODE_BY_ID.get(shown.id);
      return node ? <CompanyPage node={node} step={mapStep} onOpen={onOpen} /> : null;
    }
  }
}
