import type { CategoryId, Confidence, DateBasis, HistoryStatus } from './types';

export interface Category {
  id: CategoryId;
  name: string;
  /** Single kanji shown beside the colour, so identity never rests on colour alone. */
  glyph: string;
}

/** Fixed order: sets the legend order and the rows of the overview strip. */
export const CATEGORIES: readonly Category[] = [
  { id: 'finance', name: 'Finance & banking', glyph: '金' },
  { id: 'politics', name: 'Politics', glyph: '政' },
  { id: 'deals', name: 'Deals & the Keika empire', glyph: '商' },
  { id: 'world', name: 'World events', glyph: '世' },
  { id: 'personal', name: 'Runa & the Quartet', glyph: '桜' },
  { id: 'shadow', name: 'Secrets & spies', glyph: '影' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export const HISTORY_LABEL: Record<HistoryStatus, { label: string; className: string }> = {
  real: { label: 'Real history, preserved', className: 'h-real' },
  altered: { label: 'Real history, altered', className: 'h-altered' },
  fiction: { label: 'Invented for this world', className: 'h-fiction' },
  story: { label: 'Story scene', className: '' },
};

export const BASIS_LABEL: Record<DateBasis, string> = {
  text: 'Date given in the novel',
  real: 'Placed on the date of its real-world counterpart',
  estimate: 'Approximate: estimated from the chapter’s time span',
};

export const CONFIDENCE_LABEL: Record<Confidence, { label: string; className: string }> = {
  strong: { label: 'Strongly supported', className: 's' },
  plausible: { label: 'Plausible', className: 'p' },
  speculative: { label: 'Speculative', className: 'x' },
};
