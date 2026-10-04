import { useWorld } from '../context';
import { PEOPLE } from '../data';
import { PERSON_GROUP_LABEL, type PersonGroup } from '../data/people';
import { groupAnchor } from './CharacterList';

const GROUPS = Object.keys(PERSON_GROUP_LABEL) as PersonGroup[];
const PEOPLE_COUNT = PEOPLE.length;

interface CastRailProps {
  query: string;
  onQuery(text: string): void;
}

/** Controls for the Characters tab: jump to a group, and search by name or role. */
export function CastRail({ query, onQuery }: CastRailProps) {
  const world = useWorld();
  const hidden = PEOPLE_COUNT - world.people.length;
  return (
    <div className="rail">
      <span className="label">Jump to</span>
      <div className="scroller" role="group" aria-label="Jump to a group">
        {GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            className="chip jump"
            onClick={() => document.getElementById(groupAnchor(group))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {PERSON_GROUP_LABEL[group]}
          </button>
        ))}
      </div>
      <input
        id="cast-search"
        className="search"
        type="search"
        placeholder="Find a character"
        aria-label="Find a character"
        autoComplete="off"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <span className="count">
        {world.people.length} characters
        {hidden > 0 && <em title="Raise ‘Read up to’ in the toolbar to show them"> · {hidden} not met yet</em>}
      </span>
    </div>
  );
}
