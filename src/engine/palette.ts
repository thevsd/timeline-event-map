import { HUES, type Hue } from '../model/schema';

/** CSS tokens resolved to concrete values, for canvas drawing. */
export interface Palette {
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  lineStrong: string;
  stage: string;
  surface: string;
  accent: string;
  hatch: string;
  fontMono: string;
  fontBody: string;
  fontDisplay: string;
  /** The colours authors pick from, for categories, lane kinds and groups. */
  hue: Record<Hue, string>;
}

/** Read the current theme's tokens from :root. Call again when the theme or fonts change. */
export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    ink: token('--ink'),
    ink2: token('--ink-2'),
    ink3: token('--ink-3'),
    line: token('--line'),
    lineStrong: token('--line-strong'),
    stage: token('--stage'),
    surface: token('--surface'),
    accent: token('--accent'),
    hatch: token('--hatch'),
    fontMono: token('--font-mono'),
    fontBody: token('--font-body'),
    fontDisplay: token('--font-display'),
    hue: Object.fromEntries(HUES.map((hue) => [hue, token(`--hue-${hue}`)])) as Record<Hue, string>,
  };
}

export type FontKind = 'mono' | 'body' | 'display';

export function setFont(c: CanvasRenderingContext2D, palette: Palette, px: number, kind: FontKind, weight = 500): void {
  const family = kind === 'mono' ? palette.fontMono : kind === 'display' ? palette.fontDisplay : palette.fontBody;
  c.font = `${weight} ${px}px ${family}`;
}

/** Diagonal hatching, used for zones that are not to scale or not yet mapped. */
export function hatch(c: CanvasRenderingContext2D, palette: Palette, x: number, w: number, y: number, h: number): void {
  if (w <= 0) return;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.strokeStyle = palette.hatch;
  c.lineWidth = 6;
  for (let k = x - h; k < x + w + h; k += 18) {
    c.beginPath();
    c.moveTo(k, y + h);
    c.lineTo(k + h, y);
    c.stroke();
  }
  c.restore();
}
