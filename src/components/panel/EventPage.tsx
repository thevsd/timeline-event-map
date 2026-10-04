import { useWorld } from '../../context';
import type { TimelineEvent } from '../../model/world';
import { CategoryGlyph } from '../CategoryGlyph';
import { Illustration } from '../Illustration';
import { Prose } from '../Prose';
import { EventLinks, Section, Sections, type OpenPage } from './parts';

/** Days left until the event the timeline counts down to. Undated events have no countdown. */
function Countdown({ event }: { event: TimelineEvent }) {
  const { countdown } = useWorld();
  if (!countdown) return null;
  if (event.id === countdown.eventId) {
    return (
      <div className="count-down">
        <b>Day zero</b>
        <span>the day every other event counts down to</span>
      </div>
    );
  }
  if (event.day == null || event.day >= countdown.day) return null;
  return (
    <div className="count-down">
      <b>{(countdown.day - event.day).toLocaleString('en-US')}</b>
      <span>days before {countdown.label}</span>
    </div>
  );
}

/** Everything recorded about one event. */
export function EventPage({ event, onOpen }: { event: TimelineEvent; onOpen: OpenPage }) {
  const world = useWorld();
  const threads = world.threadsOf(event.id);
  const laneItems = world.laneOf(event.id);
  return (
    <div className={`hue-${event.hue}`}>
      <div className="hero">
        <Illustration event={event} />
      </div>
      <div className="pbody">
        <div className="tags">
          <span className="tag">
            <CategoryGlyph glyph={event.glyph} />
            {event.categoryName}
          </span>
          {(event.partName || event.source) && <span className="tag">{[event.partName, event.source].filter(Boolean).join(' · ')}</span>}
          {event.tags.map((tag) => (
            <span key={tag.label} className={tag.color ? `tag tinted hue-${tag.color}` : 'tag'}>
              {tag.label}
            </span>
          ))}
        </div>

        <h2 id="ptitle">{event.title}</h2>
        <div className="dateline">
          {event.when}
          {event.dateNote && <small>{event.dateNote}</small>}
        </div>
        {event.summary && (
          <p className="lede">
            <Prose text={event.summary} />
          </p>
        )}
        <Countdown event={event} />

        <Sections sections={event.sections} />

        {laneItems.length > 0 && world.lane && (
          <Section title={`On the “${world.lane.title}” lane`}>
            <div className="chips">
              {laneItems.map((item) => (
                <button key={item.id} type="button" className={`pill rh-pill hue-${item.hue}`} onClick={() => onOpen({ kind: 'lane', id: item.id })}>
                  <i className="rh-m" aria-hidden="true" />
                  {item.title} · {item.when}
                </button>
              ))}
            </div>
          </Section>
        )}

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
