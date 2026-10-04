import { CATEGORIES } from '../data/categories';
import { DOMAIN_END, DOMAIN_START, GAP_END, GAP_START, dateOf, dayOf } from '../lib/time';
import { clamp } from './config';
import { hatch, setFont } from './palette';
import type { Frame } from './types';

/** Strip width reserved for the backstory zone. */
const BACKSTORY_STRIP = 44;
const RIGHT_PAD = 6;

/** Maps between the overview strip and the main view. */
export interface OverviewScale {
  /** Strip x of a day number. */
  xOfDay(day: number): number;
  /** Strip x of a stage x. */
  xOfScreen(screenX: number): number;
  /** Position, in pixels from the start of the axis at the current zoom, of a strip x. */
  worldOfX(stripX: number): number;
}

export function overviewScale(stripWidth: number, f: Pick<Frame, 'ppd' | 'x0' | 'backstoryWidth'>): OverviewScale {
  const span = DOMAIN_END - DOMAIN_START;
  const usable = stripWidth - BACKSTORY_STRIP - RIGHT_PAD;
  const xOfDay = (day: number) => BACKSTORY_STRIP + ((day - DOMAIN_START) / span) * usable;
  return {
    xOfDay,
    xOfScreen(screenX) {
      if (screenX < f.x0) {
        return clamp((screenX - (f.x0 - f.backstoryWidth)) / f.backstoryWidth, 0, 1) * BACKSTORY_STRIP;
      }
      return xOfDay(clamp(DOMAIN_START + (screenX - f.x0) / f.ppd, DOMAIN_START, DOMAIN_END));
    },
    worldOfX(stripX) {
      if (stripX < BACKSTORY_STRIP) return -f.backstoryWidth + (stripX / BACKSTORY_STRIP) * f.backstoryWidth;
      return clamp((stripX - BACKSTORY_STRIP) / usable, 0, 1) * span * f.ppd;
    },
  };
}

/** Draw the whole timeline in miniature: one row per category, plus the viewport window. */
export function drawOverview(c: CanvasRenderingContext2D, f: Frame, stripWidth: number, stripHeight: number): void {
  const { palette } = f;
  const scale = overviewScale(stripWidth, f);
  const MW = stripWidth;
  const MH = stripHeight;

  c.clearRect(0, 0, MW, MH);
  hatch(c, palette, 0, BACKSTORY_STRIP, 0, MH);
  hatch(c, palette, scale.xOfDay(GAP_START), scale.xOfDay(GAP_END) - scale.xOfDay(GAP_START), 0, MH);

  // Year lines and labels.
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  setFont(c, palette, 9.5, 'mono');
  const firstYear = dateOf(DOMAIN_START).getUTCFullYear();
  const lastYear = dateOf(DOMAIN_END - 1).getUTCFullYear();
  for (let y = firstYear; y <= lastYear; y++) {
    const x = scale.xOfDay(dayOf(y, 0));
    c.strokeStyle = palette.line;
    c.beginPath();
    c.moveTo(Math.round(x) + 0.5, 0);
    c.lineTo(Math.round(x) + 0.5, MH);
    c.stroke();
    if (MW > 700 || y % 2 === 0) {
      c.fillStyle = palette.ink3;
      c.fillText(MW > 520 ? String(y) : `'${String(y).slice(2)}`, x + 3, MH - 5);
    }
  }

  // Events, one row per category.
  const top = 7;
  const rowH = (MH - 24) / CATEGORIES.length;
  const backstoryCount = f.items.filter((it) => it.ev.backstoryOrder != null).length;
  const backstoryPitch = (BACKSTORY_STRIP - 10) / Math.max(1, backstoryCount - 1);
  for (const item of f.items) {
    if (!item.visible) continue;
    const { ev } = item;
    const row = CATEGORIES.findIndex((cat) => cat.id === ev.category);
    const x = ev.backstoryOrder != null ? 5 + (ev.backstoryOrder - 1) * backstoryPitch : scale.xOfDay(ev.day ?? DOMAIN_START);
    const w = ev.day != null && ev.endDay != null ? Math.max(3, scale.xOfDay(ev.endDay) - scale.xOfDay(ev.day)) : 3;
    c.fillStyle = palette.category[ev.category];
    c.globalAlpha = ev.id === f.selectedId ? 1 : 0.85;
    c.beginPath();
    c.roundRect(x - 1.5, top + row * rowH, w, Math.max(3, rowH - 1.5), 1.5);
    c.fill();
    c.globalAlpha = 1;
  }

  // Viewport window.
  const a = scale.xOfScreen(0);
  const w = Math.max(6, scale.xOfScreen(f.width) - a);
  c.fillStyle = palette.accent;
  c.globalAlpha = 0.12;
  c.beginPath();
  c.roundRect(a, 2, w, MH - 4, 6);
  c.fill();
  c.globalAlpha = 1;
  c.strokeStyle = palette.accent;
  c.lineWidth = 1.5;
  c.beginPath();
  c.roundRect(a + 0.75, 2.75, w - 1.5, MH - 5.5, 6);
  c.stroke();
  c.lineWidth = 1;
}
