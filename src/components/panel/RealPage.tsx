import { TREATMENT_LABEL } from '../../data/realHistory';
import type { RealEvent } from '../../data/types';
import { Prose } from '../Prose';
import { EventLinks, Section, type OpenPage } from './parts';

/** A real-world event: what happened, and what the novel does with it. */
export function RealPage({ real, onOpen }: { real: RealEvent; onOpen: OpenPage }) {
  return (
    <div className="pbody page">
      <div className="tags">
        <span className="tag">Real history</span>
        <span className={`tag rh-tag t-${real.treatment}`}>
          <i className="rh-m" aria-hidden="true" />
          {TREATMENT_LABEL[real.treatment]}
        </span>
      </div>
      <h2 id="ptitle">{real.title}</h2>
      <div className="dateline">
        {real.when}
        {real.precision === 'month' && <small>Placed mid-month; the day is not exact</small>}
      </div>
      <Section title="What really happened">
        <p>
          <Prose text={real.real} />
        </p>
      </Section>
      <Section title="In the novel">
        <p>
          <Prose text={real.novel} />
        </p>
      </Section>
      {real.counterparts.length > 0 && (
        <Section title="On the timeline">
          <EventLinks ids={real.counterparts} onOpen={onOpen} />
        </Section>
      )}
    </div>
  );
}
