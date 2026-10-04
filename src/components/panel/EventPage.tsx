import { useWorld } from '../../context';
import { CRASH_EVENT_ID } from '../../data';
import { BASIS_LABEL, CATEGORY_BY_ID, CONFIDENCE_LABEL, HISTORY_LABEL } from '../../data/categories';
import type { TimelineEvent } from '../../data/types';
import { CRASH_DAY } from '../../lib/time';
import { CategoryGlyph } from '../CategoryGlyph';
import { Illustration } from '../Illustration';
import { Prose } from '../Prose';
import { BulletList, EventLinks, Section, type OpenPage } from './parts';

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

/** Everything recorded about one event. */
export function EventPage({ event, onOpen }: { event: TimelineEvent; onOpen: OpenPage }) {
  const world = useWorld();
  const threads = world.threadsOf(event.id);
  const real = world.realOf(event.id);
  return (
    <div className={`cat-${event.category}`}>
      <div className="hero">
        <Illustration event={event} />
      </div>
      <div className="pbody">
        <div className="tags">
          <span className="tag">
            <CategoryGlyph category={event.category} />
            {CATEGORY_BY_ID[event.category].name}
          </span>
          <span className="tag">
            Vol. {event.volume} · {event.chapter}
          </span>
          <span className={`tag ${HISTORY_LABEL[event.history].className}`}>{HISTORY_LABEL[event.history].label}</span>
        </div>

        <h2 id="ptitle">{event.title}</h2>
        <div className="dateline">
          {event.when}
          <small>{BASIS_LABEL[event.basis]}</small>
        </div>
        <p className="lede">
          <Prose text={event.brief} />
        </p>
        <Countdown event={event} />

        {event.what?.length ? (
          <Section title="What happens">
            <BulletList items={event.what} />
          </Section>
        ) : null}

        {event.reveals?.length ? (
          <Section title="Revelations">
            <BulletList items={event.reveals} />
          </Section>
        ) : null}

        {(event.realWorld || real.length > 0) && (
          <Section title="Real-world history">
            {event.realWorld && (
              <p>
                <Prose text={event.realWorld} />
              </p>
            )}
            {real.length > 0 && (
              <div className="chips">
                {real.map((r) => (
                  <button key={r.id} type="button" className={`pill rh-pill t-${r.treatment}`} onClick={() => onOpen({ kind: 'real', id: r.id })}>
                    <i className="rh-m" aria-hidden="true" />
                    {r.title} · {r.when}
                  </button>
                ))}
              </div>
            )}
          </Section>
        )}

        {event.readings?.length ? (
          <Section title="Reading">
            <div className="reading">
              {event.readings.map((r) => (
                <div key={r.text}>
                  <span className={`conf ${CONFIDENCE_LABEL[r.confidence].className}`}>{CONFIDENCE_LABEL[r.confidence].label}</span>
                  <Prose text={r.text} />
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {threads.length > 0 && (
          <Section title="Threads">
            <div className="chips">
              {threads.map((t) => (
                <button key={t.id} type="button" className="pill thread-pill" onClick={() => onOpen({ kind: 'thread', id: t.id })}>
                  {t.name}
                </button>
              ))}
            </div>
          </Section>
        )}

        {event.people.length > 0 && (
          <Section title="People">
            <div className="chips">
              {event.people.map((name) => (
                <button key={name} type="button" className="pill person" onClick={() => onOpen({ kind: 'person', name })}>
                  {name}
                </button>
              ))}
            </div>
          </Section>
        )}

        {event.links.length > 0 && (
          <Section title="Connected events">
            <EventLinks ids={event.links} onOpen={onOpen} />
          </Section>
        )}
      </div>
    </div>
  );
}
