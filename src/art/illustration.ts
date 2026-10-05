import type { ArtDoc, ArtScene } from '../model/schema';
import { DEFAULT_MOTIF, MOTIFS, motifOf, type MotifSource } from './motifs';

/** FNV-1a string hash, used to seed the decoration per event. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32: a small seeded PRNG, so an event always gets the same picture. */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (x: number) => x.toFixed(0);

/** Whether a point is clear of the pictogram in the centre of the 400×160 picture. */
const clear = (x: number, y: number) => !(x > 122 && x < 278 && y > 24);

/** A pale moon in the left or right third, and a few drifting petals. */
function petals(random: () => number): string {
  const mx = 40 + random() * 70 + (random() > 0.5 ? 240 : 0);
  const my = 26 + random() * 22;
  const mr = 15 + random() * 10;
  let out = `<circle class="c" cx="${n(mx)}" cy="${n(my)}" r="${n(mr)}"/>`;
  for (let i = 0; i < 7; i++) {
    const px = random() * 400;
    const py = random() * 150;
    const rot = random() * 180;
    if (px > 128 && px < 272 && py > 30) continue;
    out += `<ellipse class="b" cx="${n(px)}" cy="${n(py)}" rx="5" ry="2.6" transform="rotate(${n(rot)} ${n(px)} ${n(py)})"/>`;
  }
  return out;
}

/** A crescent, a few four-pointed stars and a scatter of small ones. */
function stars(random: () => number): string {
  const mx = 44 + random() * 60 + (random() > 0.5 ? 250 : 0);
  const my = 28 + random() * 16;
  let out = `<path class="b" d="M${n(mx)} ${n(my - 15)}a15 15 0 1 0 13 22 12 12 0 0 1-13-22z"/>`;
  for (let i = 0; i < 26; i++) {
    const x = random() * 400;
    const y = random() * 124;
    const size = random();
    if (!clear(x, y) || Math.hypot(x - mx, y - my) < 30) continue;
    out +=
      size > 0.8
        ? `<path class="a" d="M${n(x)} ${n(y - 7)}q1 6 7 7-6 1-7 7-1-6-7-7 6-1 7-7z"/>`
        : `<circle class="${size > 0.4 ? 'b' : 'c'}" cx="${n(x)}" cy="${n(y)}" r="${(1.2 + size * 1.6).toFixed(1)}"/>`;
  }
  return out;
}

/** A sun with a halo in one corner and clouds on both sides. */
function clouds(random: () => number): string {
  const right = random() > 0.5;
  const sx = right ? 330 + random() * 30 : 40 + random() * 30;
  const sy = 30 + random() * 10;
  let out = `<circle class="c" cx="${n(sx)}" cy="${n(sy)}" r="30"/><circle class="b" cx="${n(sx)}" cy="${n(sy)}" r="17"/>`;
  const cloud = (x: number, y: number, k: number, cls: string) =>
    `<path class="${cls}" transform="translate(${n(x)} ${n(y)}) scale(${k.toFixed(2)})" d="M-34 12a12 12 0 0 1 2-24 20 20 0 0 1 37-7 15 15 0 0 1 27 8 12 12 0 0 1-2 23z"/>`;
  // Kept to the outer thirds, clear of the pictogram.
  out += cloud(right ? 48 + random() * 26 : 326 + random() * 26, 40 + random() * 14, 1 + random() * 0.25, 'b');
  out += cloud(right ? 30 + random() * 30 : 340 + random() * 30, 94 + random() * 16, 0.6 + random() * 0.2, 'c');
  out += cloud(right ? 336 + random() * 30 : 34 + random() * 30, 86 + random() * 20, 0.7 + random() * 0.2, 'c');
  return out;
}

const SCENES: Record<ArtScene, (random: () => number) => string> = { petals, stars, clouds, plain: () => '' };

const GROUND = '<path class="g" d="M0 144q100-12 200-3t200-6v25H0z"/>';

/**
 * SVG markup for one illustration.
 * The pictogram is centred in a 400×160 viewBox so it survives cropping at any card aspect ratio.
 * @param motif Name of a pictogram; anything else, or nothing, draws the default one.
 * @param seed Usually the event id; fixes where the decoration falls.
 * @param scene What is drawn around the pictogram.
 */
export function illustrationSvg(motif: string | undefined, seed: string, scene: ArtScene = 'petals'): string {
  const shape: MotifSource = motifOf(motif) ?? MOTIFS[DEFAULT_MOTIF];
  const deco = (SCENES[scene] ?? petals)(seededRandom(hash(seed)));
  return (
    '<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    `${deco}${shape.ground === false ? '' : GROUND}<g transform="translate(40 0)">${shape.svg}</g></svg>`
  );
}

/** SVG markup for a pictogram on its own, as the picker shows it. */
export function motifSvg(motif: string): string {
  const shape: MotifSource = motifOf(motif) ?? MOTIFS[DEFAULT_MOTIF];
  return `<svg viewBox="40 12 240 136" aria-hidden="true">${shape.svg}</svg>`;
}

/** Class of the element that holds an illustration: its theme, and its colour if it has one of its own. */
export function artClass(art?: ArtDoc): string {
  return `art${art?.theme && art.theme !== 'gradient' ? ` theme-${art.theme}` : ''}${art?.color ? ` hue-${art.color}` : ''}`;
}
