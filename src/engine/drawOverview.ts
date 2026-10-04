import { MONTHS_SHORT, dayOf, yearLabel, yearOf } from '../lib/time';
import { clamp } from './config';
import { hatch, setFont } from './palette';
import type { Frame } from './types';

/** Strip width reserved for the undated zone, when the timeline has one. */
const UNDATED_STRIP = 44;
const RIGHT_PAD = 6;
/** Least space between two date labels on the strip. */
const LABEL_PITCH = 54;

/** Maps between the overview strip and the main view. */
export interface OverviewScale {
  /** Strip x of a day number. */
  xOfDay(day: number): number;
  /** Strip x of a stage x. */
  xOfScreen(screenX: number): number;
  /** Position, in pixels from the start of the axis at the current zoom, of a strip x. */
  worldOfX(stripX: number): number;
}

type ScaleFrame = Pick<Frame, 'ppd' | 'x0' | 'undatedWidth' | 'domainStart' | 'domainEnd'>;

export function overviewScale(stripWidth: number, f: ScaleFrame): OverviewScale {
  const span = f.domainEnd - f.domainStart;
  const zone = f.undatedWidth > 0 ? UNDATED_STRIP : RIGHT_PAD;
  const usable = stripWidth - zone - RIGHT_PAD;
  const xOfDay = (day: number) => zone + ((day - f.domainStart) / span) * usable;
  return {
    xOfDay,
    xOfScreen(screenX) {
      if (screenX < f.x0 && f.undatedWidth > 0) {
        return clamp((screenX - (f.x0 - f.undatedWidth)) / f.undatedWidth, 0, 1) * zone;
      }
      return xOfDay(clamp(f.domainStart + (screenX - f.x0) / f.ppd, f.domainStart, f.domainEnd));
    },
    worldOfX(stripX) {
      if (stripX < zone && f.undatedWidth > 0) return -f.undatedWidth + (stripX / zone) * f.undatedWidth;
      return clamp((stripX - zone) / usable, 0, 1) * span * f.ppd;
    },
  };
}

/** Years between labelled lines: the smallest round step that keeps the labels apart. */
function yearStep(pixelsPerYear: number): number {
  for (const step of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]) if (step * pixelsPerYear >= LABEL_PITCH) return step;
  return 2000;
}

/** Draw the whole timeline in miniature: one row per category, plus the viewport window. */
export function drawOverview(c: CanvasRenderingContext2D, f: Frame, stripWidth: number, stripHeight: number): void {
  const { palette, world } = f;
  const scale = overviewScale(stripWidth, f);
  const MW = stripWidth;
  const MH = stripHeight;

  c.clearRect(0, 0, MW, MH);
  if (f.undatedWidth > 0) hatch(c, palette, 0, UNDATED_STRIP, 0, MH);
  for (const gap of world.gaps) hatch(c, palette, scale.xOfDay(gap.from), scale.xOfDay(gap.to) - scale.xOfDay(gap.from), 0, MH);

  // Date lines and labels: years, or months when the whole axis is under two years.
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  setFont(c, palette, 9.5, 'mono');
  const line = (day: number, label: string) => {
    const x = scale.xOfDay(day);
    c.strokeStyle = palette.line;
    c.beginPath();
    c.moveTo(Math.round(x) + 0.5, 0);
    c.lineTo(Math.round(x) + 0.5, MH);
    c.stroke();
    if (label) {
      c.fillStyle = palette.ink3;
      c.fillText(label, x + 3, MH - 5);
    }
  };
  const firstYear = yearOf(f.domainStart);
  const lastYear = yearOf(f.domainEnd - 1);
  const pixelsPerYear = (scale.xOfDay(f.domainStart + 365) - scale.xOfDay(f.domainStart)) || 1;
  if (pixelsPerYear > LABEL_PITCH * 6) {
    const every = pixelsPerYear / 12 >= LABEL_PITCH ? 1 : pixelsPerYear / 4 >= LABEL_PITCH ? 3 : 6;
    for (let y = firstYear; y <= lastYear; y++) {
      for (let m = 0; m < 12; m += every) {
        const day = dayOf(y, m);
        if (day >= f.domainStart && day < f.domainEnd) line(day, m === 0 ? yearLabel(y) : MONTHS_SHORT[m]);
      }
    }
  } else {
    const step = yearStep(pixelsPerYear);
    for (let y = Math.ceil(firstYear / step) * step; y <= lastYear; y += step) {
      line(Math.max(f.domainStart, dayOf(y, 0)), yearLabel(y));
    }
  }

  // Events, one row per category.
  const top = 7;
  const rows = world.categories;
  const rowH = (MH - 24) / Math.max(1, rows.length);
  const undatedPitch = (UNDATED_STRIP - 10) / Math.max(1, world.undatedCount - 1);
  for (const item of f.items) {
    if (!item.visible) continue;
    const { ev } = item;
    const row = Math.max(0, rows.findIndex((cat) => cat.id === ev.category));
    const x = ev.slot != null ? 5 + ev.slot * undatedPitch : scale.xOfDay(ev.day ?? f.domainStart);
    const w = ev.day != null && ev.endDay != null ? Math.max(3, scale.xOfDay(ev.endDay) - scale.xOfDay(ev.day)) : 3;
    c.fillStyle = palette.hue[ev.hue];
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
