import { MONTHS_LONG, MONTHS_SHORT, WEEKDAYS, dateOf, dayOf, yearLabel, yearOf } from '../lib/time';
import { AXIS_HEIGHT, clamp, smoothstep } from './config';
import { hatch, setFont } from './palette';
import type { Frame } from './types';

/**
 * Draw the stage canvas: axis header, gridlines, zone hatching, event markers and the date bubble.
 *
 * Six tick levels exist (decades, years, quarters, months, weeks, days). Each has an opacity that
 * is a smooth function of zoom, so neighbouring levels crossfade instead of snapping.
 */
export function drawAxis(c: CanvasRenderingContext2D, f: Frame): void {
  const { width: W, height: H, ppd, x0, palette, world, domainStart: DOMAIN_START, domainEnd: DOMAIN_END } = f;
  const xOf = (day: number) => x0 + (day - DOMAIN_START) * ppd;

  c.clearRect(0, 0, W, H);

  // Visible day range, clipped to the domain.
  const dayL = Math.max(DOMAIN_START, Math.floor(DOMAIN_START - x0 / ppd) - 2);
  const dayR = Math.min(DOMAIN_END, Math.ceil(DOMAIN_START + (W - x0) / ppd) + 2);

  // Zones: undated events, gaps the timeline does not cover, past the end.
  hatch(c, palette, x0 - f.undatedWidth, f.undatedWidth, 0, H);
  for (const gap of world.gaps) hatch(c, palette, xOf(gap.from), (gap.to - gap.from) * ppd, AXIS_HEIGHT, H - AXIS_HEIGHT);
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

  // Second lane: a band under the header with its own baseline.
  if (f.laneHeight > 0) {
    c.fillStyle = palette.stage;
    c.globalAlpha = 0.8;
    c.fillRect(0, AXIS_HEIGHT + 1, W, f.laneHeight);
    c.globalAlpha = 1;
    c.strokeStyle = palette.line;
    c.beginPath();
    c.moveTo(0, AXIS_HEIGHT + f.laneHeight + 0.5);
    c.lineTo(W, AXIS_HEIGHT + f.laneHeight + 0.5);
    c.stroke();
  }

  // Opacity per tick level.
  const aDecade = 1 - smoothstep(0.038, 0.052, ppd);
  const aYearMinor = smoothstep(0.038, 0.052, ppd) * (1 - smoothstep(0.36, 0.48, ppd));
  const aQuarter = smoothstep(0.36, 0.48, ppd) * (1 - smoothstep(1.2, 1.7, ppd));
  const aMonth = smoothstep(1.2, 1.7, ppd) * (1 - smoothstep(7.5, 10.5, ppd));
  const aWeek = smoothstep(7.5, 10.5, ppd) * (1 - smoothstep(25, 34, ppd));
  const aDay = smoothstep(25, 34, ppd);
  // The major row shows centuries, decades, years, then "Month Year" once zoomed in.
  const aYear = smoothstep(0.36, 0.48, ppd) * (1 - smoothstep(7.5, 10.5, ppd));
  const aMonthMajor = smoothstep(7.5, 10.5, ppd);
  /** Label of a decade or century: "1990s"; the year it starts in for the earliest ones, where "0s" would not read. */
  const era = (year: number) => (year >= 100 ? `${year}s` : yearLabel(year === 0 ? 1 : year));

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
    const yearL = yearOf(dayL);
    const yearR = yearOf(dayR);

    // Minor ticks: decades and years. Labels thin out as the ticks crowd.
    if (aDecade > 0.01) {
      const px = 3652.5 * ppd;
      const every = px >= 46 ? 10 : px >= 23 ? 20 : px >= 9 ? 50 : 100;
      for (let y = Math.floor(yearL / 10) * 10; y <= yearR; y += 10) {
        const x = xOf(dayOf(y, 0));
        if (px >= 7 || y % every === 0) grid(x, aDecade * 0.9, false);
        if (y % every === 0 && x > -80) minorLabel(x, yearLabel(y), aDecade);
      }
    }
    if (aYearMinor > 0.01) {
      const px = 365.25 * ppd;
      const every = px >= 44 ? 1 : px >= 22 ? 2 : 5;
      for (let y = yearL; y <= yearR; y++) {
        const x = xOf(dayOf(y, 0));
        grid(x, aYearMinor * 0.9, false);
        if (y % every === 0 && x > -80) minorLabel(x, yearLabel(y), aYearMinor);
      }
    }

    // Minor ticks: quarters and months.
    for (let y = yearL; (aQuarter > 0.01 || aMonth > 0.01) && y <= yearR; y++) {
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
    if (aDecade > 0.01) {
      for (let y = Math.floor(yearL / 100) * 100; y <= yearR; y += 100) {
        major(Math.max(DOMAIN_START, dayOf(y, 0)), dayOf(y + 100, 0), era(y), aDecade);
      }
    }
    if (aYearMinor > 0.01) {
      for (let y = Math.floor(yearL / 10) * 10; y <= yearR; y += 10) {
        major(Math.max(DOMAIN_START, dayOf(y, 0)), dayOf(y + 10, 0), era(y), aYearMinor);
      }
    }
    for (let y = yearL; (aYear > 0.01 || aMonthMajor > 0.01) && y <= yearR; y++) {
      if (aYear > 0.01) major(Math.max(DOMAIN_START, dayOf(y, 0)), dayOf(y + 1, 0), yearLabel(y), aYear);
      if (aMonthMajor > 0.01) {
        for (let m = 0; m < 12; m++) {
          const a = dayOf(y, m);
          const b = dayOf(y, m + 1);
          if (b < dayL || a > dayR) continue;
          major(a, b, `${MONTHS_LONG[m]} ${yearLabel(y)}`, aMonthMajor);
        }
      }
    }
  }

  // Caption: undated zone.
  if (f.undatedWidth > 0 && x0 > 0) {
    const lx = Math.min(Math.max(x0 - f.undatedWidth + 12, 8), x0 - 150);
    if (lx + 140 > 0) {
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillStyle = palette.ink;
      setFont(c, palette, 13.5, 'display', 700);
      c.fillText(world.doc.undated?.label ?? 'Undated', lx, 17);
      c.fillStyle = palette.ink3;
      setFont(c, palette, 11.5, 'mono');
      c.fillText(world.doc.undated?.note ?? 'not to scale', lx, 43);
    }
  }

  // Captions: gaps.
  for (const gap of world.gaps) {
    const gapL = Math.max(xOf(gap.from), 0);
    const gapR = Math.min(xOf(gap.to), W);
    if (gapR - gapL < 150 || !(gap.label || gap.note)) continue;
    const cx = (gapL + gapR) / 2;
    const cy = Math.min(H - 60, AXIS_HEIGHT + 120);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = palette.ink3;
    setFont(c, palette, 12, 'body', 600);
    c.fillText(gap.label, cx, cy);
    setFont(c, palette, 11, 'body');
    c.fillText(gap.note, cx, cy + 17);
  }

  // Countdown marker.
  const xCountdown = world.countdown ? xOf(world.countdown.day) : -1000;
  if (xCountdown > -40 && xCountdown < W + 40) {
    c.strokeStyle = palette.accent;
    c.lineWidth = 1.5;
    c.setLineDash([5, 5]);
    c.beginPath();
    c.moveTo(xCountdown, AXIS_HEIGHT);
    c.lineTo(xCountdown, H);
    c.stroke();
    c.setLineDash([]);
    c.lineWidth = 1;
  }

  // Guide line under the hovered or selected lane entry, so its date reads against the cards.
  if (f.laneGuideX != null && f.laneHeight > 0) {
    c.strokeStyle = palette.ink2;
    c.globalAlpha = 0.7;
    c.setLineDash([2, 4]);
    c.beginPath();
    c.moveTo(Math.round(f.laneGuideX) + 0.5, AXIS_HEIGHT + f.laneHeight);
    c.lineTo(Math.round(f.laneGuideX) + 0.5, H);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
  }

  // Event markers; the hovered or selected one gets a guide line down to its card.
  for (const item of f.items) {
    if (item.off || !item.visible) continue;
    const x = item.sx;
    const id = item.ev.id;
    const active = id === f.selectedId || id === f.hoveredId;
    const colour = palette.hue[item.ev.hue];
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
      c.lineTo(x + 0.5, f.cardsTop + item.y);
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
