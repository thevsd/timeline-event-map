import { MOTIFS, type MotifName } from './motifs';

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

/**
 * SVG markup for one illustration.
 * The motif is centred in a 400×160 viewBox so it survives cropping at any card aspect ratio.
 * @param seed Usually the event id; fixes the moon and petal positions.
 */
export function illustrationSvg(motif: MotifName, seed: string): string {
  const random = seededRandom(hash(seed));
  const n = (x: number) => x.toFixed(0);

  // A pale moon in the left or right third.
  const mx = 40 + random() * 70 + (random() > 0.5 ? 240 : 0);
  const my = 26 + random() * 22;
  const mr = 15 + random() * 10;
  let deco = `<circle class="c" cx="${n(mx)}" cy="${n(my)}" r="${n(mr)}"/>`;

  // A few drifting petals, kept clear of the pictogram in the centre.
  for (let i = 0; i < 7; i++) {
    const px = random() * 400;
    const py = random() * 150;
    const rot = random() * 180;
    if (px > 128 && px < 272 && py > 30) continue;
    deco += `<ellipse class="b" cx="${n(px)}" cy="${n(py)}" rx="5" ry="2.6" transform="rotate(${n(rot)} ${n(px)} ${n(py)})"/>`;
  }

  // The "war" motif draws its own horizon.
  const ground = motif === 'war' ? '' : '<path class="g" d="M0 144q100-12 200-3t200-6v25H0z"/>';

  return (
    '<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    `${deco}${ground}<g transform="translate(40 0)">${MOTIFS[motif]}</g></svg>`
  );
}
