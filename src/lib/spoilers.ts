/**
 * Reading-progress guard.
 *
 * Data text may carry markers of the form `{v3}`: everything after one, up to the next marker,
 * is shown only to a reader who has reached that volume. `{v1}` returns to text anyone may see.
 *
 *   'Died by apparent suicide.{v2} Volume 2 reveals who pushed him to it.'
 *
 * Markers are allowed in the long text fields only (see data/validate.ts); titles and briefs,
 * which the timeline engine draws, must be safe for the volume their event belongs to.
 */

/** Last volume the data covers. A reader at this volume sees everything. */
export const LAST_VOLUME = 5;

const MARKER = /\{v(\d)\}/g;

/** Whether a text carries spoiler markers. */
export const hasMarkers = (text: string) => text.includes('{v');

/** The part of a text that a reader who has finished volume `max` may see, with the markers removed. */
export function reveal(text: string, max: number): string {
  if (!hasMarkers(text)) return text;
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

/** `reveal` over a list, dropping entries that are hidden entirely. */
export function revealAll(texts: readonly string[] | undefined, max: number): string[] {
  return (texts ?? []).map((text) => reveal(text, max)).filter(Boolean);
}

const STORAGE_KEY = 'mv-progress';

const clampVolume = (value: number) => Math.max(1, Math.min(LAST_VOLUME, Math.round(value)));

/** The reader's saved progress; everything, if none is saved or storage is unavailable. */
export function loadProgress(): number {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    return saved >= 1 ? clampVolume(saved) : LAST_VOLUME;
  } catch {
    return LAST_VOLUME;
  }
}

export function saveProgress(volume: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(clampVolume(volume)));
  } catch {
    // Private windows and sandboxed frames may refuse storage; the setting then lasts for the visit.
  }
}
