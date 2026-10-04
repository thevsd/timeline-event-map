import { GAP_X, GAP_Y, type Tier, type TierSizes } from './config';

export interface LayoutItem {
  /** Left edge, in any consistent horizontal unit. */
  x: number;
  /** Width of the period the event spans; 0 for a point event. */
  spanWidth: number;
  /** Placed before the others, so it gets first claim on the large sizes. */
  marquee: boolean;
}

export interface Placement {
  tier: Tier;
  y: number;
  /** Reserved width: the card, or the whole span if that is wider. */
  width: number;
}

const ORDER: Tier[] = ['l', 'm', 's'];

/**
 * Choose a size and a vertical slot for every card.
 *
 * Greedy: each card tries illustrated, then medium, then title-only, and keeps the first size
 * that fits within `availableHeight` while leaving a chip-height lane for every neighbour not
 * yet placed. Dense stretches therefore collapse to title-only chips; sparse ones get pictures.
 *
 * @param items Cards sorted by `x`.
 * @returns One placement per item, in the same order.
 */
export function packCards(items: readonly LayoutItem[], tiers: TierSizes, availableHeight: number): Placement[] {
  const n = items.length;
  const result = new Array<Placement>(n);
  const placed: { x: number; w: number; y: number; h: number }[] = [];
  const done = new Array<boolean>(n).fill(false);
  const chipW = tiers.s.w + GAP_X;
  const chipH = tiers.s.h + GAP_Y;

  // Marquee items first, each group in x order.
  const sequence = [
    ...items.map((_, i) => i).filter((i) => items[i].marquee),
    ...items.map((_, i) => i).filter((i) => !items[i].marquee),
  ];

  for (const i of sequence) {
    const { x, spanWidth } = items[i];
    let tier: Tier = 's';
    let w = 0;
    let h = 0;
    let y = 0;

    for (const candidate of ORDER) {
      tier = candidate;
      h = tiers[tier].h;
      w = Math.max(tiers[tier].w, spanWidth); // a span reserves its whole range

      // Lowest free slot among the rectangles that overlap horizontally.
      const hits = placed.filter((p) => p.x < x + w + GAP_X && x < p.x + p.w + GAP_X).sort((a, b) => a.y - b.y);
      y = 0;
      for (const p of hits) {
        if (y + h + GAP_Y <= p.y) break;
        if (p.y + p.h + GAP_Y > y) y = p.y + p.h + GAP_Y;
      }

      // Lanes the unplaced neighbours will need under this card as title-only chips:
      // the deepest overlap among their chip intervals.
      const pending: number[] = [];
      for (let j = 0; j < n; j++) {
        if (j !== i && !done[j] && items[j].x > x - chipW && items[j].x < x + w + GAP_X) pending.push(items[j].x);
      }
      let lanes = 0;
      for (const a of pending) {
        let depth = 0;
        for (const b of pending) if (b <= a && a < b + chipW) depth++;
        if (depth > lanes) lanes = depth;
      }

      if (y + h + lanes * chipH <= availableHeight) break; // fits; otherwise try the next size down
    }

    placed.push({ x, w, y, h });
    done[i] = true;
    result[i] = { tier, y, width: w };
  }
  return result;
}
