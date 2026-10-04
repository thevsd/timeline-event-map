import { reveal } from '../lib/spoilers';
import { dayOf, formatDate, parseDate, yearOf } from '../lib/time';
import type {
  CategoryDoc, EventDoc, GroupDoc, Hue, LaneDoc, LaneItemDoc, LaneKind, PersonDoc, Section, Tag, TermDoc, ThreadDoc, TimelineDoc,
} from './schema';

/** An event ready to draw: dates resolved, category looked up, optional lists filled in. */
export interface TimelineEvent extends EventDoc {
  /** Day number of `date`; null for undated events. */
  day: number | null;
  endDay: number | null;
  /** Date as displayed. */
  when: string;
  /** Position in the undated zone, from 0; null for dated events. */
  slot: number | null;
  /** From the event's category. */
  hue: Hue;
  glyph: string;
  categoryName: string;
  /** Name of the event's part, e.g. "Vol. 2"; empty if it has none. */
  partName: string;
  tags: Tag[];
  sections: Section[];
  people: string[];
  links: string[];
}

/** An entry of the second lane, ready to draw. */
export interface LaneItem extends LaneItemDoc {
  day: number;
  /** Date as displayed, short form. */
  when: string;
  /** True when the date was given to the month or year only. */
  approximate: boolean;
  hue: Hue;
  kindName: string;
  events: string[];
}

/** The second lane and its entries, as the reader may see them. */
export interface Lane extends Omit<LaneDoc, 'items'> {
  items: LaneItem[];
}

export interface Category extends CategoryDoc {
  glyph: string;
}

/**
 * A document as a reader who has finished part `max` may see it, with everything looked up.
 *
 * Later parts are left out: their events, the people, threads, lane entries and terms that
 * only appear in them, and any marked sentence (see lib/spoilers.ts). Components and the
 * engine read from a World and so never meet a spoiler marker or an unresolved reference.
 */
export interface World {
  doc: TimelineDoc;
  /** Reading progress this world was built for: a part number, or 0 for a document without parts. */
  max: number;
  categories: readonly Category[];
  categoryById: ReadonlyMap<string, Category>;
  groups: readonly GroupDoc[];
  groupById: ReadonlyMap<string, GroupDoc>;
  /** Events in chronological order, undated ones first. */
  events: readonly TimelineEvent[];
  eventById: ReadonlyMap<string, TimelineEvent>;
  /** Position of each event in `events`. */
  eventOrder: ReadonlyMap<string, number>;
  /** Number of events held back by reading progress. */
  hiddenEvents: number;
  threads: readonly ThreadDoc[];
  threadById: ReadonlyMap<string, ThreadDoc>;
  /** Threads that pass through an event. */
  threadsOf(eventId: string): ThreadDoc[];
  people: readonly PersonDoc[];
  personByName: ReadonlyMap<string, PersonDoc>;
  hiddenPeople: number;
  /** Events a person takes part in, in order. */
  eventsOf(name: string): TimelineEvent[];
  lane: Lane | null;
  laneById: ReadonlyMap<string, LaneItem>;
  /** Lane entries tied to an event. */
  laneOf(eventId: string): LaneItem[];
  terms: readonly TermDoc[];
  termById: ReadonlyMap<string, TermDoc>;
  /** The to-scale axis, as day numbers: from the start of the first period shown to the end of the last. */
  domain: { start: number; end: number };
  /** Number of events in the undated zone. */
  undatedCount: number;
  gaps: readonly { from: number; to: number; label: string; note: string }[];
  /** The event the others count down to, if the document names one and the reader has reached it. */
  countdown: { day: number; eventId: string; label: string; jump: string } | null;
}

/** A thread shows once two of its events are readable (or its only one). */
const MIN_THREAD_EVENTS = 2;

/** Spans shorter than this many days snap the axis to months instead of years. */
const MONTH_SNAP_SPAN = 730;

