import { useWorld } from '../context';
import type { JumpTarget } from '../engine/types';
import { CategoryGlyph } from './CategoryGlyph';

interface FilterRailProps {
  /** Ids of the categories turned off. */
  hidden: ReadonlySet<string>;
  onToggle(category: string): void;
  onJump(target: JumpTarget): void;
  /** Active thread and person filters; null for none. */
  thread: string | null;
  onThread(id: string | null): void;
  person: string | null;
  onPerson(name: string | null): void;
  /** Text the timeline is narrowed to, from the search box; empty for none. */
  query: string;
  onClearQuery(): void;
  /** Whether the second lane is shown. */
  lane: boolean;
  onLane(visible: boolean): void;
  /** Number of events passing the current filters. */
  visibleCount: number;
  /** While editing, the rail leads with the buttons that add things. */
  editing: boolean;
  onAddEvent(): void;
  onThreadMode(): void;
  onAddLaneItem(): void;
  onSettings(): void;
}

/** Jump buttons, category toggles (which double as the colour legend), focus pickers and the event count. */
export function FilterRail(props: FilterRailProps) {
  const { hidden, onToggle, onJump, thread, onThread, person, onPerson, query, onClearQuery, lane, onLane, visibleCount } = props;
  const { editing, onAddEvent, onThreadMode, onAddLaneItem, onSettings } = props;
  const world = useWorld();
  const total = world.events.length;

  // Jump targets this timeline has: its undated zone, the parts the reader has reached, its countdown event.
  const jumps: { label: string; target: JumpTarget }[] = [
    ...(world.undatedCount ? [{ label: world.doc.undated?.label ?? 'Undated', target: 'undated' as const }] : []),
    ...world.doc.parts.slice(0, world.max).map((label, index) => ({ label, target: index + 1 })),
    ...(world.countdown ? [{ label: world.countdown.jump, target: 'countdown' as const }] : []),
  ];
  // People in their groups, then anyone without one.
  const grouped = [
    ...world.groups.map((group) => ({ label: group.name, members: world.people.filter((p) => p.group === group.id) })),
    { label: world.groups.length ? 'Others' : 'People', members: world.people.filter((p) => !p.group || !world.groupById.has(p.group)) },
  ].filter((group) => group.members.length);

  return (
    <div className="rail">
      {editing && (
        <>
          <div className="scroller" role="group" aria-label="Add to the timeline">
            <button id="add-event" type="button" className="chip add" title="Add an event (Ctrl+Insert)" onClick={onAddEvent}>
              + Event
            </button>
            <button id="thread-mode" type="button" className="chip add" title="Build a thread by clicking cards in order (Ctrl+>)" onClick={onThreadMode}>
              + Thread
            </button>
            {world.lane && (
              <button id="add-lane" type="button" className="chip add" title={`Add an entry to the “${world.lane.title}” lane`} onClick={onAddLaneItem}>
                + {world.lane.title}
              </button>
            )}
            <button id="settings" type="button" className="chip jump" title="Title, categories, groups, parts and the second lane" onClick={onSettings}>
              Settings
            </button>
          </div>
          <span className="sep" aria-hidden="true" />
        </>
      )}
      {jumps.length > 0 && (
        <>
          <span className="label">Jump to</span>
          <div className="scroller" role="group" aria-label="Jump to a part">
            {jumps.map((j) => (
              <button key={j.target} id={`jump-${j.target}`} type="button" className="chip jump" onClick={() => onJump(j.target)}>
                {j.label}
              </button>
            ))}
          </div>
          <span className="sep" aria-hidden="true" />
        </>
      )}
      <div className="scroller" role="group" aria-label="Focus">
        {world.threads.length > 0 && (
          <select
            id="thread"
            className={`pick${thread ? ' on' : ''}`}
            aria-label="Follow a thread"
            value={thread ?? ''}
            onChange={(e) => onThread(e.target.value || null)}
          >
            <option value="">All threads</option>
            {world.threads.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        {world.people.length > 0 && (
          <select
            id="person"
            className={`pick${person ? ' on' : ''}`}
            aria-label="Show one person’s events"
            value={person ?? ''}
            onChange={(e) => onPerson(e.target.value || null)}
          >
            <option value="">Everyone</option>
            {grouped.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.members.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
        {query && (
          <button id="qchip" type="button" className="chip qchip" title="Stop narrowing the timeline to this text" onClick={onClearQuery}>
            Text: “{query}”
            <span className="x" aria-hidden="true">
              ×
            </span>
          </button>
        )}
        {world.lane && (
          <button
            id="lane-toggle"
            type="button"
            className="chip lane-chip"
            title={`Show or hide the “${world.lane.title}” lane above the cards`}
            aria-pressed={lane}
            onClick={() => onLane(!lane)}
          >
            <i className="rh-m" aria-hidden="true" />
            {world.lane.title}
          </button>
        )}
      </div>
      <span className="sep" aria-hidden="true" />
      <div className="scroller" role="group" aria-label="Show or hide kinds of event">
        {world.categories.map((c) => (
          <button
            key={c.id}
            id={`cat-${c.id}`}
            type="button"
            className={`chip hue-${c.color}`}
            title={`Show or hide ${c.name}`}
            aria-pressed={!hidden.has(c.id)}
            onClick={() => onToggle(c.id)}
          >
            <CategoryGlyph glyph={c.glyph} />
            {c.name}
            <span className="n">{world.events.filter((e) => e.category === c.id).length}</span>
          </button>
        ))}
      </div>
      <span className="count" id="count">
        {visibleCount === total ? `${total} event${total === 1 ? '' : 's'}` : `${visibleCount} of ${total} events`}
        {world.hiddenEvents > 0 && <em title="Raise ‘Read up to’ in the toolbar to show them"> · {world.hiddenEvents} later ones hidden</em>}
      </span>
    </div>
  );
}
