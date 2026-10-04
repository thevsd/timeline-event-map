/**
 * Reading-progress guard.
 *
 * A timeline may be split into parts (volumes, seasons, acts). A reader who has only reached
 * part N is shown nothing from later parts. Whole events are hidden by their `part`; inside a
 * text that belongs to an earlier part, a marker hides the rest:
 *
 *   'Died by apparent suicide.{p2} Part 2 reveals who pushed him to it.'
 *
 * Everything after `{p2}`, up to the next marker, is shown only from part 2 on, and `{p1}`
 * returns to text anyone may see. `{v2}` is accepted as another spelling. Markers work in the
 * long texts (sections, bios, summaries of threads, lane notes, definitions), not in titles or
 * event summaries, which the timeline draws as they are.
 */

const MARKER = /\{[pv](\d+)\}/g;
const HAS_MARKER = /\{[pv]\d+\}/;

/** The portion of a text that a reader who has finished part `max` may see, with the markers removed. */
export function reveal(text: string, max: number): string {
  if (!HAS_MARKER.test(text)) return text;
  let out = '';
  let level = 0;
  let from = 0;
  for (const match of text.matchAll(MARKER)) {
    if (level <= max) out += text.slice(from, match.index);
    level = Number(match[1]);
    from = match.index + match[0].length;
  }
  if (level <= max) out += text.slice(from);
  return out.replace(/\s{2,}/g, ' ').trim();
}

/** Progress is remembered per timeline, by title. */
const storageKey = (title: string) => `timeline-progress:${title}`;

/** The part the reader saved as their progress; null (read everything) if none is saved or storage is unavailable. */
export function loadProgress(title: string): number | null {
  try {
    const saved = Number(window.localStorage.getItem(storageKey(title)));
    return saved >= 1 ? Math.round(saved) : null;
  } catch {
    return null;
  }
}

/** Remember the reader's progress; null forgets it, which means "everything", however many parts are added later. */
export function saveProgress(title: string, part: number | null): void {
  try {
    if (part == null) window.localStorage.removeItem(storageKey(title));
    else window.localStorage.setItem(storageKey(title), String(part));
  } catch {
    // Private windows and sandboxed frames may refuse storage; the setting then lasts for the visit.
  }
}
