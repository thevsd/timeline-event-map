import { useWorld } from '../../context';
import { Portrait } from '../Portrait';
import { Prose } from '../Prose';
import { EventLinks, FilterToggle, Section, Sections, type OpenPage } from './parts';

interface PersonPageProps {
  name: string;
  /** The timeline is currently narrowed to this person. */
  filtered: boolean;
  onFilter(name: string | null): void;
  onOpen: OpenPage;
}

/** A person: who they are and every event they take part in. */
export function PersonPage({ name, filtered, onFilter, onOpen }: PersonPageProps) {
  const world = useWorld();
  const person = world.personByName.get(name);
  const events = world.eventsOf(name);
  const group = person?.group ? world.groupById.get(person.group) : undefined;
  return (
    <div className="pbody page">
      <div className="tags">
        {group && <span className="tag">{group.name}</span>}
        <span className="tag">
          {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="who">
        <Portrait name={name} person={person} />
        <div>
          <h2 id="ptitle">{name}</h2>
          {person?.role && <div className="dateline">{person.role}</div>}
          {person?.image && person.imageCredit && <div className="artnote">Portrait: {person.imageCredit}</div>}
        </div>
      </div>
      {person?.bio && (
        <p className="lede">
          <Prose text={person.bio} />
        </p>
      )}
      <Sections sections={person?.sections ?? []} />
      {events.length > 0 && (
        <>
          <FilterToggle active={filtered} label="Show only their events on the timeline" onToggle={() => onFilter(filtered ? null : name)} />
          <Section title="Appears in">
            <EventLinks ids={events.map((e) => e.id)} onOpen={onOpen} />
          </Section>
        </>
      )}
    </div>
  );
}
