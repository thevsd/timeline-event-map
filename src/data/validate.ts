import { LAST_VOLUME } from '../lib/spoilers';
import { fold } from '../lib/text';
import type { CorpEdge, CorpNode } from './corporate';
import type { Term } from './glossary';
import type { Person } from './people';
import type { RealEventRecord } from './realHistory';
import type { Thread } from './threads';
import type { EventRecord } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A well-formed spoiler marker; anything else that starts like one is a typo. */
const MARKER = new RegExp(`\\{v[1-${LAST_VOLUME}]\\}`, 'g');

/**
 * Checks the TypeScript types cannot express: unique ids, date formats, that every
 * cross-reference (links, threads, people, counterparts, map steps) points at something real,
 * and that spoiler markers are well formed and only where the reading-progress guard looks.
 * Returns a list of problems; empty means the data is sound.
 */
export function validateData(
  records: readonly EventRecord[],
  threads: readonly Thread[],
  people: readonly Person[],
  realHistory: readonly RealEventRecord[],
  corpNodes: readonly CorpNode[],
  corpEdges: readonly CorpEdge[],
  glossary: readonly Term[],
): string[] {
  const problems: string[] = [];

  /** Text the engine or a heading shows as it is: no markers. */
  const plain = (owner: string, ...texts: (string | undefined)[]) => {
    if (texts.some((text) => text?.includes('{v'))) problems.push(`${owner}: spoiler marker in a field that cannot carry one`);
  };
  /** Text that passes through `reveal`: markers must be well formed. */
  const marked = (owner: string, ...texts: (string | undefined)[]) => {
    if (texts.some((text) => text?.replace(MARKER, '').includes('{v'))) problems.push(`${owner}: malformed spoiler marker`);
  };
  const ids = new Set<string>();

  for (const r of records) {
    if (ids.has(r.id)) problems.push(`${r.id}: duplicate id`);
    ids.add(r.id);
    if (r.backstoryOrder == null && !r.date) problems.push(`${r.id}: needs a date or a backstoryOrder`);
    if (r.date && !ISO_DATE.test(r.date)) problems.push(`${r.id}: date must be YYYY-MM-DD`);
    if (r.endDate && (!r.date || !ISO_DATE.test(r.endDate) || r.endDate <= r.date)) {
      problems.push(`${r.id}: endDate must be a YYYY-MM-DD date after date`);
    }
    if (!(r.volume >= 1 && r.volume <= LAST_VOLUME)) problems.push(`${r.id}: volume must be 1 to ${LAST_VOLUME}`);
    plain(r.id, r.title, r.brief, r.when, r.chapter, r.figure);
    marked(r.id, ...(r.what ?? []), ...(r.reveals ?? []), r.realWorld, ...(r.readings ?? []).map((x) => x.text));
  }
  const checkEvent = (owner: string, id: string | undefined) => {
    if (id != null && !ids.has(id)) problems.push(`${owner}: unknown event "${id}"`);
  };

  const names = new Set(people.map((p) => p.name));
  if (names.size !== people.length) problems.push('people: duplicate name');
  for (const r of records) {
    for (const id of r.links ?? []) checkEvent(r.id, id);
    for (const name of r.people ?? []) {
      if (!names.has(name)) problems.push(`${r.id}: no profile for "${name}"`);
    }
  }
  for (const p of people) {
    plain(p.name, p.name, p.real);
    marked(p.name, p.role, p.bio);
    // A profile must be readable by the time its first event is.
    const first = Math.min(...records.filter((r) => r.people?.includes(p.name)).map((r) => r.volume), LAST_VOLUME);
    if (!(p.intro >= 1 && p.intro <= first)) problems.push(`${p.name}: intro must be 1 to ${first}, the volume of their first event`);
  }

  for (const t of threads) {
    plain(`thread ${t.id}`, t.name);
    marked(`thread ${t.id}`, t.summary);
    for (const id of t.events) checkEvent(`thread ${t.id}`, id);
  }

  for (const r of realHistory) {
    if (!ISO_DATE.test(r.date)) problems.push(`${r.id}: date must be YYYY-MM-DD`);
    plain(r.id, r.title, r.real);
    marked(r.id, r.novel);
    for (const id of r.counterparts ?? []) checkEvent(r.id, id);
  }

  const nodeIds = new Set(corpNodes.map((n) => n.id));
  if (nodeIds.size !== corpNodes.length) problems.push('corporate: duplicate node id');
  const cells = new Set<string>();
  for (const n of corpNodes) {
    const cell = `${n.col},${n.row}`;
    if (cells.has(cell)) problems.push(`corporate ${n.id}: grid cell ${cell} is taken`);
    cells.add(cell);
    plain(`corporate ${n.id}`, n.name, n.real, ...(n.history ?? []).map(([, text]) => text));
    marked(`corporate ${n.id}`, n.note);
    checkEvent(`corporate ${n.id}`, n.since);
    checkEvent(`corporate ${n.id}`, n.until);
    for (const [id] of n.history ?? []) checkEvent(`corporate ${n.id}`, id);
    if (n.into && !nodeIds.has(n.into)) problems.push(`corporate ${n.id}: unknown node "${n.into}"`);
  }
  for (const e of corpEdges) {
    const name = `corporate ${e.from} -> ${e.to}`;
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) problems.push(`${name}: unknown node`);
    plain(name, e.label);
    checkEvent(name, e.since);
    checkEvent(name, e.until);
  }

  // Each spelling must lead to one term, or the text matcher could not tell them apart.
  const spellings = new Map<string, string>();
  for (const t of glossary) {
    plain(`glossary ${t.id}`, t.term, t.origin, ...(t.aliases ?? []));
    marked(`glossary ${t.id}`, t.definition);
    for (const spelling of [t.term, ...(t.aliases ?? [])]) {
      const key = fold(spelling);
      const owner = spellings.get(key);
      if (owner && owner !== t.id) problems.push(`glossary ${t.id}: "${spelling}" is already a spelling of ${owner}`);
      spellings.set(key, t.id);
    }
  }
  return problems;
}
