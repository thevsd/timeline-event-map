/**
 * Build script: validates the event data, then inlines everything in src/ into one HTML file.
 *
 *   node build.js             -> dist/Modern_Villainess_Timeline.html   (working build)
 *   node build.js --release   -> also copies the build to Output/       (the published copy)
 *   node build.js --fragment  -> also writes dist/timeline.fragment.html (no <html>/<head>/<body>,
 *                                for hosts that supply their own document shell)
 *
 * No dependencies: Node.js only. The build stops if the data has errors.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');
const RELEASE_DIR = path.join(__dirname, 'Output');
const OUT_NAME = 'Modern_Villainess_Timeline.html';
const TITLE = 'Modern Villainess Timeline';

const DATA_FILES = ['events_1.js', 'events_2.js', 'events_3.js'];
const SCRIPT_FILES = DATA_FILES.concat(['art.js', 'app.js']); // load order matters
const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700' +
  '&family=Instrument+Sans:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600&display=swap">';

const read = (file) => fs.readFileSync(path.join(SRC, file), 'utf8');
const flags = new Set(process.argv.slice(2));

/* ── 1. Validate the data ── */
// The data and art files only assign to `window`, so a stub is enough to load them here.
global.window = {};
DATA_FILES.concat(['art.js']).forEach((file) => eval(read(file)));
const events = window.MV_EVENTS;
const motifs = window.MV_MOTIFS;

const CATS = ['finance', 'politics', 'deals', 'world', 'personal', 'shadow'];
const BASES = ['text', 'real', 'est'];
const HISTS = ['real', 'altered', 'fiction', 'story'];
const CONFS = ['s', 'p', 'x'];

const errors = [];
const ids = new Set();
events.forEach((e) => {
  const fail = (msg) => errors.push(e.id + ': ' + msg);
  if (ids.has(e.id)) fail('duplicate id');
  ids.add(e.id);
  ['t', 'when', 'brief', 'ch'].forEach((key) => { if (!e[key]) fail('missing ' + key); });
  if (!CATS.includes(e.cat)) fail('unknown cat "' + e.cat + '"');
  if (!motifs.includes(e.motif)) fail('unknown motif "' + e.motif + '"');
  if (!BASES.includes(e.basis)) fail('unknown basis "' + e.basis + '"');
  if (!HISTS.includes(e.hist)) fail('unknown hist "' + e.hist + '"');
  // Backstory events carry `pre` instead of a date.
  if (!e.pre && !/^\d{4}-\d{2}-\d{2}$/.test(e.d || '')) fail('date must be YYYY-MM-DD');
  if (e.e && e.e <= e.d) fail('end date is not after start date');
  (e.sig || []).forEach((s) => { if (!CONFS.includes(s[0])) fail('unknown confidence "' + s[0] + '"'); });
});

// Unknown links are dropped at runtime, so they are warnings, not errors.
const deadLinks = [];
events.forEach((e) => (e.links || []).forEach((id) => { if (!ids.has(id)) deadLinks.push(e.id + ' -> ' + id); }));

console.log('Events: ' + events.length);
if (deadLinks.length) console.warn('Unknown links (ignored by the app):\n  ' + deadLinks.join('\n  '));
if (errors.length) {
  console.error('Data errors:\n  ' + errors.join('\n  '));
  process.exit(1);
}

/* ── 2. Assemble ── */
const css = read('style.css');
const body = read('body.html');
const js = SCRIPT_FILES.map(read).join('\n');

// Shared by both outputs: title, fonts, styles, markup, scripts.
const fragment =
  '<title>' + TITLE + '</title>\n' + FONTS + '\n<style>\n' + css + '</style>\n' + body + '<script>\n' + js + '\n</script>\n';

const page =
  '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<title>' + TITLE + '</title>\n' + FONTS + '\n<style>\n' + css + '</style>\n</head>\n<body>\n' +
  body + '<script>\n' + js + '\n</script>\n</body>\n</html>\n';

/* ── 3. Write ── */
fs.mkdirSync(DIST, { recursive: true });
const distFile = path.join(DIST, OUT_NAME);
fs.writeFileSync(distFile, page);
console.log('Built   ' + path.relative(__dirname, distFile) + ' (' + Math.round(page.length / 1024) + ' KB)');

if (flags.has('--fragment')) {
  const fragFile = path.join(DIST, 'timeline.fragment.html');
  fs.writeFileSync(fragFile, fragment);
  console.log('Built   ' + path.relative(__dirname, fragFile));
}

// Output/ is the published copy. It changes only on an explicit --release.
if (flags.has('--release')) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const releaseFile = path.join(RELEASE_DIR, OUT_NAME);
  fs.copyFileSync(distFile, releaseFile);
  console.log('Release ' + path.relative(__dirname, releaseFile));
}
