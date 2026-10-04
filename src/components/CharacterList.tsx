import { useEffect, useRef } from 'react';
import { PEOPLE, eventsOf } from '../data';
import { PERSON_GROUP_LABEL, type PersonGroup } from '../data/people';
import { Portrait } from './Portrait';

const GROUPS = Object.keys(PERSON_GROUP_LABEL) as PersonGroup[];

/** Events per character; the data is static, so count once. */
const EVENT_COUNT = new Map(PEOPLE.map((p) => [p.name, eventsOf(p.name).length]));

/** Anchor id of a group's section, shared with the rail's jump chips. */
export const groupAnchor = (group: PersonGroup) => `cast-${group}`;

interface CharacterListProps {
  /** Lower-cased search text; empty shows everyone. */
  query: string;
  /** Character whose page is open in the side panel. */
  selected: string | null;
  onSelect(name: string): void;
}

/** The cast, grouped as in the context file. Each card opens that character's page. */
export function CharacterList({ query, selected, onSelect }: CharacterListProps) {
  const stage = useRef<HTMLElement>(null);

  // Keep the selected card in view, for example when a link opens straight onto a character.
  useEffect(() => {
    stage.current?.querySelector('.castcard.is-sel')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const matches = PEOPLE.filter(
    (p) => !query || `${p.name} ${p.role} ${p.real ?? ''}`.toLowerCase().includes(query),
  );
  return (
    <section id="cast" className="caststage" aria-label="Characters" ref={stage}>
      {GROUPS.map((group) => {
        const members = matches.filter((p) => p.group === group);
        if (!members.length) return null;
        return (
          <div key={group} id={groupAnchor(group)} className="castgroup">
            <h2>
              {PERSON_GROUP_LABEL[group]}
              <span>{members.length}</span>
            </h2>
            <div className="castgrid">
              {members.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className={`castcard${p.name === selected ? ' is-sel' : ''}`}
                  data-name={p.name}
                  onClick={() => onSelect(p.name)}
                >
                  <Portrait name={p.name} person={p} />
                  <span className="cname">{p.name}</span>
                  <span className="crole">{p.role}</span>
                  <span className="ccount">
                    {EVENT_COUNT.get(p.name)} event{EVENT_COUNT.get(p.name) === 1 ? '' : 's'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {matches.length === 0 && <div className="empty">No character matches. Clear the search.</div>}
    </section>
  );
}
