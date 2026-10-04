/** A category's mark: one or two characters. Colour comes from the nearest `hue-*` class. */
export function CategoryGlyph({ glyph }: { glyph: string }) {
  return (
    <span className="glyph" aria-hidden="true">
      {glyph}
    </span>
  );
}
