import { useEffect, useRef } from 'react';
import { useWorld } from '../context';
import { PERSON_GROUP_LABEL, type PersonGroup } from '../data/people';
import { matchesAll, planQuery, prepare } from '../lib/text';
import { Portrait } from './Portrait';

const GROUPS = Object.keys(PERSON_GROUP_LABEL) as PersonGroup[];

const eventCount = (count: number) => `${count} event${count === 1 ? '' : 's'}`;

/** Anchor id of a group's section, shared with the rail's jump chips. */
export const groupAnchor = (group: PersonGroup) => `cast-${group}`;

interface CharacterListProps {
  /** Search text; empty shows everyone. */
  query: string;
  /** Character whose page is open in the side panel. */
  selected: string | null;
  onSelect(name: string): void;
}

/** The cast, grouped as in the context file. Each card opens that character's page. */
export function CharacterList({ query, selected, onSelect }: CharacterListProps) {
  const world = useWorld();
  const stage = useRef<HTMLElement>(null);

  // Keep the selected card in view, for example when a link opens straight onto a character.
  useEffect(() => {
    stage.current?.querySelector('.castcard.is-sel')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const texts = world.people.map((p) => prepare(`${p.name} ${p.role} ${p.real ?? ''}`));
  const tokens = planQuery(query, texts);
  const matches = world.people.filter((_, i) => matchesAll(tokens, texts[i]));
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
                  <span className="ccount">{eventCount(world.eventsOf(p.name).length)}</span>
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
