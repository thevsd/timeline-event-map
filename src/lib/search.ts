import { CORP_COLUMNS } from '../data/corporate';
import type { Section } from '../model/schema';
import type { World } from '../model/world';
import type { ViewPage } from '../types';
import { corporateOf, hasCorporateMap } from './corporate';
import { fold, foldWithMap, matchToken, planQuery, prepare, type Prepared, type Token } from './text';

/**
 * Search across everything a timeline holds: events, people, threads, lane entries and the
 * glossary (and, in the demo, the companies of its corporate map). Every word of the query must match somewhere in an entry; a match in the title
 * counts for more than one in the body, and a whole word for more than a fragment or a near miss.
 */

/** A run of text, flagged where it matched the query. */
export interface Fragment {
  text: string;
  hit?: boolean;
}

export interface SearchResult {
  /** The page that shows this entry. */
  page: ViewPage;
  title: Fragment[];
  /** One line of context: a date, a role, what kind of thing it is. */
  subtitle: string;
  /** The passage that matched, when it was not the title. */
  snippet: Fragment[] | null;
  score: number;
}

export interface SearchOutcome {
  /** Best matches first, cut to the limit. */
  results: SearchResult[];
  /** How many entries matched in all. */
  total: number;
  /** Ids of every matching event, for the timeline filter. */
  eventIds: string[];
}

interface Field {
  raw: string;
  text: Prepared;
  weight: number;
}

interface Doc {
  page: ViewPage;
  title: string;
  subtitle: string;
  fields: Field[];
}

// A match in the title outweighs any number in the body.
const WEIGHT = { title: 10, keys: 5, brief: 3, body: 1 } as const;
/** Bonus when the title contains the whole query as typed, and when it is the query. */
const PHRASE_BONUS = 8;
const EXACT_BONUS = 20;
/** Characters of context kept on each side of a matched passage. */
const SNIPPET_REACH = 56;

function doc(page: ViewPage, title: string, subtitle: string, keys: string, brief: string, body: string): Doc {
  const field = (raw: string, weight: number): Field => ({ raw, text: prepare(raw), weight });
  return {
    page,
    title,
    subtitle,
    fields: [field(title, WEIGHT.title), field(keys, WEIGHT.keys), field(brief, WEIGHT.brief), field(body, WEIGHT.body)],
  };
}

/** The text of a page's sections, flattened. */
const sectionText = (sections: readonly Section[] | undefined) =>
  (sections ?? [])
    .flatMap((section) => [section.text ?? '', ...(section.items ?? []).map((item) => (typeof item === 'string' ? item : item.text))])
    .filter(Boolean)
    .join(' ');

/** Index order breaks ties: people, threads and terms come before events, so a name finds its own page first. */
function buildIndex(world: World): Doc[] {
  const docs: Doc[] = [];
  for (const p of world.people) {
    const group = p.group ? (world.groupById.get(p.group)?.name ?? '') : '';
    docs.push(doc({ kind: 'person', name: p.name }, p.name, p.role ?? group, [p.role ?? '', group].join(' · '), '', `${p.bio ?? ''} ${sectionText(p.sections)}`));
  }
  for (const t of world.threads) {
    docs.push(doc({ kind: 'thread', id: t.id }, t.name, `Thread · ${t.events.length} events`, '', '', t.summary ?? ''));
  }
  if (hasCorporateMap(world.doc)) {
    for (const n of corporateOf(world).nodes) {
      // Companies that enter the story later are not on the reader's map yet.
      if (n.since && !world.eventById.has(n.since)) continue;
      const history = (n.history ?? []).map(([, text]) => text).join(' ');
      docs.push(doc({ kind: 'company', id: n.id }, n.name, `Corporate map · ${CORP_COLUMNS[n.col]}`, n.real ?? '', n.note, history));
    }
  }
  for (const item of world.lane?.items ?? []) {
    docs.push(doc({ kind: 'lane', id: item.id }, item.title, `${world.lane!.title} · ${item.when}`, item.kindName, item.text ?? '', item.note ?? ''));
  }
  for (const t of world.terms) {
    docs.push(doc({ kind: 'term', id: t.id }, t.term, 'Glossary', [...(t.aliases ?? []), t.origin ?? ''].join(' · '), '', t.definition));
  }
  for (const ev of world.events) {
    const keys = [...ev.people, ev.when, ev.partName, ev.source ?? '', ev.categoryName, ...ev.tags.map((tag) => tag.label)].join(' · ');
    docs.push(doc({ kind: 'event', id: ev.id }, ev.title, ev.partName ? `${ev.when} · ${ev.partName}` : ev.when, keys, ev.summary, sectionText(ev.sections)));
  }
  return docs;
}

