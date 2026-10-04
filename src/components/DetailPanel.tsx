import { useEffect, useRef, type ReactNode } from 'react';
import { CRASH_EVENT_ID, EVENT_BY_ID } from '../data';
import { BASIS_LABEL, CATEGORY_BY_ID, CONFIDENCE_LABEL, HISTORY_LABEL } from '../data/categories';
import type { TimelineEvent } from '../data/types';
import { CRASH_DAY } from '../lib/time';
import { CategoryGlyph } from './CategoryGlyph';
import { Illustration } from './Illustration';

interface DetailPanelProps {
  /** Event to show; null closes the panel. */
  event: TimelineEvent | null;
  /** 1-based position among the visible events, or 0 if the event is filtered out. */
  position: number;
  total: number;
  onClose(): void;
  /** Move to the previous (-1) or next (+1) visible event. */
  onStep(direction: -1 | 1): void;
  onSelect(id: string): void;
  /** Search the timeline for a person. */
  onSearchPerson(name: string): void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="sec">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  );
}

/** Countdown to the 2008 frame scene. Backstory events have no date, so no countdown. */
function Countdown({ event }: { event: TimelineEvent }) {
  if (event.id === CRASH_EVENT_ID) {
    return (
      <div className="count-down">
        <b>Day zero</b>
        <span>the night every other event counts down to</span>
      </div>
    );
  }
  if (event.day == null || event.day >= CRASH_DAY) return null;
  return (
    <div className="count-down">
      <b>{(CRASH_DAY - event.day).toLocaleString('en-US')}</b>
      <span>days before the crash of 15 September 2008</span>
    </div>
  );
}

/** Side panel with everything recorded about one event. Slides in from the right. */
export function DetailPanel({ event, position, total, onClose, onStep, onSelect, onSearchPerson }: DetailPanelProps) {
  const open = event !== null;
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the last event rendered while the panel slides shut.
  const last = useRef(event);
  if (event) last.current = event;
  const shown = event ?? last.current;

  // A new event starts at the top.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [shown?.id]);

  return (
    <aside id="panel" className={`panel${open ? ' open' : ''}`} aria-label="Event detail" aria-hidden={!open} inert={!open}>
      <div className="panel-in">
        <div className="phead">
          <span className="pos">{position > 0 ? `${position} of ${total}` : ''}</span>
          <button className="iconbtn" type="button" aria-label="Previous event" title="Previous event" onClick={() => onStep(-1)}>
            ‹
          </button>
          <button className="iconbtn" type="button" aria-label="Next event" title="Next event" onClick={() => onStep(1)}>
            ›
          </button>
          <button className="iconbtn" type="button" aria-label="Close detail" title="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pscroll" ref={scroller}>
          {shown && (
            <div className={`cat-${shown.category}`}>
              <div className="hero">
                <Illustration event={shown} />
              </div>
              <div className="pbody">
                <div className="tags">
                  <span className="tag">
                    <CategoryGlyph category={shown.category} />
                    {CATEGORY_BY_ID[shown.category].name}
                  </span>
                  <span className="tag">
                    Vol. {shown.volume} · {shown.chapter}
                  </span>
                  <span className={`tag ${HISTORY_LABEL[shown.history].className}`}>{HISTORY_LABEL[shown.history].label}</span>
                </div>

                <h2 id="ptitle">{shown.title}</h2>
                <div className="dateline">
                  {shown.when}
                  <small>{BASIS_LABEL[shown.basis]}</small>
                </div>
                <p className="lede">{shown.brief}</p>
                <Countdown event={shown} />

                {shown.what?.length ? (
                  <Section title="What happens">
                    <BulletList items={shown.what} />
                  </Section>
                ) : null}

                {shown.reveals?.length ? (
                  <Section title="Revelations">
                    <BulletList items={shown.reveals} />
                  </Section>
                ) : null}

                {shown.realWorld && (
                  <Section title="Real-world history">
                    <p>{shown.realWorld}</p>
                  </Section>
                )}

                {shown.readings?.length ? (
                  <Section title="Reading">
                    <div className="reading">
                      {shown.readings.map((r) => (
                        <div key={r.text}>
                          <span className={`conf ${CONFIDENCE_LABEL[r.confidence].className}`}>
                            {CONFIDENCE_LABEL[r.confidence].label}
                          </span>
                          {r.text}
                        </div>
                      ))}
                    </div>
                  </Section>
                ) : null}

                {shown.people.length > 0 && (
                  <Section title="People">
                    <div className="people">
                      {shown.people.map((name) => (
                        <button key={name} type="button" className="person" onClick={() => onSearchPerson(name)}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                {shown.links.length > 0 && (
                  <Section title="Connected events">
                    <div className="links">
                      {shown.links.map((id) => {
                        const other = EVENT_BY_ID.get(id);
                        if (!other) return null;
                        return (
                          <button key={id} type="button" className={`link cat-${other.category}`} data-go={id} onClick={() => onSelect(id)}>
                            <CategoryGlyph category={other.category} />
                            <span className="lt">{other.title}</span>
                            <span className="ld">{other.when.replace(/^c\. /, '')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
