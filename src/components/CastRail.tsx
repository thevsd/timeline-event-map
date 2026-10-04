import { useWorld } from '../context';
import { groupAnchor } from './CharacterList';

interface CastRailProps {
  query: string;
  onQuery(text: string): void;
  editing: boolean;
  onAdd(): void;
}

/** Controls for the People tab: add a person, jump to a group, and search by name or role. */
export function CastRail({ query, onQuery, editing, onAdd }: CastRailProps) {
  const world = useWorld();
  const groups = world.groups.filter((group) => world.people.some((p) => p.group === group.id));
  return (
    <div className="rail">
      {editing && (
        <button id="add-person" type="button" className="chip add" title="Add a person (Ctrl+Insert)" onClick={onAdd}>
          + Person
        </button>
      )}
      {groups.length > 1 && (
        <>
          <span className="label">Jump to</span>
          <div className="scroller" role="group" aria-label="Jump to a group">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className="chip jump"
                onClick={() => document.getElementById(groupAnchor(group.id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {group.name}
              </button>
            ))}
          </div>
        </>
      )}
      <input
        id="cast-search"
        className="search"
        type="search"
        placeholder="Find a person"
        aria-label="Find a person"
        autoComplete="off"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <span className="count">
        {world.people.length} {world.people.length === 1 ? 'person' : 'people'}
        {world.hiddenPeople > 0 && <em title="Raise ‘Read up to’ in the toolbar to show them"> · {world.hiddenPeople} not met yet</em>}
      </span>
    </div>
  );
}
