import { unmatchedPortraits } from '../art/characterImages';
import { unmatchedImages } from '../art/eventImages';
import { MONTHS_SHORT, dateOf, toDay } from '../lib/time';
import { corpEdges, corpNodes, type CorpNode } from './corporate';
import { backstory } from './events/backstory';
import { volume1 } from './events/volume1';
import { volume2 } from './events/volume2';
import { volume3 } from './events/volume3';
import { volume4 } from './events/volume4';
import { volume5 } from './events/volume5';
import { people, type Person } from './people';
import { realHistory } from './realHistory';
import { threads, type Thread } from './threads';
import type { EventFilter, EventRecord, RealEvent, TimelineEvent } from './types';
import { validateData } from './validate';

const records: EventRecord[] = [...backstory, ...volume1, ...volume2, ...volume3, ...volume4, ...volume5];

// Surface data mistakes while developing; production builds skip the check.
if (import.meta.env.DEV) {
  const problems = validateData(records, threads, people, realHistory, corpNodes, corpEdges);
  for (const name of unmatchedImages(new Set(records.map((r) => r.id)))) {
    problems.push(`assets/events/${name}: no event with this id`);
  }
  for (const name of unmatchedPortraits(people.map((p) => p.name))) {
    problems.push(`assets/characters/${name}: no character with this name`);
  }
  if (problems.length) console.error('Data problems:\n  ' + problems.join('\n  '));
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

/** Position of each event in story order; the common clock for threads and the corporate map. */
export const EVENT_ORDER: ReadonlyMap<string, number> = new Map(EVENTS.map((e, i) => [e.id, i]));

/** Id of the frame scene (15 September 2008). */
export const CRASH_EVENT_ID = 'crash2008';

/** Sort event ids into story order, dropping unknown ones. */
function inStoryOrder(ids: readonly string[]): string[] {
  return ids.filter((id) => EVENT_ORDER.has(id)).sort((a, b) => EVENT_ORDER.get(a)! - EVENT_ORDER.get(b)!);
}

/* ── Threads ── */

export const THREADS: readonly Thread[] = threads.map((t) => ({ ...t, events: inStoryOrder(t.events) }));
export const THREAD_BY_ID: ReadonlyMap<string, Thread> = new Map(THREADS.map((t) => [t.id, t]));
const THREAD_EVENT_SETS = new Map(THREADS.map((t) => [t.id, new Set(t.events)]));

/** Threads that pass through an event. */
export function threadsOf(eventId: string): Thread[] {
  return THREADS.filter((t) => THREAD_EVENT_SETS.get(t.id)!.has(eventId));
}

/* ── People ── */

export const PEOPLE: readonly Person[] = people;
export const PERSON_BY_NAME: ReadonlyMap<string, Person> = new Map(people.map((p) => [p.name, p]));

/** Events a person takes part in, in story order. */
export function eventsOf(name: string): TimelineEvent[] {
  return EVENTS.filter((ev) => ev.people.includes(name));
}

/* ── Real history ── */

function displayDate(day: number, monthOnly: boolean): string {
  const d = dateOf(day);
  const month = `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return monthOnly ? month : `${d.getUTCDate()} ${month}`;
}

export const REAL_EVENTS: readonly RealEvent[] = realHistory
  .map((r) => {
    const day = toDay(r.date);
    return {
      ...r,
      day,
      when: displayDate(day, r.precision === 'month'),
      counterparts: (r.counterparts ?? []).filter((id) => knownIds.has(id)),
    };
  })
  .sort((a, b) => a.day - b.day);

export const REAL_BY_ID: ReadonlyMap<string, RealEvent> = new Map(REAL_EVENTS.map((r) => [r.id, r]));

/** Real events that a timeline event answers. */
export function realEventsOf(eventId: string): RealEvent[] {
  return REAL_EVENTS.filter((r) => r.counterparts.includes(eventId));
}

/* ── Corporate map ── */

export const CORP_NODE_BY_ID: ReadonlyMap<string, CorpNode> = new Map(corpNodes.map((n) => [n.id, n]));

/** Events at which the corporate map changes, in story order. Step 0 of the map is the state before them. */
export const CORP_STEPS: readonly string[] = inStoryOrder([
  ...new Set([
    ...corpNodes.flatMap((n) => [n.since, n.until, ...(n.history ?? []).map(([id]) => id)]),
    ...corpEdges.flatMap((e) => [e.since, e.until]),
  ].filter((id): id is string => id != null)),
]);

/* ── Filtering ── */

/** Whether an event passes every active filter. */
export function matchesFilter(ev: TimelineEvent, filter: EventFilter): boolean {
  return (
    filter.categories.has(ev.category) &&
    (!filter.query || ev.searchText.includes(filter.query)) &&
    (!filter.person || ev.people.includes(filter.person)) &&
    (!filter.thread || (THREAD_EVENT_SETS.get(filter.thread)?.has(ev.id) ?? false))
  );
}
