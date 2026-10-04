import {
  CRASH_DAY, DOMAIN_END, DOMAIN_START, GAP_END, GAP_START,
  MONTHS_LONG, MONTHS_SHORT, WEEKDAYS, dateOf, dayOf,
} from '../lib/time';
import { AXIS_HEIGHT, CARDS_TOP, clamp, smoothstep } from './config';
import { hatch, setFont } from './palette';
import type { Frame } from './types';

/**
 * Draw the stage canvas: axis header, gridlines, zone hatching, event markers and the date bubble.
 *
 * Four tick levels exist (quarters, months, weeks, days). Each has an opacity that is a smooth
 * function of zoom, so neighbouring levels crossfade instead of snapping.
 */
export function drawAxis(c: CanvasRenderingContext2D, f: Frame): void {
  const { width: W, height: H, ppd, x0, palette } = f;
  const xOf = (day: number) => x0 + (day - DOMAIN_START) * ppd;

  c.clearRect(0, 0, W, H);

  // Visible day range, clipped to the domain.
  const dayL = Math.max(DOMAIN_START, Math.floor(DOMAIN_START - x0 / ppd) - 2);
  const dayR = Math.min(DOMAIN_END, Math.ceil(DOMAIN_START + (W - x0) / ppd) + 2);

  // Zones: backstory, unmapped gap, past the end.
  hatch(c, palette, x0 - f.backstoryWidth, f.backstoryWidth, 0, H);
  hatch(c, palette, xOf(GAP_START), (GAP_END - GAP_START) * ppd, AXIS_HEIGHT, H - AXIS_HEIGHT);
  hatch(c, palette, xOf(DOMAIN_END), W, 0, H);

  // Header background and baseline.
  c.fillStyle = palette.stage;
  c.globalAlpha = 0.92;
  c.fillRect(0, 0, W, AXIS_HEIGHT);
  c.globalAlpha = 1;
  c.strokeStyle = palette.lineStrong;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, AXIS_HEIGHT + 0.5);
  c.lineTo(W, AXIS_HEIGHT + 0.5);
  c.stroke();

  // Opacity per tick level.
  const aQuarter = 1 - smoothstep(1.2, 1.7, ppd);
  const aMonth = smoothstep(1.2, 1.7, ppd) * (1 - smoothstep(7.5, 10.5, ppd));
  const aWeek = smoothstep(7.5, 10.5, ppd) * (1 - smoothstep(25, 34, ppd));
  const aDay = smoothstep(25, 34, ppd);
  // The major row shows years, then "Month Year" once zoomed in.
  const aYear = 1 - smoothstep(7.5, 10.5, ppd);
  const aMonthMajor = smoothstep(7.5, 10.5, ppd);

  const grid = (x: number, alpha: number, strong: boolean) => {
    c.globalAlpha = alpha;
    c.strokeStyle = strong ? palette.lineStrong : palette.line;
    c.beginPath();
    c.moveTo(Math.round(x) + 0.5, strong ? 0 : 30);
    c.lineTo(Math.round(x) + 0.5, H);
    c.stroke();
    c.globalAlpha = 1;
  };

  const minorLabel = (x: number, text: string, alpha: number, sub = '') => {
    c.globalAlpha = alpha;
    c.fillStyle = palette.ink2;
    setFont(c, palette, 11.5, 'mono');
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(text, x + 6, 43);
    if (sub) {
      const offset = c.measureText(text).width + 12;
      c.fillStyle = palette.ink3;
      setFont(c, palette, 9.5, 'body', 600);
      c.fillText(sub, x + 6 + offset, 43);
    }
    c.globalAlpha = 1;
  };

  /** Major tick whose label stays pinned to the left edge while its period is on screen. */
  const major = (startDay: number, endDay: number, text: string, alpha: number) => {
    const xs = xOf(startDay);
    const xe = xOf(endDay);
    grid(xs, alpha, true);
    c.globalAlpha = alpha;
    c.fillStyle = palette.ink;
    setFont(c, palette, 13.5, 'display', 700);
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    const tw = c.measureText(text).width;
    const lx = Math.min(Math.max(xs + 7, Math.max(8, x0 + 7)), xe - tw - 10);
    if (lx + tw > 0 && lx < W && xe - xs > tw + 14) c.fillText(text, lx, 17);
    c.globalAlpha = 1;
  };

  if (dayR > dayL) {
    const yearL = dateOf(dayL).getUTCFullYear();
    const yearR = dateOf(dayR).getUTCFullYear();

    // Minor ticks: quarters and months.
    for (let y = yearL; y <= yearR; y++) {
      for (let m = 0; m < 12; m++) {
        const d = dayOf(y, m);
        if (d > dayR || d < dayL - 100) continue;
        const x = xOf(d);
        if (m % 3 === 0 && aQuarter > 0.01) {
          grid(x, aQuarter * 0.9, false);
          if (x > -80) minorLabel(x, `Q${m / 3 + 1}`, aQuarter);
        }
        if (aMonth > 0.01) {
          grid(x, aMonth * 0.9, false);
          if (x > -80) minorLabel(x, MONTHS_SHORT[m], aMonth);
        }
      }
    }

    // Minor ticks: weeks (Mondays) and days.
    if (aWeek > 0.01 || aDay > 0.01) {
      for (let d = dayL; d <= dayR; d++) {
        const x = xOf(d);
        const date = dateOf(d);
        const dom = date.getUTCDate();
        // Day 0 (1 January 1970) was a Thursday, so Mondays satisfy (d + 3) % 7 === 0.
        if (aWeek > 0.01 && (d + 3) % 7 === 0) {
          grid(x, aWeek * 0.9, false);
          minorLabel(x, String(dom), aWeek);
        }
        if (aDay > 0.01) {
          grid(x, aDay * (dom === 1 ? 1 : 0.8), false);
          minorLabel(x, String(dom), aDay, ppd > 52 ? WEEKDAYS[date.getUTCDay()] : '');
        }
      }
    }

    // Major ticks.
    for (let y = yearL; y <= yearR; y++) {
      if (aYear > 0.01) major(Math.max(DOMAIN_START, dayOf(y, 0)), dayOf(y + 1, 0), String(y), aYear);
      if (aMonthMajor > 0.01) {
        for (let m = 0; m < 12; m++) {
          const a = dayOf(y, m);
          const b = dayOf(y, m + 1);
          if (b < dayL || a > dayR) continue;
          major(a, b, `${MONTHS_LONG[m]} ${y}`, aMonthMajor);
        }
      }
    }
  }

  // Caption: backstory zone.
  if (x0 > 0) {
    const lx = Math.min(Math.max(x0 - f.backstoryWidth + 12, 8), x0 - 150);
    if (lx + 140 > 0) {
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillStyle = palette.ink;
      setFont(c, palette, 13.5, 'display', 700);
      c.fillText('Before the story', lx, 17);
      c.fillStyle = palette.ink3;
      setFont(c, palette, 11.5, 'mono');
      c.fillText('1944 – 1990 · not to scale', lx, 43);
    }
  }

  // Caption: unmapped gap.
  const gapL = Math.max(xOf(GAP_START), 0);
  const gapR = Math.min(xOf(GAP_END), W);
  if (gapR - gapL >= 150) {
    const cx = (gapL + gapR) / 2;
    const cy = Math.min(H - 60, AXIS_HEIGHT + 120);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = palette.ink3;
    setFont(c, palette, 12, 'body', 600);
    c.fillText('Summer 2003 to summer 2008', cx, cy);
    setFont(c, palette, 11, 'body');
    c.fillText('Volumes 6 onward are not mapped yet', cx, cy + 17);
  }

  // Crash marker.
  const xCrash = xOf(CRASH_DAY);
  if (xCrash > -40 && xCrash < W + 40) {
    c.strokeStyle = palette.accent;
    c.lineWidth = 1.5;
    c.setLineDash([5, 5]);
    c.beginPath();
    c.moveTo(xCrash, AXIS_HEIGHT);
    c.lineTo(xCrash, H);
    c.stroke();
    c.setLineDash([]);
    c.lineWidth = 1;
  }

  // Event markers; the hovered or selected one gets a guide line down to its card.
  for (const item of f.items) {
    if (item.off || !item.visible) continue;
    const x = item.sx;
    const id = item.ev.id;
    const active = id === f.selectedId || id === f.hoveredId;
    const colour = palette.category[item.ev.category];
    c.fillStyle = colour;
    if (item.spanWidth > 6) {
      c.globalAlpha = 0.5;
      c.fillRect(x, AXIS_HEIGHT - 6.5, item.spanWidth, 3);
      c.globalAlpha = 1;
    }
    c.beginPath();
    c.arc(x, AXIS_HEIGHT - 5, active ? 5 : 3, 0, Math.PI * 2);
    c.fill();
    if (active) {
      c.strokeStyle = palette.stage;
      c.lineWidth = 2;
      c.stroke();
      c.strokeStyle = id === f.selectedId ? palette.accent : colour;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x + 0.5, AXIS_HEIGHT);
      c.lineTo(x + 0.5, Math.max(AXIS_HEIGHT, CARDS_TOP - f.scrollY + item.y));
      c.stroke();
      c.lineWidth = 1;
    }
  }

  // Date bubble for the hovered (else selected) event.
  const focusId = f.hoveredId ?? f.selectedId;
  const focus = focusId ? f.items.find((it) => it.ev.id === focusId) : undefined;
  if (focus && !focus.off && focus.visible) {
    const text = focus.ev.when;
    setFont(c, palette, 11, 'mono', 600);
    const bw = c.measureText(text).width + 16;
    const bx = clamp(focus.sx - bw / 2, 4, W - bw - 4);
    const by = 31;
    c.fillStyle = palette.ink;
    c.beginPath();
    c.roundRect(bx, by, bw, 22, 7);
    c.fill();
    c.fillStyle = palette.stage;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, bx + bw / 2, by + 11.5);
  }
}
