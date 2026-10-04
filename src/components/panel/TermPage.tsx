import { useWorld } from '../../context';
import type { Term } from '../../data/glossary';
import { eventsNaming } from '../../lib/glossary';
import { Prose } from '../Prose';
import { EventLinks, Section, type OpenPage } from './parts';

/** A glossary entry: what the term means, where it comes up, and the rest of the glossary. */
export function TermPage({ term, onOpen }: { term: Term; onOpen: OpenPage }) {
  const world = useWorld();
  const events = eventsNaming(term.id, world);
  return (
    <div className="pbody page">
      <div className="tags">
        <span className="tag">Glossary</span>
        {term.volume != null && <span className="tag">The novel’s own term</span>}
        {term.general && <span className="tag">General reference</span>}
      </div>
      <h2 id="ptitle">{term.term}</h2>
      {term.origin && <div className="dateline">{term.origin}</div>}
      <p className="lede">
        <Prose text={term.definition} skip={term.id} />
      </p>
      {term.aliases?.length ? (
        <Section title="Also written">
          <p>{term.aliases.join(' · ')}</p>
        </Section>
      ) : null}
      {events.length > 0 && (
        <Section title="Comes up in">
          <EventLinks ids={events} onOpen={onOpen} />
        </Section>
      )}
      <Section title="More terms">
        <div className="chips">
          {world.terms
            .filter((other) => other.id !== term.id)
            .map((other) => (
              <button key={other.id} type="button" className="pill term-pill" onClick={() => onOpen({ kind: 'term', id: other.id })}>
                {other.term}
              </button>
            ))}
        </div>
      </Section>
    </div>
  );
}
