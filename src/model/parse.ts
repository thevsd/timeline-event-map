import { parseDate } from '../lib/time';
import {
  FORMAT, HUES, VERSION,
  type CategoryDoc, type EventDoc, type GapDoc, type GroupDoc, type Hue, type LabelledItem, type LaneDoc,
  type LaneItemDoc, type LaneKind, type PersonDoc, type Section, type Tag, type TermDoc, type ThreadDoc, type TimelineDoc,
} from './schema';

/**
 * Loader for timeline documents.
 *
 * Input may be hand-written or produced by an AI model, so the loader repairs what it can
 * instead of rejecting the file: missing ids are made from titles, people and categories that
 * events mention are created, broken references are dropped. Everything it changed is reported
 * as a warning. Only input with no usable events at all is refused.
 */

/** The input cannot be read as a timeline. The message is written for the person importing it. */
export class DocError extends Error {}

export interface ParseResult {
  doc: TimelineDoc;
  /** What the loader repaired or dropped, in plain words. */
  warnings: string[];
}

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '');
const optional = (value: unknown): string | undefined => text(value) || undefined;
const strings = (value: unknown): string[] => list(value).map(text).filter(Boolean);
const hue = (value: unknown): Hue | undefined => (HUES as readonly string[]).includes(text(value)) ? (text(value) as Hue) : undefined;

/** A key made from a name: lower case, words joined by hyphens. */
export function slug(name: string): string {
  const key = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return key || 'item';
}

