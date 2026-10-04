import { PERSON_BY_NAME, eventsOf } from '../../data';
import { PERSON_GROUP_LABEL } from '../../data/people';
import { EventLinks, FilterToggle, Section, type OpenPage } from './parts';

interface PersonPageProps {
  name: string;
  /** The timeline is currently narrowed to this person. */
  filtered: boolean;
  onFilter(name: string | null): void;
  onOpen: OpenPage;
}

/** A character: who they are and every event they take part in. */
export function PersonPage({ name, filtered, onFilter, onOpen }: PersonPageProps) {
  const person = PERSON_BY_NAME.get(name);
  const events = eventsOf(name);
  return (
    <div className="pbody page">
      <div className="tags">
        <span className="tag">{person ? PERSON_GROUP_LABEL[person.group] : 'Character'}</span>
        <span className="tag">
          {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </div>
      <h2 id="ptitle">{name}</h2>
      {person && <div className="dateline">{person.role}</div>}
      {person && <p className="lede">{person.bio}</p>}
      {person?.real && (
        <Section title="Real-world counterpart">
          <p>{person.real}</p>
        </Section>
      )}
      <FilterToggle active={filtered} label="Show only their events on the timeline" onToggle={() => onFilter(filtered ? null : name)} />
      <Section title="Appears in">
        <EventLinks ids={events.map((e) => e.id)} onOpen={onOpen} />
      </Section>
    </div>
  );
}
