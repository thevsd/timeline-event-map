import { useWorld } from '../../context';
import { eventsNaming } from '../../lib/glossary';
import type { TermDoc } from '../../model/schema';
import { Prose } from '../Prose';
import { EventLinks, Section, type OpenPage } from './parts';

/** A glossary entry: what the term means, where it comes up, and the rest of the glossary. */
export function TermPage({ term, onOpen }: { term: TermDoc; onOpen: OpenPage }) {
  const world = useWorld();
  const events = eventsNaming(term.id, world);
  const others = world.terms.filter((other) => other.id !== term.id);
  return (
    <div className="pbody page">
      <div className="tags">
        <span className="tag">Glossary</span>
        {term.tags?.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
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
      {others.length > 0 && (
        <Section title="More terms">
          <div className="chips">
            {others.map((other) => (
              <button key={other.id} type="button" className="pill term-pill" onClick={() => onOpen({ kind: 'term', id: other.id })}>
                {other.term}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
