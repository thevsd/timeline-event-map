import { conflict } from './library/conflict';
import { culture } from './library/culture';
import { general } from './library/general';
import { money } from './library/money';
import { nature } from './library/nature';
import { people } from './library/people';
import { power } from './library/power';
import { science } from './library/science';
import { travel } from './library/travel';

/**
 * The pictogram library.
 *
 * A pictogram is SVG drawn on a 320×160 field, centred on (160, 85) and kept between y = 20 and
 * y = 140. Colour comes from CSS: the shape classes (a, b, c, d, g, s, sd, t) are styled under
 * `.art` in app.css, so one drawing serves every colour and theme.
 *
 * To add one, add an entry to the group file it belongs to in `library/`. Its name is what an
 * event's `motif` field refers to, so names are never changed once published.
 */
export interface MotifSource {
  /** Name shown in the picker. */
  label: string;
  /** Other words the picker's search should find it by. */
  keywords: string;
  /** The drawing, as SVG elements. */
  svg: string;
  /** False for a drawing that brings its own ground; the usual one is then left out. */
  ground?: false;
}

export const MOTIF_GROUPS = [
  { id: 'general', label: 'General', motifs: general },
  { id: 'people', label: 'People and society', motifs: people },
  { id: 'power', label: 'Government and law', motifs: power },
  { id: 'conflict', label: 'Conflict', motifs: conflict },
  { id: 'money', label: 'Money and industry', motifs: money },
  { id: 'science', label: 'Science and health', motifs: science },
  { id: 'travel', label: 'Travel and places', motifs: travel },
  { id: 'nature', label: 'Nature and weather', motifs: nature },
  { id: 'culture', label: 'Culture and daily life', motifs: culture },
] as const;

export const MOTIFS = { ...general, ...people, ...power, ...conflict, ...money, ...science, ...travel, ...nature, ...culture };

export type MotifName = keyof typeof MOTIFS;

/** Drawn for an event that names no pictogram, or one that does not exist. */
export const DEFAULT_MOTIF: MotifName = 'event';

export const MOTIF_NAMES = Object.keys(MOTIFS) as MotifName[];

/** The pictogram of that name, or undefined if there is none. */
export const motifOf = (name: string | undefined): MotifSource | undefined =>
  name && Object.hasOwn(MOTIFS, name) ? (MOTIFS as Record<string, MotifSource>)[name] : undefined;
