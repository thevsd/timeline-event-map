import { slug, uniqueId } from './parse';
import {
  FORMAT, HUES, VERSION,
  type CategoryDoc, type EventDoc, type GroupDoc, type Hue, type LaneDoc, type LaneItemDoc, type PersonDoc, type TermDoc,
  type ThreadDoc, type TimelineDoc,
} from './schema';

/**
 * Changes to a document. Every function returns a new document and leaves the old one
 * untouched, which is what makes undo a matter of keeping the previous value.
 */

/** A timeline with nothing in it yet. */
export function emptyDoc(title: string): TimelineDoc {
  return {
    format: FORMAT,
    version: VERSION,
    title: title.trim() || 'Untitled timeline',
    parts: [],
    gaps: [],
    categories: [{ id: 'general', name: 'General', color: 'blue' }],
    groups: [],
    events: [],
    people: [],
    threads: [],
    glossary: [],
  };
}

/** A new id for something named `name`, unlike any in `existing`. */
export function newId(name: string, existing: readonly { id: string }[]): string {
  return uniqueId(slug(name), new Set(existing.map((entry) => entry.id)));
}

/** The next colour not yet used by `used`, or the first one again once all are. */
export function nextHue(used: readonly (Hue | undefined)[]): Hue {
  return HUES.find((hue) => !used.includes(hue)) ?? HUES[used.length % HUES.length];
}

/** Replace the entry with the same key, or append. */
function upsert<T>(entries: readonly T[], entry: T, same: (other: T) => boolean): T[] {
  return entries.some(same) ? entries.map((other) => (same(other) ? entry : other)) : [...entries, entry];
}

/* ── Events ── */

export function saveEvent(doc: TimelineDoc, event: EventDoc): TimelineDoc {
  // Anyone named on the event gets a profile, so the name opens a page.
  const known = new Set(doc.people.map((p) => p.name));
  const added = (event.people ?? []).filter((name) => !known.has(name)).map((name): PersonDoc => ({ name }));
  return {
    ...doc,
    events: upsert(doc.events, event, (other) => other.id === event.id),
    people: added.length ? [...doc.people, ...added] : doc.people,
  };
}

export function removeEvent(doc: TimelineDoc, id: string): TimelineDoc {
  const without = (ids: string[] | undefined) => (ids?.includes(id) ? ids.filter((other) => other !== id) : ids);
  return {
    ...doc,
    events: doc.events.filter((ev) => ev.id !== id).map((ev) => (ev.links?.includes(id) ? { ...ev, links: without(ev.links) } : ev)),
    threads: doc.threads.map((t) => (t.events.includes(id) ? { ...t, events: without(t.events)! } : t)),
    lane: doc.lane && {
      ...doc.lane,
      items: doc.lane.items.map((item) => (item.events?.includes(id) ? { ...item, events: without(item.events) } : item)),
    },
    countdown: doc.countdown?.event === id ? undefined : doc.countdown,
  };
}

/* ── People ── */

/** Save a profile. `previousName` is given when an existing person is renamed; events follow the new name. */
export function savePerson(doc: TimelineDoc, person: PersonDoc, previousName?: string): TimelineDoc {
  const key = previousName ?? person.name;
  const renamed = previousName != null && previousName !== person.name;
  return {
    ...doc,
    people: upsert(doc.people, person, (other) => other.name === key),
    events: renamed
      ? doc.events.map((ev) =>
          ev.people?.includes(previousName) ? { ...ev, people: ev.people.map((name) => (name === previousName ? person.name : name)) } : ev,
        )
      : doc.events,
  };
}

export function removePerson(doc: TimelineDoc, name: string): TimelineDoc {
  return {
    ...doc,
    people: doc.people.filter((p) => p.name !== name),
    events: doc.events.map((ev) => (ev.people?.includes(name) ? { ...ev, people: ev.people.filter((other) => other !== name) } : ev)),
  };
}

/* ── Threads ── */

export function saveThread(doc: TimelineDoc, thread: ThreadDoc): TimelineDoc {
  return { ...doc, threads: upsert(doc.threads, thread, (other) => other.id === thread.id) };
}

export function removeThread(doc: TimelineDoc, id: string): TimelineDoc {
  return { ...doc, threads: doc.threads.filter((t) => t.id !== id) };
}

/** Put an event on exactly these threads, leaving their other events alone. */
export function setEventThreads(doc: TimelineDoc, eventId: string, threadIds: readonly string[]): TimelineDoc {
  return {
    ...doc,
    threads: doc.threads.map((t) => {
      const wanted = threadIds.includes(t.id);
      const has = t.events.includes(eventId);
      if (wanted === has) return t;
      return { ...t, events: wanted ? [...t.events, eventId] : t.events.filter((id) => id !== eventId) };
    }),
  };
}

/* ── Glossary ── */

export function saveTerm(doc: TimelineDoc, term: TermDoc): TimelineDoc {
  return { ...doc, glossary: upsert(doc.glossary, term, (other) => other.id === term.id) };
}

export function removeTerm(doc: TimelineDoc, id: string): TimelineDoc {
  return { ...doc, glossary: doc.glossary.filter((t) => t.id !== id) };
}

/* ── Categories and groups ── */

export function saveCategory(doc: TimelineDoc, category: CategoryDoc): TimelineDoc {
  return { ...doc, categories: upsert(doc.categories, category, (other) => other.id === category.id) };
}

/** Remove a category; its events move to `fallbackId`. The last category cannot be removed. */
export function removeCategory(doc: TimelineDoc, id: string, fallbackId: string): TimelineDoc {
  if (doc.categories.length < 2 || id === fallbackId) return doc;
  return {
    ...doc,
    categories: doc.categories.filter((c) => c.id !== id),
    events: doc.events.map((ev) => (ev.category === id ? { ...ev, category: fallbackId } : ev)),
  };
}

export function saveGroup(doc: TimelineDoc, group: GroupDoc): TimelineDoc {
  return { ...doc, groups: upsert(doc.groups, group, (other) => other.id === group.id) };
}

export function removeGroup(doc: TimelineDoc, id: string): TimelineDoc {
  return {
    ...doc,
    groups: doc.groups.filter((g) => g.id !== id),
    people: doc.people.map((p) => (p.group === id ? { ...p, group: undefined } : p)),
  };
}

/* ── The second lane ── */

/** A lane with nothing on it yet. */
export function emptyLane(title: string): LaneDoc {
  return { title: title.trim() || 'Second lane', kinds: [], items: [] };
}

export function saveLaneItem(doc: TimelineDoc, item: LaneItemDoc): TimelineDoc {
  const lane = doc.lane ?? emptyLane('');
  return { ...doc, lane: { ...lane, items: upsert(lane.items, item, (other) => other.id === item.id) } };
}

export function removeLaneItem(doc: TimelineDoc, id: string): TimelineDoc {
  return doc.lane ? { ...doc, lane: { ...doc.lane, items: doc.lane.items.filter((item) => item.id !== id) } } : doc;
}
