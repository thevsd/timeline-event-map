import type { TimelineEvent } from './world';

/** Active filters on the timeline. An event must pass all of them. */
export interface EventFilter {
  /** Ids of the categories turned off. */
  hidden: ReadonlySet<string>;
  /** Ids of the events matching the text filter (see lib/search.ts); null when no text is set. */
  textMatches: ReadonlySet<string> | null;
  /** Only events this person takes part in. */
  person: string | null;
  /** Only the events of the thread being followed; null for none. */
  threadEvents: ReadonlySet<string> | null;
}

/** Whether an event passes every active filter. */
export function matchesFilter(ev: TimelineEvent, filter: EventFilter): boolean {
  return (
    !filter.hidden.has(ev.category) &&
    (!filter.textMatches || filter.textMatches.has(ev.id)) &&
    (!filter.person || ev.people.includes(filter.person)) &&
    (!filter.threadEvents || filter.threadEvents.has(ev.id))
  );
}