function revealSections(sections: readonly Section[] | undefined, max: number): Section[] {
  return (sections ?? []).flatMap((section): Section[] => {
    const text = reveal(section.text ?? '', max) || undefined;
    const items = (section.items ?? []).flatMap((item) => {
      const shown = reveal(typeof item === 'string' ? item : item.text, max);
      if (!shown) return [];
      return [typeof item === 'string' ? shown : { ...item, text: shown }];
    });
    return text || items.length ? [{ title: section.title, text, items }] : [];
  });
}

/** Axis extent for a set of days: whole years for long timelines, whole months for short ones. */
function domainOf(days: readonly number[]): { start: number; end: number } {
  if (!days.length) {
    const year = new Date().getUTCFullYear();
    return { start: dayOf(year, 0), end: dayOf(year + 1, 0) };
  }
  let first = Infinity;
  let last = -Infinity;
  for (const day of days) {
    if (day < first) first = day;
    if (day > last) last = day;
  }
  if (last - first >= MONTH_SNAP_SPAN) return { start: dayOf(yearOf(first), 0), end: dayOf(yearOf(last) + 1, 0) };
  const from = new Date(first * 86_400_000);
  const to = new Date(last * 86_400_000);
  return {
    start: dayOf(from.getUTCFullYear(), from.getUTCMonth()),
    end: dayOf(to.getUTCFullYear(), to.getUTCMonth() + 1),
  };
}

