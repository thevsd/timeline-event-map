/**
 * Timeline app: zoomable event map.
 *
 * Rendering is split in two:
 *  - a canvas draws the time axis, gridlines, event markers and the overview strip;
 *  - DOM buttons are the event cards, so they get real text, focus and CSS transitions.
 *
 * The view is two numbers: `ppd` (pixels per day) and `x0` (screen x of DOM0).
 * Depends on window.MV_EVENTS (events_*.js) and window.MV_ART (art.js).
 */
(function () {
  'use strict';

  /* ── Helpers ── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const DAY = 86400000;
  /** ISO date string -> integer day number (days since the Unix epoch, UTC). */
  const toDay = (s) => {
    const p = s.split('-').map(Number);
    return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / DAY);
  };
  const dateOf = (n) => new Date(n * DAY);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /** Smoothstep: 0 below a, 1 above b, eased in between. */
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ── Vocabulary ── */
  // Category order is fixed: it sets the legend order and the overview-strip rows.
  const CATS = [
    { id: 'finance', name: 'Finance & banking', glyph: '金' },
    { id: 'politics', name: 'Politics', glyph: '政' },
    { id: 'deals', name: 'Deals & the Keika empire', glyph: '商' },
    { id: 'world', name: 'World events', glyph: '世' },
    { id: 'personal', name: 'Runa & the Quartet', glyph: '桜' },
    { id: 'shadow', name: 'Secrets & spies', glyph: '影' }
  ];
  const CAT = {};
  CATS.forEach((c) => { CAT[c.id] = c; });

  // Relation to real history: [label, CSS class].
  const HIST = {
    real: ['Real history, preserved', 'h-real'],
    altered: ['Real history, altered', 'h-altered'],
    fiction: ['Invented for this world', 'h-fiction'],
    story: ['Story scene', '']
  };
  // How an event's date was derived.
  const BASIS = {
    text: 'Date given in the novel',
    real: 'Placed on the date of its real-world counterpart',
    est: 'Approximate: estimated from the chapter’s time span'
  };
  // Confidence labels for interpretive readings.
  const CONF = { s: 'Strongly supported', p: 'Plausible', x: 'Speculative' };

  /* ── Timeline domain ── */
  const DOM0 = toDay('1994-01-01');   // start of the to-scale axis
  const DOM1 = toDay('2009-01-01');   // end of the axis
  const CRASH = toDay('2008-09-15');  // the frame scene every event counts down to
  const GAP0 = toDay('2003-05-20');   // unmapped stretch (Vols. 6+), drawn hatched
  const GAP1 = toDay('2008-08-20');
  // Backstory events sit left of DOM0 at a fixed pixel pitch (not to scale).
  const PRE_STEP = 176;
  const PRE_PAD = 26;

  /* ── Data ── */
  const EV = window.MV_EVENTS.slice();
  const byId = {};
  EV.forEach((e, i) => {
    e.src = i;
    byId[e.id] = e;
    if (!e.pre) {
      e.day = toDay(e.d);
      e.end = e.e ? toDay(e.e) : null;
    }
  });
  // Backstory first (by its index), then chronological; source order breaks ties.
  EV.sort((a, b) => (a.pre || 99) - (b.pre || 99) || (a.day || 0) - (b.day || 0) || a.src - b.src);
  // Drop links to unknown ids so the panel never renders a dead link.
  EV.forEach((e) => { e.links = (e.links || []).filter((id) => byId[id] && id !== e.id); });

  // Marquee events: placed first by the layout, so they get the illustrated cards.
  const KEY = new Set([
    'normandy', 'birth', 'ledgers', 'moonlight', 'kaitaku', 'keikabank', 'kidnap', 'mofscandal', 'concert',
    'russia', 'auction', 'sullivan', 'queennight', 'avanti', 'governor', 'trustaccount', 'stroke', 'lockedroom',
    'railway', 'tachibanahome', 'koizumiwins', 'sept11trip', 'tower', 'sept11', 'cry', 'adoption', 'geo',
    'furukawa', 'dream', 'qualified', 'subprime', 'subprimerefusal', 'treasury', 'downfall', 'crash2008'
  ]);
  const NPRE = EV.filter((e) => e.pre).length;
  const PREW = PRE_PAD * 2 + PRE_STEP * NPRE; // pixel width of the backstory zone

  /* ── Elements ── */
  // Older browsers lack roundRect; fall back to square corners.
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  }
  const stage = $('#stage'), world = $('#world');
  const axis = $('#axis'), ctx = axis.getContext('2d');
  const panel = $('#panel'), pscroll = $('#pscroll'), pos = $('#pos');
  const pop = $('#pop');
  const mini = $('#mini'), mcan = $('#minic'), mctx = mcan.getContext('2d');
  const countEl = $('#count'), emptyEl = $('#empty'), moreEl = $('#more'), hintEl = $('#hint');
  const searchEl = $('#search');

  /* ── View state ── */
  const AXIS_H = 62;            // height of the axis header
  const TOP = AXIS_H + 14;      // y where the card area starts
  const BOTTOM_PAD = 18;
  const GX = 8, GY = 6;         // gaps between cards
  const PPD_MAX = 90;           // most zoomed in: one day = 90px
  let ppdMin = 0.62;            // most zoomed out: a quarter is about 57px
  let W = 800, H = 500, dpr = 1; // stage size in CSS px, and device pixel ratio

  /** ppd: pixels per day. x0: screen x of DOM0. sy: vertical scroll of the card area. */
  const v = { ppd: 2.1, x0: 0, sy: 0 };

  // Card sizes per tier (s: title only, m: title + date, l: illustrated). Must match style.css.
  const TIERS = { s: { w: 172, h: 28 }, m: { w: 228, h: 64 }, l: { w: 258, h: 230 } };
  const TIERS_COMPACT = { s: { w: 156, h: 28 }, m: { w: 200, h: 64 }, l: { w: 232, h: 230 } };
  let T = TIERS;

  let selId = null;   // event shown in the detail panel
  let hotId = null;   // event under the pointer
  let query = '';     // lower-cased search text
  const catOn = {};   // category id -> visible?
  CATS.forEach((c) => { catOn[c.id] = true; });
  let colors = {};    // CSS tokens resolved for canvas drawing

  /** Screen x of a day number. */
  const xOfDay = (d) => v.x0 + (d - DOM0) * v.ppd;
  /** X of an event relative to DOM0, at a given zoom. Backstory events ignore the zoom. */
  const worldX = (e, ppd) => (e.pre ? -PREW + PRE_PAD + (e.pre - 1) * PRE_STEP : (e.day - DOM0) * ppd);
  /** Tick level shown at a zoom: quarters, months, weeks or days. */
  const levelOf = (ppd) => (ppd < 1.45 ? 'q' : ppd < 9 ? 'm' : ppd < 30 ? 'w' : 'd');
  /** Zoom each scale button jumps to. */
  const PRESET = { q: 0.7, m: 3.1, w: 14, d: 54 };
  /** Whether an event passes the category filters and the search. */
  const vis = (e) => catOn[e.cat] && (!query || e.hay.indexOf(query) >= 0);

  /** Resolve the CSS colour and font tokens the canvas needs. Re-run on theme change. */
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => cs.getPropertyValue(n).trim();
    colors = {
      ink: g('--ink'), ink2: g('--ink-2'), ink3: g('--ink-3'),
      line: g('--line'), lineS: g('--line-strong'),
      stage: g('--stage'), accent: g('--accent'), hatch: g('--hatch'),
      fontMono: g('--font-mono'), fontBody: g('--font-body'), fontDisplay: g('--font-display')
    };
    CATS.forEach((c) => { colors[c.id] = g('--cat-' + c.id); });
  }

  /* ── Cards ── */
  // One wrapper per event: .ev carries x (set every frame), .ev-y carries y (CSS-animated).
  EV.forEach((e) => {
    // Search haystack.
    e.hay = [e.t, e.brief, (e.who || []).join(' '), e.when, 'vol. ' + e.vol, (e.what || []).join(' ')].join(' ').toLowerCase();

    const el = document.createElement('div');
    el.className = 'ev cat-' + e.cat;
    const y = document.createElement('div');
    y.className = 'ev-y';
    if (e.end) {
      // Range band behind the card of an event that spans a period.
      const sp = document.createElement('div');
      sp.className = 'span';
      y.appendChild(sp);
      e.spanEl = sp;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card tier-s';
    b.dataset.id = e.id;
    b.setAttribute('aria-label', e.t + ', ' + e.when);
    b.innerHTML =
      '<div class="thumb"></div>' +
      '<div class="body"><span class="glyph" aria-hidden="true">' + CAT[e.cat].glyph + '</span>' +
      '<div class="txt"><div class="title">' + esc(e.t) + '</div>' +
      '<div class="meta">' + esc(e.when) + ' · Vol. ' + e.vol + '</div>' +
      '<p class="brief">' + esc(e.brief) + '</p></div></div>';
    y.appendChild(b);
    el.appendChild(y);
    world.appendChild(el);

    e.el = el;
    e.yEl = y;
    e.card = b;
    e.thumb = b.firstChild;
    e.tier = 's';
    e.y = -1;
    e.hasArt = false;
  });

  /** Illustration markup for an event, plus its key-figure pill if it has one. */
  function artHTML(e) {
    return '<div class="art">' + window.MV_ART(e.motif, e.id) + '</div>' + (e.fig ? '<span class="fig">' + esc(e.fig) + '</span>' : '');
  }
  /** Illustrations are built lazily, the first time a card needs one. */
  function ensureArt(e) {
    if (e.hasArt) return;
    e.thumb.innerHTML = artHTML(e);
    e.hasArt = true;
  }

  /* ── Layout ── */
  let lastLayoutKey = '';

  /**
   * Choose a size and a vertical slot for every visible card.
   * Greedy: each card tries illustrated, then medium, then title-only, and keeps the first
   * size that fits on screen while leaving a chip-height lane for neighbours not yet placed.
   * Depends only on zoom, stage size and filters, so panning never re-runs it.
   */
  function layout(force) {
    const key = [v.ppd.toFixed(4), W, H, query, CATS.map((c) => +catOn[c.id]).join('')].join('|');
    if (!force && key === lastLayoutKey) return;
    lastLayoutKey = key;

    const list = EV.filter(vis);
    const n = list.length;
    const availH = Math.max(120, H - TOP - BOTTOM_PAD);
    for (let i = 0; i < n; i++) list[i].wx = worldX(list[i], v.ppd);

    // Marquee events go first so they claim the large cards.
    const seq = list.filter((e) => KEY.has(e.id)).concat(list.filter((e) => !KEY.has(e.id)));
    const done = new Set();
    const placed = []; // rectangles already taken: {x, w, y, h}
    const order = ['l', 'm', 's'];

    for (let i = 0; i < n; i++) {
      const e = seq[i];
      const x = e.wx;
      const spanW = e.end ? (e.end - e.day) * v.ppd : 0;
      let tier = 's', tw = 0, th = 0, w = 0, yy = 0;

      for (let o = 0; o < order.length; o++) {
        tier = order[o];
        tw = T[tier].w;
        th = T[tier].h;
        w = Math.max(tw, spanW); // a span reserves its whole range

        // Lowest free slot among the rectangles that overlap horizontally.
        const hits = placed.filter((p) => p.x < x + w + GX && x < p.x + p.w + GX).sort((a, b) => a.y - b.y);
        yy = 0;
        for (let k = 0; k < hits.length; k++) {
          const p = hits[k];
          if (yy + th + GY <= p.y) break;
          if (p.y + p.h + GY > yy) yy = p.y + p.h + GY;
        }

        // Lanes the unplaced neighbours will need under this card, as title-only chips:
        // the deepest overlap among their chip intervals.
        const cand = [];
        for (let j = 0; j < n; j++) {
          const o2 = list[j];
          if (o2 !== e && !done.has(o2) && o2.wx > x - T.s.w - GX && o2.wx < x + w + GX) cand.push(o2.wx);
        }
        let lanes = 0;
        for (let a = 0; a < cand.length; a++) {
          let depth = 0;
          for (let b = 0; b < cand.length; b++) {
            if (cand[b] <= cand[a] && cand[a] < cand[b] + T.s.w + GX) depth++;
          }
          if (depth > lanes) lanes = depth;
        }
        if (yy + th + lanes * (T.s.h + GY) <= availH) break; // fits; otherwise try the next size down
      }

      placed.push({ x: x, w: w, y: yy, h: th });
      done.add(e);
      e.pw = w;
      e.spanW = spanW;

      // Apply only what changed, to keep CSS transitions smooth.
      if (tier !== e.tier) {
        e.card.classList.remove('tier-' + e.tier);
        e.card.classList.add('tier-' + tier);
        e.tier = tier;
        if (tier === 'l') ensureArt(e);
      }
      if (yy !== e.y) {
        e.y = yy;
        e.yEl.style.transform = 'translateY(' + yy + 'px)';
      }
      if (e.spanEl) {
        e.spanEl.style.width = Math.max(0, spanW) + 'px';
        e.spanEl.style.setProperty('--h', th + 'px');
        e.spanEl.style.display = spanW > tw + 4 ? '' : 'none';
      }
    }

    EV.forEach((e) => e.el.classList.toggle('gone', !vis(e)));
    countEl.textContent = n === EV.length ? EV.length + ' events' : n + ' of ' + EV.length + ' events';
    emptyEl.hidden = n > 0;
  }

  /* ── Frame ── */
  let isOver = false;

  /** Keep the view inside the timeline, and the vertical scroll inside what is on screen. */
  function clampView() {
    const span = (DOM1 - DOM0) * v.ppd;
    const maxX0 = PREW + 36;
    const minX0 = Math.min(maxX0, W - 48 - span);
    v.x0 = clamp(v.x0, minX0, maxX0);

    // Tallest stack among cards currently in view.
    let visH = 0;
    for (let i = 0; i < EV.length; i++) {
      const e = EV[i];
      if (e.pw === undefined || !vis(e)) continue;
      const x = v.x0 + worldX(e, v.ppd);
      if (x < W && x + e.pw > 0) visH = Math.max(visH, e.y + T[e.tier].h);
    }
    const maxSy = Math.max(0, visH + TOP + BOTTOM_PAD - H);
    v.sy = clamp(v.sy, 0, maxSy);

    const over = maxSy - v.sy > 24;
    if (over !== isOver) {
      isOver = over;
      stage.classList.toggle('overflow', over);
      if (over) moreEl.textContent = 'More events below: drag to scroll';
    }
  }

  /** Render one frame: card positions, axis, overview strip, toolbar state. */
  function draw() {
    layout(false);
    clampView();
    world.style.transform = 'translate3d(0,' + (TOP - v.sy) + 'px,0)';

    for (let i = 0; i < EV.length; i++) {
      const e = EV[i];
      const x = v.x0 + worldX(e, v.ppd);
      e.sx = x;

      // Cull cards well outside the viewport.
      const off = x + Math.max(e.pw || 260, 260) < -200 || x > W + 200;
      if (off !== e.isOff) {
        e.isOff = off;
        e.el.classList.toggle('off', off);
      }
      if (off) continue;

      e.el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';

      // A long span keeps its card in view while its range is on screen.
      if (e.end) {
        const room = e.spanW - T[e.tier].w;
        const shift = room > 0 ? clamp(10 - x, 0, room) : 0;
        if (shift !== e.shift) {
          e.shift = shift;
          e.card.style.left = shift + 'px';
        }
      }
    }
    drawAxis();
    drawMini();
    syncScale();
  }

  /* ── Canvas: axis ── */
  /** Diagonal hatching, used for zones that are not to scale or not yet mapped. */
  function hatch(c, x, w, y, h) {
    if (w <= 0) return;
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    c.strokeStyle = colors.hatch;
    c.lineWidth = 6;
    for (let k = x - h; k < x + w + h; k += 18) {
      c.beginPath();
      c.moveTo(k, y + h);
      c.lineTo(k + h, y);
      c.stroke();
    }
    c.restore();
  }

  function setFont(c, px, kind, weight) {
    const family = kind === 'mono' ? colors.fontMono : kind === 'display' ? colors.fontDisplay : colors.fontBody;
    c.font = (weight || 500) + ' ' + px + 'px ' + family;
  }

  /** Draw the axis header, gridlines, zone hatching, event markers and the date bubble. */
  function drawAxis() {
    const c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const ppd = v.ppd, x0 = v.x0;
    // Visible day range, clipped to the domain.
    const dL = Math.max(DOM0, Math.floor(DOM0 + (0 - x0) / ppd) - 2);
    const dR = Math.min(DOM1, Math.ceil(DOM0 + (W - x0) / ppd) + 2);

    // Zones: backstory, unmapped gap, past the end.
    hatch(c, x0 - PREW, PREW, 0, H);
    hatch(c, xOfDay(GAP0), (GAP1 - GAP0) * ppd, AXIS_H, H - AXIS_H);
    hatch(c, xOfDay(DOM1), W, 0, H);

    // Header background and baseline.
    c.fillStyle = colors.stage;
    c.globalAlpha = 0.92;
    c.fillRect(0, 0, W, AXIS_H);
    c.globalAlpha = 1;
    c.strokeStyle = colors.lineS;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, AXIS_H + 0.5);
    c.lineTo(W, AXIS_H + 0.5);
    c.stroke();

    // Opacity of each tick level; neighbouring levels crossfade around their thresholds.
    const aQ = 1 - smooth(1.2, 1.7, ppd);
    const aM = smooth(1.2, 1.7, ppd) * (1 - smooth(7.5, 10.5, ppd));
    const aW = smooth(7.5, 10.5, ppd) * (1 - smooth(25, 34, ppd));
    const aD = smooth(25, 34, ppd);
    const aYear = 1 - smooth(7.5, 10.5, ppd);     // major row shows years...
    const aMonthMajor = smooth(7.5, 10.5, ppd);   // ...then "Month Year" when zoomed in

    const y0 = dateOf(dL).getUTCFullYear(), y1 = dateOf(dR).getUTCFullYear();

    const grid = (x, a, strong) => {
      c.globalAlpha = a;
      c.strokeStyle = strong ? colors.lineS : colors.line;
      c.beginPath();
      c.moveTo(Math.round(x) + 0.5, strong ? 0 : 30);
      c.lineTo(Math.round(x) + 0.5, H);
      c.stroke();
      c.globalAlpha = 1;
    };
    const minorLabel = (x, txt, a, sub) => {
      c.globalAlpha = a;
      c.fillStyle = colors.ink2;
      setFont(c, 11.5, 'mono', 500);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(txt, x + 6, 43);
      if (sub) {
        c.fillStyle = colors.ink3;
        setFont(c, 9.5, 'body', 600);
        c.fillText(sub, x + 6 + c.measureText(txt).width + 12, 43);
      }
      c.globalAlpha = 1;
    };
    /** Major tick whose label stays pinned to the left edge while its period is on screen. */
    const major = (startDay, endDay, txt, a) => {
      const xs = xOfDay(startDay), xe = xOfDay(endDay);
      grid(xs, a, true);
      c.globalAlpha = a;
      c.fillStyle = colors.ink;
      setFont(c, 13.5, 'display', 700);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      const tw = c.measureText(txt).width;
      const lx = Math.min(Math.max(xs + 7, Math.max(8, x0 + 7)), xe - tw - 10);
      if (lx + tw > 0 && lx < W && xe - xs > tw + 14) c.fillText(txt, lx, 17);
      c.globalAlpha = 1;
    };

    if (dR > dL) {
      // Minor ticks: quarters and months.
      for (let y = y0; y <= y1; y++) {
        for (let m = 0; m < 12; m++) {
          const dm = Math.round(Date.UTC(y, m, 1) / DAY);
          if (dm > dR || dm < dL - 100) continue;
          const x = xOfDay(dm);
          if (m % 3 === 0 && aQ > 0.01) {
            grid(x, aQ * 0.9, false);
            if (x > -80) minorLabel(x, 'Q' + (m / 3 + 1), aQ);
          }
          if (aM > 0.01) {
            grid(x, aM * 0.9, false);
            if (x > -80) minorLabel(x, MON[m], aM);
          }
        }
      }
      // Minor ticks: weeks (Mondays) and days.
      if (aW > 0.01 || aD > 0.01) {
        for (let d = dL; d <= dR; d++) {
          const x = xOfDay(d);
          const dt = dateOf(d);
          const dom = dt.getUTCDate();
          if (aW > 0.01 && (d + 3) % 7 === 0) { // day 0 (1 Jan 1970) was a Thursday
            grid(x, aW * 0.9, false);
            minorLabel(x, String(dom), aW, '');
          }
          if (aD > 0.01) {
            grid(x, aD * (dom === 1 ? 1 : 0.8), false);
            minorLabel(x, String(dom), aD, ppd > 52 ? WD[dt.getUTCDay()] : '');
          }
        }
      }
      // Major ticks.
      for (let y = y0; y <= y1; y++) {
        if (aYear > 0.01) {
          major(Math.max(DOM0, Math.round(Date.UTC(y, 0, 1) / DAY)), Math.round(Date.UTC(y + 1, 0, 1) / DAY), String(y), aYear);
        }
        if (aMonthMajor > 0.01) {
          for (let m = 0; m < 12; m++) {
            const a = Math.round(Date.UTC(y, m, 1) / DAY), b = Math.round(Date.UTC(y, m + 1, 1) / DAY);
            if (b < dL || a > dR) continue;
            major(a, b, MONTH[m] + ' ' + y, aMonthMajor);
          }
        }
      }
    }

    // Zone captions.
    if (x0 > 0) {
      const lx = Math.min(Math.max(x0 - PREW + 12, 8), x0 - 150);
      if (lx + 140 > 0) {
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillStyle = colors.ink;
        setFont(c, 13.5, 'display', 700);
        c.fillText('Before the story', lx, 17);
        c.fillStyle = colors.ink3;
        setFont(c, 11.5, 'mono', 500);
        c.fillText('1944 – 1990 · not to scale', lx, 43);
      }
    }
    const ga = Math.max(xOfDay(GAP0), 0), gb = Math.min(xOfDay(GAP1), W);
    if (gb - ga >= 150) {
      const gy = Math.min(H - 60, AXIS_H + 120);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = colors.ink3;
      setFont(c, 12, 'body', 600);
      c.fillText('Summer 2003 to summer 2008', (ga + gb) / 2, gy);
      setFont(c, 11, 'body', 500);
      c.fillText('Volumes 6 onward are not mapped yet', (ga + gb) / 2, gy + 17);
    }

    // Crash marker.
    const xc = xOfDay(CRASH);
    if (xc > -40 && xc < W + 40) {
      c.strokeStyle = colors.accent;
      c.lineWidth = 1.5;
      c.setLineDash([5, 5]);
      c.beginPath();
      c.moveTo(xc, AXIS_H);
      c.lineTo(xc, H);
      c.stroke();
      c.setLineDash([]);
      c.lineWidth = 1;
    }

    // Event markers on the axis; the hovered or selected one gets a guide line to its card.
    for (let i = 0; i < EV.length; i++) {
      const e = EV[i];
      if (e.isOff || !vis(e)) continue;
      const x = e.sx;
      const on = e.id === selId || e.id === hotId;
      c.fillStyle = colors[e.cat];
      if (e.end && e.spanW > 6) {
        c.globalAlpha = 0.5;
        c.fillRect(x, AXIS_H - 6.5, e.spanW, 3);
        c.globalAlpha = 1;
      }
      c.beginPath();
      c.arc(x, AXIS_H - 5, on ? 5 : 3, 0, Math.PI * 2);
      c.fill();
      if (on) {
        c.strokeStyle = colors.stage;
        c.lineWidth = 2;
        c.stroke();
        c.strokeStyle = e.id === selId ? colors.accent : colors[e.cat];
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x + 0.5, AXIS_H);
        c.lineTo(x + 0.5, Math.max(AXIS_H, TOP - v.sy + e.y));
        c.stroke();
        c.lineWidth = 1;
      }
    }

    // Date bubble for the hovered (else selected) event.
    const f = byId[hotId] || byId[selId];
    if (f && !f.isOff && vis(f)) {
      setFont(c, 11, 'mono', 600);
      const tw = c.measureText(f.when).width + 16;
      const bx = clamp(f.sx - tw / 2, 4, W - tw - 4), by = 31;
      c.fillStyle = colors.ink;
      c.beginPath();
      c.roundRect(bx, by, tw, 22, 7);
      c.fill();
      c.fillStyle = colors.stage;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(f.when, bx + tw / 2, by + 11.5);
    }
  }

  /* ── Canvas: overview strip ── */
  let MW = 600, MH = 58;  // strip size in CSS px
  const MPRE = 44;        // width reserved for the backstory zone

  /** Strip x of a day number. */
  const miniX = (day) => MPRE + ((day - DOM0) / (DOM1 - DOM0)) * (MW - MPRE - 6);
  /** Strip x of a stage x, used to draw the viewport window. */
  function screenToMini(sx) {
    if (sx < v.x0) return clamp((sx - (v.x0 - PREW)) / PREW, 0, 1) * MPRE;
    return miniX(clamp(DOM0 + (sx - v.x0) / v.ppd, DOM0, DOM1));
  }

  /** Draw the whole timeline in miniature: one row per category, plus the viewport window. */
  function drawMini() {
    const c = mctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, MW, MH);
    hatch(c, 0, MPRE, 0, MH);
    hatch(c, miniX(GAP0), miniX(GAP1) - miniX(GAP0), 0, MH);

    const top = 7, rowH = (MH - 24) / CATS.length;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    setFont(c, 9.5, 'mono', 500);
    for (let y = 1994; y <= 2008; y++) {
      const x = miniX(Math.round(Date.UTC(y, 0, 1) / DAY));
      c.strokeStyle = colors.line;
      c.beginPath();
      c.moveTo(Math.round(x) + 0.5, 0);
      c.lineTo(Math.round(x) + 0.5, MH);
      c.stroke();
      if (MW > 700 || y % 2 === 0) {
        c.fillStyle = colors.ink3;
        c.fillText(MW > 520 ? String(y) : "'" + String(y).slice(2), x + 3, MH - 5);
      }
    }

    for (let i = 0; i < EV.length; i++) {
      const e = EV[i];
      if (!vis(e)) continue;
      const row = CATS.findIndex((k) => k.id === e.cat);
      const x = e.pre ? 5 + (e.pre - 1) * ((MPRE - 10) / Math.max(1, NPRE - 1)) : miniX(e.day);
      const w = e.end ? Math.max(3, miniX(e.end) - miniX(e.day)) : 3;
      c.fillStyle = colors[e.cat];
      c.globalAlpha = e.id === selId ? 1 : 0.85;
      c.beginPath();
      c.roundRect(x - 1.5, top + row * rowH, w, Math.max(3, rowH - 1.5), 1.5);
      c.fill();
      c.globalAlpha = 1;
    }

    // Viewport window.
    const a = screenToMini(0), b = screenToMini(W);
    const ww = Math.max(6, b - a);
    c.fillStyle = colors.accent;
    c.globalAlpha = 0.12;
    c.beginPath();
    c.roundRect(a, 2, ww, MH - 4, 6);
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = colors.accent;
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(a + 0.75, 2.75, ww - 1.5, MH - 5.5, 6);
    c.stroke();
    c.lineWidth = 1;
  }

  /** Centre the main view on a strip x. */
  function miniTo(mx) {
    stopAnim();
    const wx = mx < MPRE
      ? -PREW + (mx / MPRE) * PREW
      : clamp((mx - MPRE) / (MW - MPRE - 6), 0, 1) * (DOM1 - DOM0) * v.ppd;
    v.x0 = W / 2 - wx;
    requestDraw();
  }
  let miniDrag = false;
  const miniLocalX = (ev) => ev.clientX - mini.getBoundingClientRect().left;
  mini.addEventListener('pointerdown', (ev) => {
    miniDrag = true;
    mini.setPointerCapture(ev.pointerId);
    miniTo(miniLocalX(ev));
  });
  mini.addEventListener('pointermove', (ev) => { if (miniDrag) miniTo(miniLocalX(ev)); });
  mini.addEventListener('pointerup', () => { miniDrag = false; });
  mini.addEventListener('pointercancel', () => { miniDrag = false; });

  /* ── Animation ── */
  let raf = 0;
  let anim = null;    // programmatic fly-to in progress
  let wheelT = null;  // zoom target being eased toward
  let inertia = 0;    // px per frame left over from a drag

  /** Schedule one frame; calls within the same frame coalesce. */
  function requestDraw() {
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function stopAnim() {
    anim = null;
    wheelT = null;
    inertia = 0;
  }

  /** Advance whichever motion is active, then draw. */
  function tick(now) {
    raf = 0;
    let again = false;
    if (anim) {
      // Fly-to: ease zoom in log space and slide the anchor to its target screen x.
      const u = clamp((now - anim.t0) / anim.dur, 0, 1);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      v.ppd = Math.exp(anim.lp0 + (anim.lp1 - anim.lp0) * e);
      const sx = anim.sx0 + (anim.sx1 - anim.sx0) * e;
      v.x0 = sx - (anim.dd * v.ppd + anim.px);
      if (u < 1) again = true;
      else anim = null;
    } else if (wheelT) {
      // Wheel zoom: close a fixed fraction of the remaining ratio each frame, anchor held under the cursor.
      const r = wheelT.ppd / v.ppd;
      const settled = Math.abs(Math.log(r)) < 0.004;
      v.ppd = settled ? wheelT.ppd : v.ppd * Math.pow(r, reduced ? 1 : 0.26);
      v.x0 = wheelT.cx - (wheelT.dd * v.ppd + wheelT.px);
      if (settled) wheelT = null;
      else again = true;
    } else if (Math.abs(inertia) > 0.4) {
      v.x0 += inertia;
      inertia *= 0.9;
      again = true;
    }
    draw();
    if (again) requestDraw();
  }

  /**
   * An anchor is a point on the timeline: `dd` days from DOM0 plus `px` pixels.
   * `px` is only non-zero inside the backstory zone, which does not scale with zoom.
   */
  function anchorAt(sx) {
    return sx < v.x0 ? { dd: 0, px: sx - v.x0 } : { dd: (sx - v.x0) / v.ppd, px: 0 };
  }
  const anchorOf = (e) => (e.pre ? { dd: 0, px: worldX(e, 1) } : { dd: e.day - DOM0, px: 0 });

  /** Zoom to `ppd`, keeping the timeline point under screen x `cx` fixed. */
  function zoomTo(ppd, cx, instant) {
    ppd = clamp(ppd, ppdMin, PPD_MAX);
    anim = null;
    inertia = 0;
    // Reuse the current anchor while the cursor has not moved, so repeated wheel steps do not drift.
    const a = wheelT && Math.abs(wheelT.cx - cx) < 2 ? wheelT : anchorAt(cx);
    wheelT = { ppd: ppd, cx: cx, dd: a.dd, px: a.px };
    if (instant) {
      v.ppd = ppd;
      v.x0 = cx - (a.dd * ppd + a.px);
      wheelT = null;
    }
    requestDraw();
  }

  /** Animate so that anchor `a` lands at screen x `sx1` at zoom `ppd`. */
  function flyTo(a, ppd, sx1, dur) {
    wheelT = null;
    inertia = 0;
    ppd = clamp(ppd, ppdMin, PPD_MAX);
    if (reduced) {
      v.ppd = ppd;
      v.x0 = sx1 - (a.dd * ppd + a.px);
      requestDraw();
      return;
    }
    // Cap the starting offset so far-away targets do not take a long slide.
    const sx0 = clamp(v.x0 + a.dd * v.ppd + a.px, -2.2 * W, 3.2 * W);
    anim = { t0: performance.now(), dur: dur || 700, lp0: Math.log(v.ppd), lp1: Math.log(ppd), sx0: sx0, sx1: sx1, dd: a.dd, px: a.px };
    requestDraw();
  }

  /** Bring an event's card into view; `center` forces it to the middle. */
  function reveal(e, center) {
    const a = anchorOf(e);
    const w = T[e.tier].w;
    const sx = v.x0 + a.dd * v.ppd + a.px;
    if (!center && sx > 24 && sx + w < W - 24) {
      requestDraw();
      return;
    }
    flyTo(a, v.ppd, clamp(W / 2 - w / 2, 16, Math.max(16, W - w - 16)), 620);
    const need = e.y + T[e.tier].h + TOP + BOTTOM_PAD - H;
    if (v.sy < need) v.sy = need;
    if (e.y < v.sy) v.sy = e.y;
  }

  /* ── Pointer input: pan, pinch, wheel ── */
  const pts = new Map(); // active pointers
  let drag = null;       // pan state, or {pinch, ppd} while two fingers are down
  let moved = false;     // true once a press has turned into a drag (suppresses the click)
  let lastDX = 0, lastMoveT = 0;

  stage.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    hidePop();
    hint();
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.size === 1) {
      stopAnim();
      drag = { x: ev.clientX, y: ev.clientY, x0: v.x0, sy: v.sy };
      moved = false;
      lastDX = 0;
    } else if (pts.size === 2) {
      const p = Array.from(pts.values());
      drag = { pinch: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), ppd: v.ppd };
      moved = true;
    }
  });

  stage.addEventListener('pointermove', (ev) => {
    if (!pts.has(ev.pointerId)) return;
    const prev = pts.get(ev.pointerId);
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (!drag) return;

    if (drag.pinch) {
      const p = Array.from(pts.values());
      if (p.length < 2) return;
      const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const mid = (p[0].x + p[1].x) / 2 - stage.getBoundingClientRect().left;
      zoomTo((drag.ppd * dist) / drag.pinch, mid, true);
      return;
    }

    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    // A small dead zone keeps a click from turning into a drag.
    if (!moved && Math.hypot(dx, dy) > 5) {
      moved = true;
      stage.classList.add('dragging');
      try { stage.setPointerCapture(ev.pointerId); } catch (err) { /* pointer already released */ }
    }
    if (moved) {
      v.x0 = drag.x0 + dx;
      v.sy = drag.sy - dy;
      lastDX = ev.clientX - prev.x;
      lastMoveT = performance.now();
      requestDraw();
    }
  });

  const endDrag = (ev) => {
    pts.delete(ev.pointerId);
    // Coast only if the pointer was still moving at release.
    if (drag && !drag.pinch && moved && Math.abs(lastDX) > 2 && !reduced && performance.now() - lastMoveT < 70) {
      inertia = clamp(lastDX * 0.8, -18, 18);
      requestDraw();
    }
    if (pts.size === 0) {
      drag = null;
      stage.classList.remove('dragging');
      setTimeout(() => { moved = false; }, 0); // after the click event has fired
    } else if (pts.size === 1) {
      // One finger lifted from a pinch: carry on as a pan.
      const p = Array.from(pts.values())[0];
      drag = { x: p.x, y: p.y, x0: v.x0, sy: v.sy };
    }
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    hidePop();
    hint();
    const cx = ev.clientX - stage.getBoundingClientRect().left;
    // Horizontal scroll (trackpad) or Shift+wheel pans; everything else zooms.
    if (!ev.ctrlKey && Math.abs(ev.deltaX) > Math.abs(ev.deltaY) * 1.2) {
      stopAnim();
      v.x0 -= ev.deltaX;
      requestDraw();
      return;
    }
    if (ev.shiftKey && !ev.ctrlKey) {
      stopAnim();
      v.x0 -= ev.deltaY;
      requestDraw();
      return;
    }
    const unit = ev.deltaMode === 1 ? 32 : 1; // line-mode wheels report lines, not pixels
    // ctrlKey marks a trackpad pinch, which sends small deltas.
    const k = Math.exp(-clamp(ev.deltaY * unit, -240, 240) * (ev.ctrlKey ? 0.012 : 0.0028));
    zoomTo((wheelT ? wheelT.ppd : v.ppd) * k, cx);
  }, { passive: false });

  /* ── Hover preview ── */
  let popTimer = 0;

  /** Show the floating preview beside a card: below it if there is room, otherwise above. */
  function showPop(e) {
    const r = e.card.getBoundingClientRect();
    pop.className = 'pop cat-' + e.cat;
    pop.innerHTML =
      '<div class="ph">' + artHTML(e) + '</div>' +
      '<div class="pb"><h3>' + esc(e.t) + '</h3>' +
      '<div class="when">' + esc(e.when) + ' · Vol. ' + e.vol + ', ' + esc(e.ch) + '</div>' +
      '<p>' + esc(e.brief) + '</p>' +
      '<div class="cta">Click the card for the full entry</div></div>';
    const ph = pop.offsetHeight, pw = 280;
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 8;
    if (top < 8) top = 8;
    pop.style.left = clamp(r.left, 8, window.innerWidth - pw - 8) + 'px';
    pop.style.top = top + 'px';
    pop.classList.add('on');
  }
  function hidePop() {
    clearTimeout(popTimer);
    pop.classList.remove('on');
  }

  const cardOf = (ev) => ev.target.closest && ev.target.closest('.card');

  world.addEventListener('pointerover', (ev) => {
    const b = cardOf(ev);
    if (!b) return;
    const e = byId[b.dataset.id];
    if (hotId !== e.id) {
      hotId = e.id;
      requestDraw();
    }
    if (ev.pointerType !== 'mouse' || drag) return;
    clearTimeout(popTimer);
    // Illustrated cards already show their image and brief.
    if (e.tier !== 'l') {
      popTimer = setTimeout(() => { if (hotId === e.id && !drag) showPop(e); }, 140);
    }
  });
  world.addEventListener('pointerout', (ev) => {
    const b = cardOf(ev);
    if (!b || b.contains(ev.relatedTarget)) return;
    hotId = null;
    hidePop();
    requestDraw();
  });
  world.addEventListener('click', (ev) => {
    const b = cardOf(ev);
    if (!b || moved) return;
    select(b.dataset.id, false);
  });
  // Keyboard focus on an off-screen card brings it into view.
  world.addEventListener('focusin', (ev) => {
    const b = cardOf(ev);
    if (b && b.matches(':focus-visible')) reveal(byId[b.dataset.id], false);
  });
  // The browser may scroll the stage itself to show a focused card; undo it, the view handles that.
  stage.addEventListener('scroll', () => {
    stage.scrollLeft = 0;
    stage.scrollTop = 0;
  });

  /* ── Detail panel ── */
  /** Days from an event to the crash, or null for backstory and for the crash itself. */
  function daysToCrash(e) {
    if (e.pre) return null;
    const d = CRASH - e.day;
    return d > 0 ? d : null;
  }

  /** Build the panel content for an event. */
  function renderPanel(e) {
    const list = EV.filter(vis);
    const idx = list.indexOf(e);
    pos.textContent = idx >= 0 ? idx + 1 + ' of ' + list.length : '';

    const h = HIST[e.hist] || HIST.story;
    const cd = daysToCrash(e);
    const glyph = (cat) => '<span class="glyph" aria-hidden="true">' + CAT[cat].glyph + '</span>';
    const sec = (title, inner) => '<div class="sec"><h4>' + title + '</h4>' + inner + '</div>';
    const ul = (arr) => '<ul>' + arr.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>';

    let html = '<div class="cat-' + e.cat + '"><div class="hero">' + artHTML(e) + '</div><div class="pbody">';
    html +=
      '<div class="tags">' +
      '<span class="tag">' + glyph(e.cat) + esc(CAT[e.cat].name) + '</span>' +
      '<span class="tag">Vol. ' + e.vol + ' · ' + esc(e.ch) + '</span>' +
      '<span class="tag ' + h[1] + '">' + h[0] + '</span></div>';
    html += '<h2 id="ptitle" tabindex="-1">' + esc(e.t) + '</h2>';
    html += '<div class="dateline">' + esc(e.when) + '<small>' + BASIS[e.basis] + '</small></div>';
    html += '<p class="lede">' + esc(e.brief) + '</p>';
    if (cd) {
      html += '<div class="count-down"><b>' + cd.toLocaleString('en-US') + '</b><span>days before the crash of 15 September 2008</span></div>';
    } else if (e.id === 'crash2008') {
      html += '<div class="count-down"><b>Day zero</b><span>the night every other event counts down to</span></div>';
    }

    if (e.what && e.what.length) html += sec('What happens', ul(e.what));
    if (e.reveal && e.reveal.length) html += sec('Revelations', ul(e.reveal));
    if (e.real) html += sec('Real-world history', '<p>' + esc(e.real) + '</p>');
    if (e.sig && e.sig.length) {
      const rows = e.sig.map((s) => '<div><span class="conf ' + s[0] + '">' + CONF[s[0]] + '</span>' + esc(s[1]) + '</div>');
      html += sec('Reading', '<div class="reading">' + rows.join('') + '</div>');
    }
    if (e.who && e.who.length) {
      const people = e.who.map((p) => '<button type="button" class="person" data-person="' + esc(p) + '">' + esc(p) + '</button>');
      html += sec('People', '<div class="people">' + people.join('') + '</div>');
    }
    if (e.links.length) {
      const links = e.links.map((id) => {
        const o = byId[id];
        return '<button type="button" class="link cat-' + o.cat + '" data-go="' + o.id + '">' + glyph(o.cat) +
          '<span class="lt">' + esc(o.t) + '</span><span class="ld">' + esc(o.when.replace(/^c\. /, '')) + '</span></button>';
      });
      html += sec('Connected events', '<div class="links">' + links.join('') + '</div>');
    }
    html += '</div></div>';

    pscroll.innerHTML = html;
    pscroll.scrollTop = 0;
  }

  /** Select an event: mark its card, fill and open the panel, bring the card into view. */
  function select(id, center) {
    const e = byId[id];
    if (!e) return;
    if (selId && byId[selId]) byId[selId].card.classList.remove('is-sel');
    selId = id;
    e.card.classList.add('is-sel');
    hidePop();
    renderPanel(e);

    const wasOpen = panel.classList.contains('open');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    // On first open, wait for the panel's width transition so the stage has its final size.
    if (wasOpen) reveal(e, center);
    else setTimeout(() => reveal(e, center), reduced ? 0 : 420);
    requestDraw();
  }

  function closePanel() {
    if (selId && byId[selId]) byId[selId].card.classList.remove('is-sel');
    selId = null;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    requestDraw();
  }

  /** Move the selection to the previous or next visible event. */
  function step(dir) {
    const list = EV.filter(vis);
    if (!list.length) return;
    const i = list.indexOf(byId[selId]);
    select(list[i < 0 ? 0 : clamp(i + dir, 0, list.length - 1)].id, true);
  }

  $('#pclose').addEventListener('click', closePanel);
  $('#pprev').addEventListener('click', () => step(-1));
  $('#pnext').addEventListener('click', () => step(1));
  // Delegated clicks inside the panel: connected events and people.
  pscroll.addEventListener('click', (ev) => {
    const go = ev.target.closest('[data-go]');
    if (go) {
      select(go.dataset.go, true);
      return;
    }
    const person = ev.target.closest('[data-person]');
    if (person) {
      searchEl.value = person.dataset.person;
      setQuery(person.dataset.person);
    }
  });

  /* ── Toolbar: search, filters, jumps, scale ── */
  /** Re-run the layout after a filter change and refresh the panel's "n of N". */
  function refilter() {
    layout(true);
    if (selId && byId[selId]) renderPanel(byId[selId]);
    requestDraw();
  }
  function setQuery(q) {
    query = q.trim().toLowerCase();
    refilter();
  }
  searchEl.addEventListener('input', () => setQuery(searchEl.value));

  // Category toggles double as the colour legend.
  const catBox = $('#cats');
  CATS.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip cat-' + c.id;
    b.id = 'cat-' + c.id;
    b.title = 'Show or hide ' + c.name;
    b.setAttribute('aria-pressed', 'true');
    const count = EV.filter((e) => e.cat === c.id).length;
    b.innerHTML = '<span class="glyph" aria-hidden="true">' + c.glyph + '</span>' + esc(c.name) + '<span class="n">' + count + '</span>';
    b.addEventListener('click', () => {
      catOn[c.id] = !catOn[c.id];
      b.setAttribute('aria-pressed', String(catOn[c.id]));
      refilter();
    });
    catBox.appendChild(b);
  });

  // Jump buttons: [label, target]. A number is a volume; its date range is fitted to the stage.
  const JUMPS = [['Backstory', 'pre'], ['Vol. 1', 1], ['Vol. 2', 2], ['Vol. 3', 3], ['Vol. 4', 4], ['Vol. 5', 5], ['The crash, 2008', 'crash']];
  const jumpBox = $('#jumps');
  JUMPS.forEach((j) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip jump';
    b.id = 'jump-' + j[1];
    b.textContent = j[0];
    b.addEventListener('click', () => {
      hint();
      if (j[1] === 'pre') {
        flyTo({ dd: 0, px: -PREW / 2 }, v.ppd, Math.min(W / 2, PREW / 2 + 30));
        return;
      }
      if (j[1] === 'crash') {
        flyTo({ dd: CRASH - DOM0, px: 0 }, Math.max(v.ppd, 1.2), W * 0.42);
        return;
      }
      // The frame scene is filed under Vol. 1 but sits in 2008; leave it out of the fit.
      const evs = EV.filter((e) => !e.pre && e.vol === j[1] && e.id !== 'crash2008');
      const first = Math.min.apply(null, evs.map((e) => e.day));
      const last = Math.max.apply(null, evs.map((e) => e.end || e.day));
      const ppd = clamp((W - 330) / Math.max(30, last - first), ppdMin, 6);
      flyTo({ dd: (first + last) / 2 - DOM0, px: 0 }, ppd, (W - 250) / 2 + 20);
    });
    jumpBox.appendChild(b);
  });

  // Scale buttons zoom around the selected card if it is on screen, otherwise the centre.
  const scaleBtns = Array.from(document.querySelectorAll('#scale button'));
  scaleBtns.forEach((b) => {
    b.addEventListener('click', () => {
      hint();
      const f = byId[selId];
      const cx = f && !f.isOff && f.sx > 0 && f.sx < W ? f.sx : W / 2;
      flyTo(anchorAt(cx), PRESET[b.dataset.level], cx, 800);
    });
  });
  let lastLevel = '';
  /** Highlight the scale button that matches the current zoom. */
  function syncScale() {
    const l = levelOf(v.ppd);
    if (l === lastLevel) return;
    lastLevel = l;
    scaleBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === l)));
  }

  /** Current zoom target, so repeated steps compound even mid-animation. */
  const targetPpd = () => (wheelT ? wheelT.ppd : v.ppd);
  $('#zin').addEventListener('click', () => { hint(); zoomTo(targetPpd() * 1.7, W / 2); });
  $('#zout').addEventListener('click', () => { hint(); zoomTo(targetPpd() / 1.7, W / 2); });

  let hinted = false;
  /** Fade the usage hint after the first interaction. */
  function hint() {
    if (hinted) return;
    hinted = true;
    hintEl.classList.add('gone');
  }

  /* ── Keyboard ── */
  document.addEventListener('keydown', (ev) => {
    if ((ev.target.tagName || '').toLowerCase() === 'input') {
      if (ev.key === 'Escape') {
        searchEl.value = '';
        setQuery('');
        searchEl.blur();
      }
      return;
    }
    switch (ev.key) {
      case 'Escape':
        if (selId) closePanel();
        break;
      case 'ArrowRight':
      case 'ArrowLeft': {
        const dir = ev.key === 'ArrowRight' ? 1 : -1;
        if (selId) {
          // With the panel open, arrows step through events; otherwise they pan.
          ev.preventDefault();
          step(dir);
        } else {
          stopAnim();
          v.x0 -= dir * 120;
          requestDraw();
        }
        break;
      }
      case '+':
      case '=':
        zoomTo(targetPpd() * 1.5, W / 2);
        break;
      case '-':
      case '_':
        zoomTo(targetPpd() / 1.5, W / 2);
        break;
    }
  });

  /* ── Sizing and start-up ── */
  /** Re-measure the stage and strip, resize the canvases, and pick card sizes for the width. */
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(200, r.width);
    H = Math.max(200, r.height);
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    axis.width = Math.round(W * dpr);
    axis.height = Math.round(H * dpr);

    const mr = mini.getBoundingClientRect();
    MW = Math.max(100, mr.width);
    MH = Math.max(30, mr.height);
    mcan.width = Math.round(MW * dpr);
    mcan.height = Math.round(MH * dpr);

    const compact = W < 560;
    stage.classList.toggle('compact', compact);
    T = compact ? TIERS_COMPACT : TIERS;

    // Never zoom out past the point where the whole axis fits.
    ppdMin = Math.max(0.62, (W - 90) / (DOM1 - DOM0));
    if (v.ppd < ppdMin) v.ppd = ppdMin;

    lastLayoutKey = '';
    requestDraw();
  }

  function start() {
    readColors();
    resize();

    // Opening view: months, starting in spring 1997.
    v.ppd = clamp(W < 560 ? 1.6 : 2.3, ppdMin, PPD_MAX);
    v.x0 = 40 - (toDay('1997-03-01') - DOM0) * v.ppd;
    draw();

    // Deep link: #<event id> opens that event.
    const hashId = (location.hash || '').slice(1);
    if (hashId && byId[hashId]) select(hashId, true);

    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);

    // Canvas colours are resolved values, so re-read them when the theme or fonts change.
    const recolor = () => {
      readColors();
      requestDraw();
    };
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', recolor);
    new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(recolor);
  }

  // Small surface for debugging and automated tests.
  window.MV_APP = { select: select, view: v, events: EV, zoomTo: zoomTo, flyTo: flyTo };
  start();
})();