/** `base`, or `base-2`, `base-3`… if that is taken. Adds the result to `taken`. */
export function uniqueId(base: string, taken: Set<string>): string {
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

function parseSections(value: unknown): Section[] {
  return list(value).flatMap((entry): Section[] => {
    if (!isObject(entry)) return [];
    const items = list(entry.items).flatMap((item): (string | LabelledItem)[] => {
      if (isObject(item) && text(item.text)) {
        const label = text(item.label);
        return [label ? { label, text: text(item.text), color: hue(item.color) } : text(item.text)];
      }
      return text(item) ? [text(item)] : [];
    });
    const body = optional(entry.text);
    if (!body && !items.length) return [];
    return [{ title: text(entry.title) || 'Notes', text: body, items: items.length ? items : undefined }];
  });
}

function parseTags(value: unknown): Tag[] {
  return list(value).flatMap((entry): Tag[] => {
    if (isObject(entry) && text(entry.label)) return [{ label: text(entry.label), color: hue(entry.color) }];
    return text(entry) ? [{ label: text(entry) }] : [];
  });
}

/** A part number within range, or undefined. */
function parsePart(value: unknown, parts: number): number | undefined {
  const part = Number(value);
  return Number.isInteger(part) && part >= 1 && part <= parts ? part : undefined;
}

/** Drop keys that say nothing (undefined, empty text, false, an empty list), so exported files stay lean. `keep` lists required keys. */
function lean<T extends object>(record: T, ...keep: (keyof T)[]): T {
  for (const key of Object.keys(record) as (keyof T)[]) {
    if (keep.includes(key)) continue;
    const value = record[key];
    if (value === undefined || value === '' || value === false || (Array.isArray(value) && value.length === 0)) delete record[key];
  }
  return record;
}

/** Read a parsed JSON value as a timeline document. Throws DocError when it holds no events. */
export function parseDoc(input: unknown): ParseResult {
  // A bare list is taken as the events.
  const raw: Raw = Array.isArray(input) ? { events: input } : isObject(input) ? input : {};
  if (!Array.isArray(raw.events)) {
    throw new DocError('This file has no "events" list. A timeline needs at least { "title": …, "events": [ … ] }.');
  }
  const warnings: string[] = [];
  const warn = (message: string) => {
    if (warnings.length < 200) warnings.push(message);
  };
  if (raw.format && raw.format !== FORMAT) warn(`Format "${text(raw.format)}" is not "${FORMAT}"; reading it anyway.`);
  if (Number(raw.version) > VERSION) warn(`The file is from a newer version (${text(raw.version)}); some of it may be ignored.`);

  const parts = strings(raw.parts);

  /* ── Categories ── */

  const categories: CategoryDoc[] = [];
  const categoryIds = new Set<string>();
  /** Category id for whatever an event wrote: an id, a name, or something new. */
  const categoryKey = new Map<string, string>();
  const addCategory = (name: string, wanted?: string, color?: Hue, glyph?: string): string => {
    const id = uniqueId(slug(wanted || name), categoryIds);
    categories.push(lean({ id, name, color: color ?? HUES[categories.length % HUES.length], glyph }));
    categoryKey.set(id, id).set(name.toLowerCase(), id);
    if (wanted) categoryKey.set(wanted.toLowerCase(), id);
    return id;
  };
  for (const entry of list(raw.categories)) {
    const name = isObject(entry) ? text(entry.name) || text(entry.id) : text(entry);
    if (!name) continue;
    if (isObject(entry)) addCategory(name, text(entry.id), hue(entry.color), optional(entry.glyph)?.slice(0, 2));
    else addCategory(name);
  }
  const resolveCategory = (value: unknown): string => {
    const written = text(value) || 'General';
    return categoryKey.get(written) ?? categoryKey.get(written.toLowerCase()) ?? addCategory(written);
  };

  /* ── Events ── */

  const events: EventDoc[] = [];
  const eventIds = new Set<string>();
  /** What the file called each event, mapped to the id it ended up with. */
  const eventKey = new Map<string, string>();
  const dateOrNothing = (value: unknown, owner: string, field: string): string | undefined => {
    const written = text(value);
    if (!written) return undefined;
    if (parseDate(written)) return written;
    warn(`${owner}: ${field} "${written}" is not YYYY, YYYY-MM or YYYY-MM-DD, so it was left out.`);
    return undefined;
  };
  raw.events.forEach((entry, index) => {
    if (!isObject(entry)) return warn(`Event ${index + 1} is not an object and was skipped.`);
    const title = text(entry.title) || text(entry.name);
    if (!title) return warn(`Event ${index + 1} has no title and was skipped.`);
    const wanted = text(entry.id);
    const id = uniqueId(slug(wanted || title), eventIds);
    if (wanted && id !== wanted) warn(`"${title}": id "${wanted}" was changed to "${id}" (ids are lower-case words joined by hyphens, and unique).`);

    const date = dateOrNothing(entry.date ?? entry.start, `"${title}"`, 'date');
    let endDate = date ? dateOrNothing(entry.endDate ?? entry.end, `"${title}"`, 'endDate') : undefined;
    if (date && endDate && parseDate(endDate)!.day <= parseDate(date)!.day) {
      warn(`"${title}": endDate is not after date, so it was left out.`);
      endDate = undefined;
    }
    if (entry.part != null && parsePart(entry.part, parts.length) == null) {
      warn(`"${title}": part ${text(entry.part)} is not one of the ${parts.length} parts listed.`);
    }
    events.push(
      lean(
        {
          id,
          title,
          date,
          endDate,
          order: !date && typeof entry.order === 'number' && Number.isFinite(entry.order) ? entry.order : undefined,
          when: optional(entry.when),
          dateNote: optional(entry.dateNote),
          part: parsePart(entry.part, parts.length),
          source: optional(entry.source),
          category: resolveCategory(entry.category),
          summary: text(entry.summary) || text(entry.brief) || text(entry.description),
          image: optional(entry.image),
          motif: optional(entry.motif),
          figure: optional(entry.figure),
          featured: entry.featured === true,
          tags: parseTags(entry.tags),
          sections: parseSections(entry.sections),
          people: [...new Set(strings(entry.people))],
          links: strings(entry.links),
        },
        'summary',
      ),
    );
    // Remember what the file called it, so references written against the original id still resolve.
    if (wanted) eventKey.set(wanted, id);
    eventKey.set(id, id);
  });
  if (!events.length) throw new DocError('None of the entries in "events" could be read. Each event needs at least a "title".');
  if (!categories.length) addCategory('General');

  /** Keep the references that point at an event, translated to its final id. */
  function eventRefs(value: unknown, owner: string, self?: string): string[] {
    const ids: string[] = [];
    for (const written of strings(value)) {
      const id = eventKey.get(written);
      if (!id) warn(`${owner}: no event with id "${written}"; the reference was dropped.`);
      else if (id !== self && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }
  for (const ev of events) {
    if (ev.links) ev.links = eventRefs(ev.links, `"${ev.title}"`, ev.id);
    lean(ev, 'summary');
  }

  /* ── People and their groups ── */

  const groups: GroupDoc[] = [];
  const groupIds = new Set<string>();
  const groupKey = new Map<string, string>();
  const addGroup = (name: string, wanted?: string, color?: Hue): string => {
    const id = uniqueId(slug(wanted || name), groupIds);
    groups.push(lean({ id, name, color }));
    groupKey.set(id, id).set(name.toLowerCase(), id);
    if (wanted) groupKey.set(wanted.toLowerCase(), id);
    return id;
  };
  for (const entry of list(raw.groups)) {
    const name = isObject(entry) ? text(entry.name) || text(entry.id) : text(entry);
    if (name) addGroup(name, isObject(entry) ? text(entry.id) : undefined, isObject(entry) ? hue(entry.color) : undefined);
  }

  const people: PersonDoc[] = [];
  const names = new Set<string>();
  for (const entry of list(raw.people)) {
    const name = isObject(entry) ? text(entry.name) : text(entry);
    if (!name) continue;
    if (names.has(name)) {
      warn(`"${name}" is listed twice under people; the second entry was skipped.`);
      continue;
    }
    names.add(name);
    const record: Raw = isObject(entry) ? entry : {};
    const group = text(record.group);
    people.push(
      lean({
        name,
        group: group ? (groupKey.get(group) ?? groupKey.get(group.toLowerCase()) ?? addGroup(group)) : undefined,
        role: optional(record.role),
        bio: optional(record.bio) ?? optional(record.description),
        image: optional(record.image),
        imageCredit: optional(record.imageCredit),
        sex: record.sex === 'm' || record.sex === 'f' ? record.sex : undefined,
        part: parsePart(record.part, parts.length),
        sections: parseSections(record.sections),
      }),
    );
  }
  // Anyone an event names gets at least a bare profile, so every name on a card opens a page.
  for (const ev of events) {
    for (const name of ev.people ?? []) {
      if (names.has(name)) continue;
      names.add(name);
      people.push({ name });
    }
  }

  /* ── Threads ── */

  const threads: ThreadDoc[] = [];
  const threadIds = new Set<string>();
  for (const entry of list(raw.threads)) {
    if (!isObject(entry)) continue;
    const name = text(entry.name) || text(entry.title);
    if (!name) continue;
    threads.push(
      lean(
        {
          id: uniqueId(slug(text(entry.id) || name), threadIds),
          name,
          summary: optional(entry.summary),
          events: eventRefs(entry.events, `Thread "${name}"`),
        },
        'events',
      ),
    );
  }

  /* ── Glossary ── */

  const glossary: TermDoc[] = [];
  const termIds = new Set<string>();
  for (const entry of list(raw.glossary)) {
    if (!isObject(entry)) continue;
    const term = text(entry.term) || text(entry.name);
    if (!term) continue;
    glossary.push(
      lean(
        {
          id: uniqueId(slug(text(entry.id) || term), termIds),
          term,
          aliases: strings(entry.aliases),
          origin: optional(entry.origin),
          definition: text(entry.definition),
          part: parsePart(entry.part, parts.length),
          tags: strings(entry.tags),
        },
        'definition',
      ),
    );
  }

  /* ── The second lane ── */

  let lane: LaneDoc | undefined;
  if (isObject(raw.lane)) {
    const kinds: LaneKind[] = [];
    const kindIds = new Set<string>();
    const kindKey = new Map<string, string>();
    const addKind = (name: string, wanted?: string, color?: Hue): string => {
      const id = uniqueId(slug(wanted || name), kindIds);
      kinds.push({ id, name, color: color ?? HUES[(kinds.length + 2) % HUES.length] });
      kindKey.set(id, id).set(name.toLowerCase(), id);
      if (wanted) kindKey.set(wanted.toLowerCase(), id);
      return id;
    };
    for (const entry of list(raw.lane.kinds)) {
      const name = isObject(entry) ? text(entry.name) || text(entry.id) : text(entry);
      if (name) addKind(name, isObject(entry) ? text(entry.id) : undefined, isObject(entry) ? hue(entry.color) : undefined);
    }
    const items: LaneItemDoc[] = [];
    const itemIds = new Set<string>();
    for (const entry of list(raw.lane.items)) {
      if (!isObject(entry)) continue;
      const title = text(entry.title) || text(entry.name);
      if (!title) continue;
      const date = dateOrNothing(entry.date, `Lane entry "${title}"`, 'date');
      if (!date) {
        warn(`Lane entry "${title}" has no usable date and was skipped.`);
        continue;
      }
      const kind = text(entry.kind);
      items.push(
        lean({
          id: uniqueId(slug(text(entry.id) || title), itemIds),
          date,
          title,
          text: optional(entry.text),
          note: optional(entry.note),
          kind: kind ? (kindKey.get(kind) ?? kindKey.get(kind.toLowerCase()) ?? addKind(kind)) : undefined,
          events: eventRefs(entry.events, `Lane entry "${title}"`),
          major: entry.major === true,
        }),
      );
    }
    lane = lean(
      {
        title: text(raw.lane.title) || 'Second lane',
        textLabel: optional(raw.lane.textLabel),
        noteLabel: optional(raw.lane.noteLabel),
        kinds,
        items,
      },
      'kinds',
      'items',
    );
  }

  /* ── Axis furniture ── */

  const gaps: GapDoc[] = [];
  for (const entry of list(raw.gaps)) {
    if (!isObject(entry)) continue;
    const from = dateOrNothing(entry.from, 'A gap', 'from');
    const to = dateOrNothing(entry.to, 'A gap', 'to');
    if (from && to && parseDate(to)!.day > parseDate(from)!.day) gaps.push(lean({ from, to, label: optional(entry.label), note: optional(entry.note) }));
  }

  let countdown: TimelineDoc['countdown'];
  if (isObject(raw.countdown)) {
    const target = eventKey.get(text(raw.countdown.event));
    const event = target ? events.find((ev) => ev.id === target) : undefined;
    if (!event?.date) warn('countdown: its event is missing or undated, so the countdown was left out.');
    else countdown = lean({ event: event.id, label: text(raw.countdown.label) || event.title, jump: optional(raw.countdown.jump) });
  }

  const undated = isObject(raw.undated) ? lean({ label: optional(raw.undated.label), note: optional(raw.undated.note) }) : undefined;

  const doc: TimelineDoc = {
    format: FORMAT,
    version: VERSION,
    title: text(raw.title) || 'Untitled timeline',
    subtitle: optional(raw.subtitle),
    parts,
    undated: undated && Object.keys(undated).length ? undated : undefined,
    countdown,
    gaps,
    categories,
    groups,
    events,
    people,
    threads,
    glossary,
    lane,
  };
  return { doc, warnings };
}

/** Read JSON text as a timeline document. Throws DocError with a readable message on any failure. */
export function parseJson(json: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new DocError(`This is not valid JSON: ${error instanceof Error ? error.message : 'it could not be parsed'}.`);
  }
  return parseDoc(value);
}
