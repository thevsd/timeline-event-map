import { CATEGORY_BY_ID } from '../data/categories';
import type { CategoryId } from '../data/types';

/** The category's kanji mark. Colour comes from the nearest `cat-*` class. */
export function CategoryGlyph({ category }: { category: CategoryId }) {
  return (
    <span className="glyph" aria-hidden="true">
      {CATEGORY_BY_ID[category].glyph}
    </span>
  );
}
