import { toDay } from '../lib/time';
import { backstory } from './events/backstory';
import { volume1 } from './events/volume1';
import { volume2 } from './events/volume2';
import { volume3 } from './events/volume3';
import { volume4 } from './events/volume4';
import { volume5 } from './events/volume5';
import type { EventFilter, EventRecord, TimelineEvent } from './types';
import { validateEvents } from './validate';

const records: EventRecord[] = [...backstory, ...volume1, ...volume2, ...volume3, ...volume4, ...volume5];

// Surface data mistakes while developing; production builds skip the check.
if (import.meta.env.DEV) {
  const problems = validateEvents(records);
  if (problems.length) console.error('Event data problems:\n  ' + problems.join('\n  '));
}

const knownIds = new Set(records.map((r) => r.id));

function normalise(r: EventRecord): TimelineEvent {
  const people = r.people ?? [];
  return {
    ...r,
    day: r.date ? toDay(r.date) : null,
    endDay: r.endDate ? toDay(r.endDate) : null,
    people,
    // Drop links to unknown ids so the panel never renders a dead link.
    links: (r.links ?? []).filter((id) => knownIds.has(id) && id !== r.id),
    searchText: [r.title, r.brief, people.join(' '), r.when, `vol. ${r.volume}`, (r.what ?? []).join(' ')]
      .join(' ')
      .toLowerCase(),
  };
}

/** All events: backstory first (by its order), then chronological. Source order breaks ties. */
export const EVENTS: readonly TimelineEvent[] = records
  .map((r, i) => ({ ev: normalise(r), i }))
  .sort(
    (a, b) =>
      (a.ev.backstoryOrder ?? 99) - (b.ev.backstoryOrder ?? 99) ||
      (a.ev.day ?? 0) - (b.ev.day ?? 0) ||
      a.i - b.i,
  )
  .map((x) => x.ev);

export const EVENT_BY_ID: ReadonlyMap<string, TimelineEvent> = new Map(EVENTS.map((e) => [e.id, e]));

/** Id of the frame scene (15 September 2008). */
export const CRASH_EVENT_ID = 'crash2008';

/** Whether an event passes the category toggles and the search text. */
export function matchesFilter(ev: TimelineEvent, filter: EventFilter): boolean {
  return filter.categories.has(ev.category) && (!filter.query || ev.searchText.includes(filter.query));
}
