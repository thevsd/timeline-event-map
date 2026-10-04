import { CATEGORIES } from '../data/categories';
import { EVENTS } from '../data';
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

interface FilterRailProps {
  enabled: ReadonlySet<CategoryId>;
  onToggle(category: CategoryId): void;
  onJump(target: JumpTarget): void;
  /** Number of events passing the current filters. */
  visibleCount: number;
}

/** Jump buttons, category toggles (which double as the colour legend) and the event count. */
export function FilterRail({ enabled, onToggle, onJump, visibleCount }: FilterRailProps) {
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
