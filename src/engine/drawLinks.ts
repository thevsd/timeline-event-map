import { setFont, type Palette } from './palette';
import type { Box } from './types';

/** What the overlay shows for one frame. Boxes are in card-viewport coordinates. */
export interface LinkFrame {
  width: number;
  height: number;
  palette: Palette;
  /** The selected card; null when nothing is selected or it is filtered out. */
  from: Box | null;
  /** Cards the selected event links to. */
  outgoing: Box[];
  /** Cards that link to the selected event without being linked back. */
  incoming: Box[];
  /** Real-history entries tied to a card: the entry's x in the lane above, and the card. */
  realTies: { x: number; to: Box }[];
  /** Cards of the active thread, in story order. */
  path: Box[];
}

interface Point {
  x: number;
  y: number;
}

/**
 * Route from one box to another: out of the facing sides when the boxes sit side by side,
 * or straight down (or up) through their shared columns when one is above the other.
 * @returns The four control points of a cubic Bézier.
 */
function route(a: Box, b: Box): [Point, Point, Point, Point] {
  const ay = a.y + a.h / 2;
  const by = b.y + b.h / 2;
  if (b.x >= a.x + a.w) {
    const bend = Math.max(36, (b.x - a.x - a.w) * 0.45);
    return [{ x: a.x + a.w, y: ay }, { x: a.x + a.w + bend, y: ay }, { x: b.x - bend, y: by }, { x: b.x, y: by }];
  }
  if (b.x + b.w <= a.x) {
    const bend = Math.max(36, (a.x - b.x - b.w) * 0.45);
    return [{ x: a.x, y: ay }, { x: a.x - bend, y: ay }, { x: b.x + b.w + bend, y: by }, { x: b.x + b.w, y: by }];
  }
  const x = (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2;
  const down = b.y >= a.y;
  const from = down ? a.y + a.h : a.y;
  const to = down ? b.y : b.y + b.h;
  const bend = (to - from) * 0.4;
  return [{ x, y: from }, { x, y: from + bend }, { x, y: to - bend }, { x, y: to }];
}

function curve(c: CanvasRenderingContext2D, p: [Point, Point, Point, Point]): void {
  c.beginPath();
  c.moveTo(p[0].x, p[0].y);
  c.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
  c.stroke();
}

/** Arrowhead at `tip`, pointing away from `from`. */
function arrow(c: CanvasRenderingContext2D, from: Point, tip: Point): void {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  c.save();
  c.translate(tip.x, tip.y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-8, -4);
  c.lineTo(-8, 4);
  c.closePath();
  c.fill();
  c.restore();
}

/**
 * Draw the overlay above the cards: the active thread's path, the selected event's connections,
 * and ties to the real-history lane.
 *
 * Outgoing links are solid with an arrow at the far end; incoming links are dashed with the
 * arrow at the selected card.
 */
export function drawLinks(c: CanvasRenderingContext2D, f: LinkFrame): void {
  const { palette } = f;
  c.clearRect(0, 0, f.width, f.height);
  c.lineCap = 'round';

  // Thread path: a soft line through the cards, with a numbered stop on each.
  if (f.path.length) {
    c.strokeStyle = palette.accent;
    c.lineWidth = 3;
    c.globalAlpha = 0.32;
    for (let i = 1; i < f.path.length; i++) curve(c, route(f.path[i - 1], f.path[i]));
    c.globalAlpha = 1;

    setFont(c, palette, 10, 'mono', 600);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    f.path.forEach((box, i) => {
      if (box.x > f.width + 20 || box.x + box.w < -20) return;
      c.fillStyle = palette.accent;
      c.beginPath();
      c.arc(box.x + 1, box.y + 1, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = palette.surface;
      c.fillText(String(i + 1), box.x + 1, box.y + 1.5);
    });
  }

  // Ties to the real-history lane: dotted, dropping from the lane's lower edge.
  if (f.realTies.length) {
    c.strokeStyle = palette.real;
    c.fillStyle = palette.real;
    c.lineWidth = 1.5;
    c.setLineDash([2, 5]);
    for (const tie of f.realTies) {
      const target = { x: Math.max(tie.to.x + 14, Math.min(tie.x, tie.to.x + tie.to.w - 14)), y: tie.to.y };
      const drop = Math.max(6, target.y * 0.6);
      curve(c, [{ x: tie.x, y: 0 }, { x: tie.x, y: drop }, { x: target.x, y: target.y - drop }, target]);
      c.beginPath();
      c.arc(target.x, target.y, 3, 0, Math.PI * 2);
      c.fill();
    }
    c.setLineDash([]);
  }

  // Connections of the selected event.
  if (f.from) {
    c.lineWidth = 1.75;

    c.strokeStyle = palette.ink2;
    c.fillStyle = palette.ink2;
    c.setLineDash([5, 5]);
    for (const box of f.incoming) {
      const p = route(box, f.from);
      curve(c, p);
    }
    c.setLineDash([]);
    for (const box of f.incoming) {
      const p = route(box, f.from);
      arrow(c, p[2], p[3]);
    }

    c.strokeStyle = palette.accent;
    c.fillStyle = palette.accent;
    for (const box of f.outgoing) {
      const p = route(f.from, box);
      curve(c, p);
      arrow(c, p[2], p[3]);
    }
  }
}
