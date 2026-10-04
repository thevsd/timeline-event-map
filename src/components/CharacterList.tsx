import { useEffect, useRef } from 'react';
import { useWorld } from '../context';
import { matchesAll, planQuery, prepare } from '../lib/text';
import { Portrait } from './Portrait';

const eventCount = (count: number) => `${count} event${count === 1 ? '' : 's'}`;

/** Anchor id of a group's section, shared with the rail's jump chips. */
export const groupAnchor = (groupId: string) => `cast-${groupId}`;

interface CharacterListProps {
  /** Search text; empty shows everyone. */
  query: string;
  /** Person whose page is open in the side panel. */
  selected: string | null;
  onSelect(name: string): void;
  /** While editing, an empty list offers to add the first person. */
  editing: boolean;
  onAdd(): void;
}

/** The people of the timeline, in their groups. Each card opens that person's page. */
export function CharacterList({ query, selected, onSelect, editing, onAdd }: CharacterListProps) {
  const world = useWorld();
  const stage = useRef<HTMLElement>(null);

  // Keep the selected card in view, for example when a link opens straight onto a person.
  useEffect(() => {
    stage.current?.querySelector('.castcard.is-sel')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const texts = world.people.map((p) => prepare(`${p.name} ${p.role ?? ''}`));
  const tokens = planQuery(query, texts);
  const matches = world.people.filter((_, i) => matchesAll(tokens, texts[i]));
  // People in their groups, then anyone without one.
  const sections = [
    ...world.groups.map((group) => ({ id: group.id, name: group.name, members: matches.filter((p) => p.group === group.id) })),
    {
      id: 'ungrouped',
      name: world.groups.length ? 'Others' : 'People',
      members: matches.filter((p) => !p.group || !world.groupById.has(p.group)),
    },
  ].filter((section) => section.members.length);

  return (
    <section id="cast" className="caststage" aria-label="People" ref={stage}>
      {sections.map((section) => (
        <div key={section.id} id={groupAnchor(section.id)} className="castgroup">
          <h2>
            {section.name}
            <span>{section.members.length}</span>
          </h2>
          <div className="castgrid">
            {section.members.map((p) => (
              <button
                key={p.name}
                type="button"
                className={`castcard${p.name === selected ? ' is-sel' : ''}`}
                data-name={p.name}
                onClick={() => onSelect(p.name)}
              >
                <Portrait name={p.name} person={p} />
                <span className="cname">{p.name}</span>
                {p.role && <span className="crole">{p.role}</span>}
                <span className="ccount">{eventCount(world.eventsOf(p.name).length)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {matches.length === 0 && (
        <div className="empty">
          {world.people.length ? (
            'No one matches. Clear the search.'
          ) : (
            <>
              No people yet.
              {editing ? (
                <button type="button" className="textbtn primary" onClick={onAdd}>
                  Add the first person
                </button>
              ) : (
                ' Switch on Edit to add them.'
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
