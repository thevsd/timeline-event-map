import { BADGE, GAP_X, GAP_Y, type Tier, type TierSizes } from './config';

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
  /** Index of the cluster the card was folded into, or -1 if it has a slot of its own. */
  cluster: number;
}

/** A "+N more" badge standing in for cards that did not fit. */
export interface Cluster {
  x: number;
  y: number;
  /** Indices into the packed items. */
  members: number[];
}

export interface Packing {
  /** One placement per item, in the same order. */
  placements: Placement[];
  clusters: Cluster[];
}

const ORDER: Tier[] = ['l', 'm', 's'];

/**
 * Choose a size and a vertical slot for every card.
 *
 * Greedy: each card tries illustrated, then medium, then title-only, and keeps the first size
 * that fits within `availableHeight` while leaving a chip-height lane for every neighbour not
 * yet placed. Dense stretches therefore collapse to title-only chips; sparse ones get pictures.
 *
 * If even the chips do not fit, the cards are packed again with the bottom row kept free, and
 * the ones left over are folded into "+N more" badges on that row.
 *
 * @param items Cards sorted by `x`.
 */
export function packCards(items: readonly LayoutItem[], tiers: TierSizes, availableHeight: number): Packing {
  const all = pack(items, tiers, availableHeight, false);
  if (!all.overflow.length) return { placements: all.placements, clusters: [] };

  const badgeY = availableHeight - BADGE.h;
  const { placements, overflow } = pack(items, tiers, badgeY - GAP_Y, true);

  // Group the leftovers, in x order, into badges that do not overlap each other.
  const clusters: Cluster[] = [];
  for (const i of overflow.sort((a, b) => items[a].x - items[b].x)) {
    let cluster = clusters[clusters.length - 1];
    if (!cluster || items[i].x >= cluster.x + BADGE.w + GAP_X) {
      cluster = { x: items[i].x, y: badgeY, members: [] };
      clusters.push(cluster);
    }
    cluster.members.push(i);
    placements[i] = { tier: 's', y: badgeY, width: BADGE.w, cluster: clusters.length - 1 };
  }
  return { placements, clusters };
}

/**
 * One packing pass.
 * @param setAside Leave out cards that end below `height` instead of placing them there.
 * @returns The placements, and the indices of the cards that did not fit.
 */
function pack(
  items: readonly LayoutItem[],
  tiers: TierSizes,
  height: number,
  setAside: boolean,
): { placements: Placement[]; overflow: number[] } {
  const n = items.length;
  const placements = new Array<Placement>(n);
  const overflow: number[] = [];
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

      if (y + h + lanes * chipH <= height) break; // fits; otherwise try the next size down
    }

    done[i] = true;
    if (y + h > height) {
      overflow.push(i);
      if (setAside) continue;
    }
    placed.push({ x, w, y, h });
    placements[i] = { tier, y, width: w, cluster: -1 };
  }
  return { placements, overflow };
}
