import { useWorld } from '../context';

interface GlossaryRailProps {
  query: string;
  onQuery(text: string): void;
  editing: boolean;
  onAdd(): void;
}

/** Controls for the Glossary tab: add a term, and search. */
export function GlossaryRail({ query, onQuery, editing, onAdd }: GlossaryRailProps) {
  const world = useWorld();
  return (
    <div className="rail">
      {editing && (
        <button id="add-term" type="button" className="chip add" title="Add a term (Ctrl+Insert)" onClick={onAdd}>
          + Term
        </button>
      )}
      <input
        id="glossary-search"
        className="search"
        type="search"
        placeholder="Find a term"
        aria-label="Find a term"
        autoComplete="off"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <span className="count">
        {world.terms.length} term{world.terms.length === 1 ? '' : 's'}
      </span>
    </div>
  );
}
