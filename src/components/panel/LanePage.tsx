import { useWorld } from '../../context';
import type { LaneItem } from '../../model/world';
import { Prose } from '../Prose';
import { EventLinks, Section, type OpenPage } from './parts';

/** An entry of the second lane: its two texts, and the events it relates to. */
export function LanePage({ item, onOpen }: { item: LaneItem; onOpen: OpenPage }) {
  const lane = useWorld().lane;
  return (
    <div className={`pbody page hue-${item.hue}`}>
      <div className="tags">
        <span className="tag">{lane?.title}</span>
        {item.kindName && (
          <span className="tag rh-tag">
            <i className="rh-m" aria-hidden="true" />
            {item.kindName}
          </span>
        )}
      </div>
      <h2 id="ptitle">{item.title}</h2>
      <div className="dateline">
        {item.when}
        {item.approximate && <small>Placed mid-period; the exact day is not given</small>}
      </div>
      {item.text && (
        <Section title={lane?.textLabel ?? 'About'}>
          <p>
            <Prose text={item.text} />
          </p>
        </Section>
      )}
      {item.note && (
        <Section title={lane?.noteLabel ?? 'Notes'}>
          <p>
            <Prose text={item.note} />
          </p>
        </Section>
      )}
      {item.events.length > 0 && (
        <Section title="On the timeline">
          <EventLinks ids={item.events} onOpen={onOpen} />
        </Section>
      )}
    </div>
  );
}
