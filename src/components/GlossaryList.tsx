import { useEffect, useRef } from 'react';
import { useWorld } from '../context';
import { eventsNaming } from '../lib/glossary';
import { fold, matchesAll, planQuery, prepare } from '../lib/text';

interface GlossaryListProps {
  /** Search text; empty shows every term. */
  query: string;
  /** Term whose page is open in the side panel. */
  selected: string | null;
  onSelect(id: string): void;
  editing: boolean;
  onAdd(): void;
}

/** The glossary: every term in alphabetical order, with its definition and how often it comes up. */
export function GlossaryList({ query, selected, onSelect, editing, onAdd }: GlossaryListProps) {
  const world = useWorld();
  const stage = useRef<HTMLElement>(null);

  useEffect(() => {
    stage.current?.querySelector('.termcard.is-sel')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const terms = [...world.terms].sort((a, b) => fold(a.term).localeCompare(fold(b.term)));
  const texts = terms.map((t) => prepare(`${t.term} ${(t.aliases ?? []).join(' ')} ${t.origin ?? ''} ${t.definition}`));
  const tokens = planQuery(query, texts);
  const matches = terms.filter((_, i) => matchesAll(tokens, texts[i]));

  return (
    <section id="glossary" className="caststage" aria-label="Glossary" ref={stage}>
      <div className="termgrid">
        {matches.map((t) => {
          const uses = eventsNaming(t.id, world).length;
          return (
            <button key={t.id} type="button" className={`termcard${t.id === selected ? ' is-sel' : ''}`} data-term={t.id} onClick={() => onSelect(t.id)}>
              <span className="tname">{t.term}</span>
              {t.origin && <span className="torigin">{t.origin}</span>}
              <span className="tdef">{t.definition}</span>
              <span className="ccount">{uses ? `In ${uses} event${uses === 1 ? '' : 's'}` : 'Not mentioned yet'}</span>
            </button>
          );
        })}
      </div>
      {matches.length === 0 && (
        <div className="empty">
          {world.terms.length ? (
            'No term matches. Clear the search.'
          ) : (
            <>
              No glossary terms yet. A term is underlined wherever the text mentions it.
              {editing ? (
                <button type="button" className="textbtn primary" onClick={onAdd}>
                  Add the first term
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
