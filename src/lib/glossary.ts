import type { World } from '../model/world';
import { fold, foldWithMap } from './text';

/** A run of text: plain, or a glossary term to mark. */
export interface TextPart {
  text: string;
  /** Id of the glossary term this run names. */
  term?: string;
}

interface Matcher {
  /** Null when the glossary is empty: there is nothing to look for. */
  pattern: RegExp | null;
  /** Folded spelling to term id. */
  idOf: Map<string, string>;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildMatcher(world: World): Matcher {
  const idOf = new Map<string, string>();
  for (const term of world.terms) {
    for (const spelling of [term.term, ...(term.aliases ?? [])]) {
      const key = fold(spelling).trim();
      // The first term to claim a spelling keeps it.
      if (key && !idOf.has(key)) idOf.set(key, term.id);
    }
  }
  // Longest first, so "BOJ special loans" wins over "special loan".
  const spellings = [...idOf.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  // Whole words only: not inside a longer word or number.
  const pattern = spellings.length ? new RegExp(`(?<![a-z0-9])(?:${spellings.join('|')})(?![a-z0-9])`, 'g') : null;
  return { pattern, idOf };
}

const matchers = new WeakMap<World, Matcher>();

function matcherFor(world: World): Matcher {
  let matcher = matchers.get(world);
  if (!matcher) matchers.set(world, (matcher = buildMatcher(world)));
  return matcher;
}

/**
 * Split a text at the glossary terms in it. Each term is marked once, at its first appearance,
 * so a paragraph that repeats a word is not littered with underlines. `skip` leaves one term
 * unmarked (its own page).
 */
export function splitTerms(text: string, world: World, skip?: string): TextPart[] {
  const { pattern, idOf } = matcherFor(world);
  if (!pattern) return [{ text }];
  const { folded, map } = foldWithMap(text);
  const parts: TextPart[] = [];
  const seen = new Set<string>();
  let from = 0;
  pattern.lastIndex = 0;
  for (let match = pattern.exec(folded); match; match = pattern.exec(folded)) {
    const id = idOf.get(match[0]);
    if (!id || id === skip || seen.has(id)) continue;
    seen.add(id);
    const start = map[match.index];
    const end = map[match.index + match[0].length];
    if (start > from) parts.push({ text: text.slice(from, start) });
    parts.push({ text: text.slice(start, end), term: id });
    from = end;
  }
  if (from < text.length) parts.push({ text: text.slice(from) });
  return parts;
}

/** Whether a text names a term. */
export function mentions(text: string, termId: string, world: World): boolean {
  const { pattern, idOf } = matcherFor(world);
  if (!pattern) return false;
  pattern.lastIndex = 0;
  const folded = fold(text);
  for (let match = pattern.exec(folded); match; match = pattern.exec(folded)) {
    if (idOf.get(match[0]) === termId) return true;
  }
  return false;
}

const eventsByTerm = new WeakMap<World, Map<string, string[]>>();

/** Ids of the events whose text names a term, in story order. */
export function eventsNaming(termId: string, world: World): string[] {
  let byTerm = eventsByTerm.get(world);
  if (!byTerm) eventsByTerm.set(world, (byTerm = new Map()));
  let ids = byTerm.get(termId);
  if (!ids) {
    ids = world.events
      .filter((ev) =>
        mentions(
          [
            ev.title,
            ev.summary,
            ...ev.sections.flatMap((section) => [section.text ?? '', ...(section.items ?? []).map((item) => (typeof item === 'string' ? item : item.text))]),
          ].join('\n'),
          termId,
          world,
        ),
      )
      .map((ev) => ev.id);
    byTerm.set(termId, ids);
  }
  return ids;
}
