import { CATEGORIES } from '../data/categories';
import { EVENTS, PEOPLE, THREADS } from '../data';
import { PERSON_GROUP_LABEL, type PersonGroup } from '../data/people';
import type { CategoryId } from '../data/types';
import type { JumpTarget } from '../engine/types';
import { CategoryGlyph } from './CategoryGlyph';

const JUMPS: { label: string; target: JumpTarget }[] = [
  { label: 'Backstory', target: 'backstory' },
  { label: 'Vol. 1', target: 1 },
  { label: 'Vol. 2', target: 2 },
  { label: 'Vol. 3', target: 3 },
  { label: 'Vol. 4', target: 4 },
  { label: 'Vol. 5', target: 5 },
  { label: 'The crash, 2008', target: 'crash' },
];

/** Events per category; the data is static, so count once. */
const CATEGORY_COUNT = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, EVENTS.filter((e) => e.category === c.id).length]),
) as Record<CategoryId, number>;

/** People grouped for the picker, in the order the groups are declared. */
const PEOPLE_BY_GROUP = (Object.keys(PERSON_GROUP_LABEL) as PersonGroup[]).map((group) => ({
  group,
  names: PEOPLE.filter((p) => p.group === group).map((p) => p.name),
}));

interface FilterRailProps {
  enabled: ReadonlySet<CategoryId>;
  onToggle(category: CategoryId): void;
  onJump(target: JumpTarget): void;
  /** Active thread and person filters; null for none. */
  thread: string | null;
  onThread(id: string | null): void;
  person: string | null;
  onPerson(name: string | null): void;
  /** Whether the real-history lane is shown. */
  lane: boolean;
  onLane(visible: boolean): void;
  /** Number of events passing the current filters. */
  visibleCount: number;
}

/** Jump buttons, category toggles (which double as the colour legend), focus pickers and the event count. */
export function FilterRail(props: FilterRailProps) {
  const { enabled, onToggle, onJump, thread, onThread, person, onPerson, lane, onLane, visibleCount } = props;
  const total = EVENTS.length;
  return (
    <div className="rail">
      <span className="label">Jump to</span>
      <div className="scroller" role="group" aria-label="Jump to a volume">
        {JUMPS.map((j) => (
          <button key={j.target} id={`jump-${j.target}`} type="button" className="chip jump" onClick={() => onJump(j.target)}>
            {j.label}
          </button>
        ))}
      </div>
      <span className="sep" aria-hidden="true" />
      <div className="scroller" role="group" aria-label="Focus">
        <select
          id="thread"
          className={`pick${thread ? ' on' : ''}`}
          aria-label="Follow a thread"
          value={thread ?? ''}
          onChange={(e) => onThread(e.target.value || null)}
        >
          <option value="">All threads</option>
          {THREADS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          id="person"
          className={`pick${person ? ' on' : ''}`}
          aria-label="Show one person’s events"
          value={person ?? ''}
          onChange={(e) => onPerson(e.target.value || null)}
        >
          <option value="">Everyone</option>
          {PEOPLE_BY_GROUP.map(({ group, names }) => (
            <optgroup key={group} label={PERSON_GROUP_LABEL[group]}>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          id="lane-toggle"
          type="button"
          className="chip lane-chip"
          title="Show or hide the lane of real-world events above the cards"
          aria-pressed={lane}
          onClick={() => onLane(!lane)}
        >
          <i className="rh-m" aria-hidden="true" />
          Real history
        </button>
      </div>
      <span className="sep" aria-hidden="true" />
      <div className="scroller" role="group" aria-label="Show or hide kinds of event">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            id={`cat-${c.id}`}
            type="button"
            className={`chip cat-${c.id}`}
            title={`Show or hide ${c.name}`}
            aria-pressed={enabled.has(c.id)}
            onClick={() => onToggle(c.id)}
          >
            <CategoryGlyph category={c.id} />
            {c.name}
            <span className="n">{CATEGORY_COUNT[c.id]}</span>
          </button>
        ))}
      </div>
      <span className="count" id="count">
        {visibleCount === total ? `${total} events` : `${visibleCount} of ${total} events`}
      </span>
    </div>
  );
}