function build(doc: TimelineDoc, progress: number): World {
  const guarded = doc.parts.length > 0;
  // Without parts there is no progress to guard: everything is readable.
  const max = guarded ? progress : Infinity;
  const readable = (part: number | undefined) => part == null || part <= max;

  const categories: Category[] = doc.categories.map((c) => ({ ...c, glyph: c.glyph || c.name.slice(0, 1).toUpperCase() }));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const fallback = categories[0];

  /* ── Events ── */

  const resolved = doc.events
    .filter((ev) => readable(ev.part))
    .map((ev, index) => {
      const date = ev.date ? parseDate(ev.date) : null;
      const end = date && ev.endDate ? parseDate(ev.endDate) : null;
      const category = categoryById.get(ev.category) ?? fallback;
      const when = ev.when || (date ? (end ? `${formatDate(date)} – ${formatDate(end)}` : formatDate(date)) : 'Undated');
      const event: TimelineEvent = {
        ...ev,
        category: category.id,
        day: date ? date.day : null,
        endDay: end && date && end.day > date.day ? end.day : null,
        when,
        slot: null,
        hue: category.color,
        glyph: category.glyph,
        categoryName: category.name,
        partName: ev.part ? (doc.parts[ev.part - 1] ?? '') : '',
        tags: ev.tags ?? [],
        sections: revealSections(ev.sections, max),
        people: ev.people ?? [],
        links: ev.links ?? [],
      };
      return { event, index };
    })
    // Undated events first, by `order`; then by date. The order in the file breaks ties.
    .sort(
      (a, b) =>
        Number(a.event.day != null) - Number(b.event.day != null) ||
        (a.event.day == null ? (a.event.order ?? Infinity) - (b.event.order ?? Infinity) || 0 : a.event.day - b.event.day!) ||
        a.index - b.index,
    );
  const events = resolved.map((r) => r.event);
  let undatedCount = 0;
  for (const ev of events) if (ev.day == null) ev.slot = undatedCount++;

  const eventById = new Map(events.map((ev) => [ev.id, ev]));
  const visible = (id: string) => eventById.has(id);
  // Links to later parts go too, so no page offers something it cannot open.
  for (const ev of events) ev.links = ev.links.filter((id) => visible(id) && id !== ev.id);
  const eventOrder = new Map(events.map((ev, i) => [ev.id, i]));
  const inOrder = (ids: readonly string[]) => ids.filter(visible).sort((a, b) => eventOrder.get(a)! - eventOrder.get(b)!);

  /* ── Threads ── */

  const threads = doc.threads
    .map((t) => ({ ...t, summary: reveal(t.summary ?? '', max) || undefined, events: inOrder([...new Set(t.events)]) }))
    .filter((t, i) => t.events.length >= Math.min(MIN_THREAD_EVENTS, Math.max(1, doc.threads[i].events.length)));
  const threadSets = new Map(threads.map((t) => [t.id, new Set(t.events)]));

  /* ── People ── */

  // Someone without a stated part is met in the earliest part of their events.
  const firstPart = new Map<string, number>();
  for (const ev of doc.events) {
    for (const name of ev.people ?? []) firstPart.set(name, Math.min(firstPart.get(name) ?? Infinity, ev.part ?? 0));
  }
  const people = doc.people
    .filter((p) => (p.part ?? firstPart.get(p.name) ?? 0) <= max)
    .map((p) => ({
      ...p,
      role: reveal(p.role ?? '', max) || undefined,
      bio: reveal(p.bio ?? '', max) || undefined,
      sections: revealSections(p.sections, max),
    }));
  const personByName = new Map(people.map((p) => [p.name, p]));

  /* ── The second lane ── */

  let lane: Lane | null = null;
  if (doc.lane) {
    const kindById = new Map<string, LaneKind>(doc.lane.kinds.map((k) => [k.id, k]));
    const items = doc.lane.items
      // An entry tied only to later events would give them away.
      .filter((item) => !item.events?.length || item.events.some(visible))
      .flatMap((item): LaneItem[] => {
        const date = parseDate(item.date);
        if (!date) return [];
        const kind = item.kind ? kindById.get(item.kind) : undefined;
        return [
          {
            ...item,
            day: date.day,
            when: formatDate(date, true),
            approximate: date.precision !== 'day',
            hue: kind?.color ?? 'green',
            kindName: kind?.name ?? '',
            text: reveal(item.text ?? '', max) || undefined,
            note: reveal(item.note ?? '', max) || undefined,
            events: inOrder(item.events ?? []),
          },
        ];
      })
      .sort((a, b) => a.day - b.day);
    lane = { ...doc.lane, items };
  }
  const laneItems = lane?.items ?? [];

  /* ── Glossary ── */

  const terms = doc.glossary.filter((t) => readable(t.part)).map((t) => ({ ...t, definition: reveal(t.definition, max) }));

  /* ── Axis ── */

  const days = [
    ...events.flatMap((ev) => (ev.day == null ? [] : [ev.day, ev.endDay ?? ev.day])),
    ...laneItems.map((item) => item.day),
  ];
  const target = doc.countdown ? eventById.get(doc.countdown.event) : undefined;

  return {
    doc,
    max: guarded ? progress : 0,
    categories,
    categoryById,
    groups: doc.groups,
    groupById: new Map(doc.groups.map((g) => [g.id, g])),
    events,
    eventById,
    eventOrder,
    hiddenEvents: doc.events.length - events.length,
    threads,
    threadById: new Map(threads.map((t) => [t.id, t])),
    threadsOf: (eventId) => threads.filter((t) => threadSets.get(t.id)!.has(eventId)),
    people,
    personByName,
    hiddenPeople: doc.people.length - people.length,
    eventsOf: (name) => events.filter((ev) => ev.people.includes(name)),
    lane,
    laneById: new Map(laneItems.map((item) => [item.id, item])),
    laneOf: (eventId) => laneItems.filter((item) => item.events.includes(eventId)),
    terms,
    termById: new Map(terms.map((t) => [t.id, t])),
    domain: domainOf(days),
    undatedCount,
    gaps: doc.gaps.flatMap((gap) => {
      const from = parseDate(gap.from);
      const to = parseDate(gap.to);
      return from && to ? [{ from: from.day, to: to.day, label: gap.label ?? '', note: gap.note ?? '' }] : [];
    }),
    countdown:
      doc.countdown && target?.day != null
        ? { day: target.day, eventId: target.id, label: doc.countdown.label, jump: doc.countdown.jump || target.title }
        : null,
  };
}

/** Worlds already built, per document and progress. A document is never changed in place, so identity is a safe key. */
const cache = new WeakMap<TimelineDoc, Map<number, World>>();

/** The world of a document for a reader who has finished part `max`; built once per pair. */
export function worldOf(doc: TimelineDoc, max: number = doc.parts.length): World {
  let byMax = cache.get(doc);
  if (!byMax) cache.set(doc, (byMax = new Map()));
  let world = byMax.get(max);
  if (!world) byMax.set(max, (world = build(doc, max)));
  return world;
}
