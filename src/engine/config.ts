/** Layout and zoom constants shared by the engine modules. */

/** Card sizes: `s` title only, `m` title and date, `l` illustrated. */
export type Tier = 's' | 'm' | 'l';
export type TierSizes = Record<Tier, { w: number; h: number }>;

// Must match the tier sizes in app.css.
export const TIERS: TierSizes = { s: { w: 172, h: 28 }, m: { w: 228, h: 64 }, l: { w: 258, h: 230 } };
export const TIERS_COMPACT: TierSizes = { s: { w: 156, h: 28 }, m: { w: 200, h: 64 }, l: { w: 232, h: 230 } };
/** Stage width below which the compact sizes apply. */
export const COMPACT_WIDTH = 560;

/** Height of the axis header. */
export const AXIS_HEIGHT = 62;
/** Height of the real-history lane, between the header and the cards. */
export const LANE_HEIGHT = 36;
/** Space between the top of the card viewport and the first row of cards. */
export const CARDS_PAD = 14;
export const BOTTOM_PAD = 18;
/** "+N more" badge that stands in for cards with no room. Must match .badge in app.css. */
export const BADGE = { w: 112, h: 26 };
/** Gaps between cards. */
export const GAP_X = 8;
export const GAP_Y = 6;

/** Zoom is measured in pixels per day. */
export const PPD_MAX = 90;
export const PPD_MIN = 0.62;

/** Backstory events sit left of the axis at a fixed pixel pitch (not to scale). */
export const BACKSTORY_STEP = 176;
export const BACKSTORY_PAD = 26;

/** Tick level shown on the axis. */
export type ZoomLevel = 'quarters' | 'months' | 'weeks' | 'days';

export function levelOf(ppd: number): ZoomLevel {
  if (ppd < 1.45) return 'quarters';
  if (ppd < 9) return 'months';
  if (ppd < 30) return 'weeks';
  return 'days';
}

/** Zoom each scale button jumps to. */
export const LEVEL_PPD: Record<ZoomLevel, number> = { quarters: 0.7, months: 3.1, weeks: 14, days: 54 };

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Smoothstep: 0 below `a`, 1 above `b`, eased in between. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
