import { LAST_VOLUME, reveal, revealAll } from '../lib/spoilers';
import { CORP_STEPS, EVENTS, PEOPLE, REAL_EVENTS, TERMS, THREADS } from './index';
import { corpNodes, type CorpNode } from './corporate';
import type { Term } from './glossary';
import type { Person } from './people';
import type { Thread } from './threads';
import type { RealEvent, TimelineEvent } from './types';

/**
 * The data as a reader who has finished volume `max` may see it.
 *
 * Everything from a later volume is left out: events, the people, threads, real-history entries
 * and terms that only appear in them, and any marked sentence (see lib/spoilers.ts). Components
 * read from a World and so never meet a spoiler marker; the engine keeps the full event list
 * and hides later events through the filter.
 */
export interface World {
  /** Reading progress this world was built for. */
  max: number;
  /** Events in story order. */
  events: readonly TimelineEvent[];
  eventById: ReadonlyMap<string, TimelineEvent>;
  /** Number of events held back. */
  hiddenEvents: number;
  threads: readonly Thread[];
  threadById: ReadonlyMap<string, Thread>;
  /** Threads that pass through an event. */
  threadsOf(eventId: string): Thread[];
  people: readonly Person[];
  personByName: ReadonlyMap<string, Person>;
  /** Events a person takes part in, in story order. */
  eventsOf(name: string): TimelineEvent[];
  real: readonly RealEvent[];
  realById: ReadonlyMap<string, RealEvent>;
  /** Real events that a timeline event answers. */
  realOf(eventId: string): RealEvent[];
  nodes: readonly CorpNode[];
  nodeById: ReadonlyMap<string, CorpNode>;
  /** Last step of the corporate map the reader may reach. */
  lastStep: number;
  terms: readonly Term[];
  termById: ReadonlyMap<string, Term>;
}

/** A thread needs at least this many readable events to be worth following. */
const MIN_THREAD_EVENTS = 2;

function build(max: number): World {
  const eventById = new Map<string, TimelineEvent>();
  for (const ev of EVENTS) {
    if (ev.volume > max) continue;
    eventById.set(ev.id, {
      ...ev,
      what: revealAll(ev.what, max),
      reveals: revealAll(ev.reveals, max),
      realWorld: reveal(ev.realWorld ?? '', max) || undefined,
      readings: (ev.readings ?? []).map((r) => ({ ...r, text: reveal(r.text, max) })).filter((r) => r.text),
    });
  }
  const visible = (id: string) => eventById.has(id);
  // Links to later events go too, so the panel never offers a page it cannot open.
  for (const ev of eventById.values()) ev.links = ev.links.filter(visible);
  const events = [...eventById.values()];

  const threads = THREADS.map((t) => ({ ...t, summary: reveal(t.summary, max), events: t.events.filter(visible) })).filter(
    (t) => t.events.length >= MIN_THREAD_EVENTS,
  );
  const threadSets = new Map(threads.map((t) => [t.id, new Set(t.events)]));

  const people = PEOPLE.filter((p) => p.intro <= max).map((p) => ({ ...p, role: reveal(p.role, max), bio: reveal(p.bio, max) }));

  const real = REAL_EVENTS.filter((r) => r.volume <= max).map((r) => ({
    ...r,
    novel: reveal(r.novel, max),
    counterparts: r.counterparts.filter(visible),
  }));

  const nodes = corpNodes.map((n) => ({
    ...n,
    note: reveal(n.note, max),
    history: n.history?.filter(([id]) => visible(id)),
  }));

  const terms = TERMS.filter((t) => (t.volume ?? 0) <= max).map((t) => ({ ...t, definition: reveal(t.definition, max) }));

  return {
    max,
    events,
    eventById,
    hiddenEvents: EVENTS.length - events.length,
    threads,
    threadById: new Map(threads.map((t) => [t.id, t])),
    threadsOf: (eventId) => threads.filter((t) => threadSets.get(t.id)!.has(eventId)),
    people,
    personByName: new Map(people.map((p) => [p.name, p])),
    eventsOf: (name) => events.filter((ev) => ev.people.includes(name)),
    real,
    realById: new Map(real.map((r) => [r.id, r])),
    realOf: (eventId) => real.filter((r) => r.counterparts.includes(eventId)),
    nodes,
    nodeById: new Map(nodes.map((n) => [n.id, n])),
    // Map steps are in story order, which never runs back a volume, so the readable ones are a prefix.
    lastStep: CORP_STEPS.filter(visible).length,
    terms,
    termById: new Map(terms.map((t) => [t.id, t])),
  };
}

const worlds = new Map<number, World>();

/** The world for a reading progress; built once per volume. */
export function worldAt(max: number): World {
  let world = worlds.get(max);
  if (!world) worlds.set(max, (world = build(max)));
  return world;
}

/** The world with nothing held back. */
export const FULL_WORLD = worldAt(LAST_VOLUME);
