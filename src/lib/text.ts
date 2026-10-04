/**
 * Text matching shared by the search box, the timeline's text filter and the glossary.
 *
 * Everything is compared in a folded form: lower case, accents removed, typographic quotes and
 * dashes made plain. "Koizumi Jun’ichirō" and "koizumi jun'ichiro" fold to the same text.
 */

const COMBINING = /[̀-ͯ]/g;
const PLAIN: Record<string, string> = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', ' ': ' ' };

function foldChar(char: string): string {
  return (PLAIN[char] ?? char).normalize('NFD').replace(COMBINING, '').toLowerCase();
}

/** Folded form of a text. */
export function fold(text: string): string {
  let out = '';
  for (const char of text) out += foldChar(char);
  return out;
}

/** Folded form of a text, plus the source index of each folded character. */
export function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  let index = 0;
  for (const char of text) {
    const plain = foldChar(char);
    for (let i = 0; i < plain.length; i++) map.push(index);
    folded += plain;
    index += char.length;
  }
  map.push(index); // one past the end, so a match that runs to the last character maps back
  return { folded, map };
}

const WORD = /[a-z0-9¥$%]+(?:['.,-][a-z0-9]+)*/g;

/** Words of a folded text. Inner apostrophes, hyphens and decimal points stay inside a word. */
export function wordsOf(folded: string): string[] {
  return folded.match(WORD) ?? [];
}

/** Search terms of a query: its folded words. */
export function tokenize(query: string): string[] {
  return wordsOf(fold(query));
}

/** A text prepared for matching. */
export interface Prepared {
  folded: string;
  /** Distinct words, for whole-word, prefix and near-miss matches. */
  words: string[];
}

export function prepare(text: string): Prepared {
  const folded = fold(text);
  return { folded, words: [...new Set(wordsOf(folded))] };
}

/** Whether two words are within `limit` single-character edits (insert, delete, replace, swap). */
export function withinEdits(a: string, b: string, limit: number): boolean {
  if (Math.abs(a.length - b.length) > limit) return false;
  // Rows of the edit-distance table; the row before last is kept for swaps.
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, before[j - 2] + 1);
      current.push(value);
      if (value < best) best = value;
    }
    if (best > limit) return false; // every path is already over the limit
    before = previous;
    previous = current;
  }
  return previous[b.length] <= limit;
}

/** Edits allowed for a search term: none for short words, where a near miss is usually another word. */
const editsFor = (token: string) => (token.length >= 9 ? 2 : token.length >= 5 ? 1 : 0);

/** How well a term matches. Zero means no match. */
export const MATCH = { word: 1, prefix: 0.8, inside: 0.5, near: 0.35 } as const;

/** A search term, and whether near misses count for it. */
export interface Token {
  text: string;
  /** Set when the term is found nowhere as typed, which makes it a likely typo. */
  loose: boolean;
}

/**
 * Split a query into terms. A term that appears somewhere in `corpus` as typed is matched as typed;
 * only one that appears nowhere is also matched against near misses, so "toyota" does not drag in "Toyohara".
 */
export function planQuery(query: string, corpus: readonly Prepared[]): Token[] {
  return tokenize(query).map((text) => ({ text, loose: !corpus.some((entry) => entry.folded.includes(text)) }));
}

/** Match one search term against a prepared text: whole word, start of a word, inside a word, or a near miss. */
export function matchToken({ text: token, loose }: Token, text: Prepared): number {
  if (!text.folded.includes(token)) {
    const edits = loose ? editsFor(token) : 0;
    if (!edits) return 0;
    // Compare with whole words, and with the start of longer ones so a typo still finds a longer word.
    for (const word of text.words) {
      if (word[0] !== token[0]) continue; // typos rarely change the first letter; this also keeps it fast
      if (withinEdits(token, word, edits) || (word.length > token.length && withinEdits(token, word.slice(0, token.length), edits))) {
        return MATCH.near;
      }
    }
    return 0;
  }
  let best: number = MATCH.inside;
  for (const word of text.words) {
    if (word === token) return MATCH.word;
    if (word.startsWith(token)) best = MATCH.prefix;
  }
  return best;
}

/** Whether every search term matches the text. */
export function matchesAll(tokens: readonly Token[], text: Prepared): boolean {
  return tokens.every((token) => matchToken(token, text) > 0);
}