const indexes = new WeakMap<World, Doc[]>();

function indexFor(world: World): Doc[] {
  let index = indexes.get(world);
  if (!index) indexes.set(world, (index = buildIndex(world)));
  return index;
}

/** Score an entry against the query's words; zero when any word is missing. */
function scoreDoc(entry: Doc, tokens: readonly Token[], phrase: string): number {
  let score = 0;
  for (const token of tokens) {
    let best = 0;
    for (const field of entry.fields) {
      const quality = matchToken(token, field.text);
      if (quality * field.weight > best) best = quality * field.weight;
    }
    if (!best) return 0;
    score += best;
  }
  const title = entry.fields[0].text.folded;
  if (title === phrase) score += EXACT_BONUS;
  else if (title.includes(phrase)) score += PHRASE_BONUS;
  return score;
}

const WORD_CHAR = /[a-z0-9]/;

/** Split a text into runs, flagging where the query's words appear. */
export function highlight(text: string, tokens: readonly string[]): Fragment[] {
  const { folded, map } = foldWithMap(text);
  const ranges: [number, number][] = [];
  for (const token of tokens) {
    const starts: [number, number][] = [];
    const inside: [number, number][] = [];
    for (let at = folded.indexOf(token); at >= 0; at = folded.indexOf(token, at + token.length)) {
      const range: [number, number] = [map[at], map[at + token.length]];
      (at === 0 || !WORD_CHAR.test(folded[at - 1]) ? starts : inside).push(range);
    }
    // Where the term starts a word, flag only those places; "a" should not light up every vowel.
    ranges.push(...(starts.length ? starts : inside));
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: Fragment[] = [];
  let from = 0;
  for (const [start, end] of ranges) {
    if (start < from) continue; // overlaps a run already flagged
    if (start > from) out.push({ text: text.slice(from, start) });
    out.push({ text: text.slice(start, end), hit: true });
    from = end;
  }
  if (from < text.length) out.push({ text: text.slice(from) });
  return out;
}

/** The passage of an entry's body that shows why it matched; null when the title says it all. */
function snippetOf(entry: Doc, tokens: readonly string[]): Fragment[] | null {
  for (const field of entry.fields.slice(2)) {
    const at = Math.min(...tokens.map((token) => field.text.folded.indexOf(token)).filter((i) => i >= 0), Infinity);
    if (at === Infinity) continue;
    const { map } = foldWithMap(field.raw);
    const hit = map[at];
    // Cut at word breaks, so the passage does not start or end mid-word.
    let start = Math.max(0, hit - SNIPPET_REACH);
    if (start > 0) start = field.raw.indexOf(' ', start) + 1;
    let end = Math.min(field.raw.length, hit + SNIPPET_REACH * 2);
    if (end < field.raw.length) end = Math.max(field.raw.lastIndexOf(' ', end), hit + 1);
    const passage = `${start > 0 ? '… ' : ''}${field.raw.slice(start, end)}${end < field.raw.length ? ' …' : ''}`;
    return highlight(passage, tokens);
  }
  return null;
}

const EMPTY: SearchOutcome = { results: [], total: 0, eventIds: [] };

/** Search a world. `limit` caps the results returned, not the events counted. */
export function search(world: World, query: string, limit = 12): SearchOutcome {
  const index = indexFor(world);
  const tokens = planQuery(
    query,
    index.flatMap((entry) => entry.fields.map((field) => field.text)),
  );
  if (!tokens.length) return EMPTY;
  const words = tokens.map((token) => token.text);
  const phrase = fold(query).trim().replace(/\s+/g, ' ');

  const scored: { entry: Doc; score: number }[] = [];
  for (const entry of index) {
    const score = scoreDoc(entry, tokens, phrase);
    if (score > 0) scored.push({ entry, score });
  }
  // Equal scores keep index order (the sort is stable).
  scored.sort((a, b) => b.score - a.score);

  return {
    results: scored.slice(0, limit).map(({ entry, score }) => ({
      page: entry.page,
      title: highlight(entry.title, words),
      subtitle: entry.subtitle,
      snippet: snippetOf(entry, words),
      score,
    })),
    total: scored.length,
    eventIds: scored.flatMap(({ entry }) => (entry.page.kind === 'event' ? [entry.page.id] : [])),
  };
}
