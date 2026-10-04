import { eventImage } from '../art/eventImages';
import { illustrationSvg } from '../art/illustration';
import { CATEGORY_BY_ID } from '../data/categories';
import { matchesFilter } from '../data';
import type { EventFilter, RealEvent, TimelineEvent } from '../data/types';
import { CRASH_DAY, DOMAIN_END, DOMAIN_START, toDay } from '../lib/time';
import {
  AXIS_HEIGHT, BACKSTORY_PAD, BACKSTORY_STEP, BADGE, BOTTOM_PAD, CARDS_PAD, COMPACT_WIDTH, LANE_HEIGHT, LEVEL_PPD,
  PPD_MAX, PPD_MIN, TIERS, TIERS_COMPACT, clamp, levelOf, type TierSizes, type ZoomLevel,
} from './config';
import { drawAxis } from './drawAxis';
import { drawLinks } from './drawLinks';
import { drawOverview, overviewScale } from './drawOverview';
import { packCards, type Packing } from './layout';
import { readPalette, setFont, type Palette } from './palette';
import type { Badge, Box, Frame, Item, JumpTarget, RealItem, Reveal, TimelineCallbacks, ViewState } from './types';

/** DOM nodes the engine draws into. The host creates them; the engine owns their contents. */
export interface TimelineElements {
  stage: HTMLElement;
  /**
   * Container for the event cards. Its parent must be the card viewport: an element inside
   * the stage that clips its contents to the area below the axis header and the lane.
   */
  world: HTMLElement;
  /** Row between the axis header and the cards that holds the real-history entries. */
  lane: HTMLElement;
  axisCanvas: HTMLCanvasElement;
  /** Overlay inside the card viewport, above the cards, for connection lines. */
  linkCanvas: HTMLCanvasElement;
  overview: HTMLElement;
  overviewCanvas: HTMLCanvasElement;
}

/**
 * A point on the timeline: `days` from the start of the axis plus `px` pixels.
 * `px` is only non-zero inside the backstory zone, which does not scale with zoom.
 */
interface Anchor {
  days: number;
  px: number;
}

/** Programmatic move: zoom eases in log space while the anchor slides to a target screen x. */
interface Flight extends Anchor {
  startTime: number;
  duration: number;
  logFrom: number;
  logTo: number;
  screenFrom: number;
  screenTo: number;
}

/** Zoom being eased toward, with the anchor held at a fixed screen x. */
interface ZoomTarget extends Anchor {
  ppd: number;
  screenX: number;
}

type Drag = { kind: 'pan'; x: number; y: number; x0: number } | { kind: 'pinch'; distance: number; ppd: number };

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (ch) => HTML_ESCAPES[ch]);

/** Set a canvas's pixel size, leaving it alone when it already fits: assigning a size clears the canvas. */
function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  const w = Math.round(width);
  const h = Math.round(height);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}

/** Pause after the view stops moving before the host is told about it. */
const VIEW_REPORT_DELAY = 220;

/**
 * The timeline engine: a zoomable time axis with event cards packed beneath it.
 *
 * Framework-free. Canvases draw the axis, gridlines, markers, connection lines and the overview
 * strip; DOM buttons are the cards, badges and real-history entries, so they keep real text,
 * focus and CSS transitions. The view is two numbers: `ppd` (pixels per day) and `x0` (screen x
 * of the start of the axis).
 *
 * The host passes data and state in through the public methods and listens through callbacks.
 */
export class Timeline {
  private readonly items: Item[];
  private readonly byId = new Map<string, Item>();
  /** Ids of the events that link to each event: the reverse of `links`. */
  private readonly linkedFrom = new Map<string, string[]>();
  private readonly reals: RealItem[];
  private readonly realById = new Map<string, RealItem>();
  private badges: Badge[] = [];
  /** Pixel width of the backstory zone. */
  private readonly backstoryWidth: number;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly linkCtx: CanvasRenderingContext2D;
  private readonly overviewCtx: CanvasRenderingContext2D;
  /** Aborting this removes every listener the engine added. */
  private readonly listeners = new AbortController();
  private readonly observers: { disconnect(): void }[] = [];
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // View
  private ppd = 2.1;
  private x0 = 0;
  private ppdMin = PPD_MIN;
  private width = 800;
  private height = 500;
  private dpr = 1;
  private overviewWidth = 600;
  private overviewHeight = 58;
  private tiers: TierSizes = TIERS;
  private palette: Palette;

  // State set by the host
  private filter: EventFilter;
  private selectedId: string | null = null;
  private selectedRealId: string | null = null;
  private laneVisible = true;
  /** Event ids of the active thread, in story order; drawn as a path. */
  private threadPath: readonly string[] | null = null;

  // Derived
  private hoveredId: string | null = null;
  private hoveredRealId: string | null = null;
  private layoutKey = '';
  private filterVersion = 0;
  private level: ZoomLevel | null = null;
  /** View last reported to the host, as a comparable string. */
  private viewKey = '';

  // Motion
  private frameRequest = 0;
  private flight: Flight | null = null;
  private zoomTarget: ZoomTarget | null = null;
  private inertia = 0;

  // Pointer
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private drag: Drag | null = null;
  /** True once a press has turned into a drag; suppresses the click that follows. */
  private moved = false;
  private lastDeltaX = 0;
  private lastMoveTime = 0;
  private overviewDragging = false;
  private previewTimer = 0;
  private revealTimer = 0;
  private viewTimer = 0;

  constructor(
    private readonly els: TimelineElements,
    events: readonly TimelineEvent[],
    realEvents: readonly RealEvent[],
    filter: EventFilter,
    private readonly callbacks: TimelineCallbacks,
  ) {
    this.ctx = els.axisCanvas.getContext('2d')!;
    this.linkCtx = els.linkCanvas.getContext('2d')!;
    this.overviewCtx = els.overviewCanvas.getContext('2d')!;
    this.filter = filter;
    this.palette = readPalette();

    this.items = events.map((ev) => this.createItem(ev));
    for (const item of this.items) {
      this.byId.set(item.ev.id, item);
      for (const id of item.ev.links) {
        const sources = this.linkedFrom.get(id) ?? [];
        sources.push(item.ev.id);
        this.linkedFrom.set(id, sources);
      }
    }
    this.reals = realEvents.map((ev) => this.createRealItem(ev));
    for (const real of this.reals) this.realById.set(real.ev.id, real);
    const backstoryCount = events.filter((ev) => ev.backstoryOrder != null).length;
    this.backstoryWidth = BACKSTORY_PAD * 2 + BACKSTORY_STEP * backstoryCount;

    // The stylesheet positions the lane and the card viewport from these, so each height has one source.
    els.stage.style.setProperty('--axis-h', `${AXIS_HEIGHT}px`);
    els.stage.style.setProperty('--lane-h', `${LANE_HEIGHT}px`);
    els.world.style.transform = `translate3d(0,${CARDS_PAD}px,0)`;

    this.bindStage();
    this.bindCards();
    this.bindLane();
    this.bindOverview();
    this.observeEnvironment();

    // Opening view: months, starting in spring 1997.
    this.measure();
    this.measureLaneLabels();
    this.ppd = clamp(this.width < COMPACT_WIDTH ? 1.6 : 2.3, this.ppdMin, PPD_MAX);
    this.x0 = 40 - (toDay('1997-03-01') - DOMAIN_START) * this.ppd;
    this.draw();
    this.viewKey = this.currentViewKey();
  }

  /* ── Public API ── */

  /** Apply new filters: reading progress, categories, search text, person, thread. */
  setFilter(filter: EventFilter): void {
    this.filter = filter;
    this.filterVersion++;
    for (const item of this.items) item.visible = matchesFilter(item.ev, filter);
    for (const real of this.reals) this.guardReal(real);
    this.markRelated();
    this.requestDraw();
  }

  /** Mark an event as selected and, depending on `reveal`, bring its card into view; null clears. */
  setSelected(id: string | null, reveal: Reveal = 'ifNeeded'): void {
    const hadSelection = this.selectedId !== null;
    if (this.selectedId) this.byId.get(this.selectedId)?.card.classList.remove('is-sel');
    this.selectedId = id;
    this.cancelPreview();
    window.clearTimeout(this.revealTimer);

    const item = id ? this.byId.get(id) : undefined;
    if (item) {
      item.card.classList.add('is-sel');
      if (reveal !== 'none') {
        const center = reveal === 'center';
        // On first selection the host's detail panel is still opening; wait for the stage to settle.
        if (hadSelection || this.reducedMotion) this.reveal(item, center);
        else this.revealTimer = window.setTimeout(() => this.reveal(item, center), 420);
      }
    }
    this.markRelated();
    this.requestDraw();
  }

  /** Highlight a real-history entry and tie it to the events that answer it; null clears. */
  setSelectedReal(id: string | null): void {
    if (this.selectedRealId) this.realById.get(this.selectedRealId)?.el.classList.remove('is-sel');
    this.selectedRealId = id;
    const real = id ? this.realById.get(id) : undefined;
    if (real) {
      real.el.classList.add('is-sel');
      const x = this.x0 + (real.ev.day - DOMAIN_START) * this.ppd;
      if (x < 60 || x > this.width - 200) {
        this.flyTo({ days: real.ev.day - DOMAIN_START, px: 0 }, this.ppd, this.width * 0.4, 620);
      }
    }
    this.markRelated();
    this.requestDraw();
  }

  /** Show or hide the real-history lane. */
  setLaneVisible(visible: boolean): void {
    if (visible === this.laneVisible) return;
    this.laneVisible = visible;
    this.els.stage.style.setProperty('--lane-h', `${visible ? LANE_HEIGHT : 0}px`);
    this.els.stage.classList.toggle('lane-off', !visible);
    this.measure();
    this.requestDraw();
  }

  /** Draw a numbered path through these events (a thread, in story order); null removes it. */
  setThreadPath(ids: readonly string[] | null): void {
    this.threadPath = ids;
    this.requestDraw();
  }

  /** Multiply the zoom, keeping the centre of the stage fixed. */
  zoomBy(factor: number): void {
    this.zoomTo(this.targetPpd() * factor, this.width / 2);
  }

  /** Jump to a tick level, zooming around the selected card if it is on screen. */
  setLevel(level: ZoomLevel): void {
    const selected = this.selectedId ? this.byId.get(this.selectedId) : undefined;
    const onScreen = selected && !selected.off && selected.sx > 0 && selected.sx < this.width;
    const screenX = onScreen ? selected.sx : this.width / 2;
    this.flyTo(this.anchorAt(screenX), LEVEL_PPD[level], screenX, 800);
  }

  /** Fly to the backstory zone, the 2008 frame scene, or a volume's date range. */
  jumpTo(target: JumpTarget): void {
    const W = this.width;
    if (target === 'backstory') {
      this.flyTo({ days: 0, px: -this.backstoryWidth / 2 }, this.ppd, Math.min(W / 2, this.backstoryWidth / 2 + 30));
      return;
    }
    if (target === 'crash') {
      // Leave room to the right of the date for the card itself.
      const screenX = clamp(W * 0.42, 16, Math.max(16, W - this.tiers.l.w - 24));
      this.flyTo({ days: CRASH_DAY - DOMAIN_START, px: 0 }, Math.max(this.ppd, 1.2), screenX);
      return;
    }
    this.fitEvents(this.items.filter((it) => it.ev.volume === target).map((it) => it.ev.id));
  }

  /** Zoom and pan so that the given events fill the stage. */
  fitEvents(ids: readonly string[]): void {
    const days: number[] = [];
    for (const id of ids) {
      const ev = this.byId.get(id)?.ev;
      if (ev?.day != null) days.push(ev.day, ev.endDay ?? ev.day);
    }
    // The 2008 frame scene sits five years past everything else; leave it out unless it is all there is.
    const early = days.filter((d) => d < CRASH_DAY);
    const range = early.length ? early : days;
    if (!range.length) return;
    const first = Math.min(...range);
    const last = Math.max(...range);
    const room = this.width - 330;
    const ppd = clamp(room / Math.max(30, last - first), this.ppdMin, 6);
    if ((last - first) * ppd > room + 1) {
      // Too long to fit even fully zoomed out: start at the first event.
      this.flyTo({ days: first - DOMAIN_START, px: 0 }, ppd, 40);
    } else {
      this.flyTo({ days: (first + last) / 2 - DOMAIN_START, px: 0 }, ppd, (this.width - 250) / 2 + 20);
    }
  }

  /** Pan horizontally by a number of pixels. */
  panBy(dx: number): void {
    this.stopMotion();
    this.x0 += dx;
    this.requestDraw();
  }

  /** The current zoom and the timeline point at the centre of the stage. */
  getView(): ViewState {
    return { ppd: this.ppd, ...this.anchorAt(this.width / 2) };
  }

  /** Restore a view returned by `getView`. */
  setView(view: ViewState): void {
    this.stopMotion();
    this.ppd = clamp(view.ppd, this.ppdMin, PPD_MAX);
    this.x0 = this.width / 2 - (view.days * this.ppd + view.px);
    this.draw();
    this.viewKey = this.currentViewKey();
  }

  /** Remove listeners, observers, timers and generated DOM. The instance is unusable afterwards. */
  destroy(): void {
    this.listeners.abort();
    for (const o of this.observers) o.disconnect();
    cancelAnimationFrame(this.frameRequest);
    window.clearTimeout(this.previewTimer);
    window.clearTimeout(this.revealTimer);
    window.clearTimeout(this.viewTimer);
    this.els.world.replaceChildren();
    for (const real of this.reals) real.el.remove();
    this.els.stage.classList.remove('dragging', 'compact', 'has-sel', 'lane-off');
    this.els.stage.style.removeProperty('--axis-h');
    this.els.stage.style.removeProperty('--lane-h');
  }

  /* ── Cards ── */

  /** Build the DOM for one event. `.ev` carries x (every frame); `.ev-y` carries y (CSS-animated). */
  private createItem(ev: TimelineEvent): Item {
    const el = document.createElement('div');
    el.className = `ev cat-${ev.category}`;
    const yEl = document.createElement('div');
    yEl.className = 'ev-y';

    let spanEl: HTMLDivElement | null = null;
    if (ev.endDay != null) {
      spanEl = document.createElement('div');
      spanEl.className = 'span';
      yEl.appendChild(spanEl);
    }

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card tier-s';
    card.dataset.id = ev.id;
    card.setAttribute('aria-label', `${ev.title}, ${ev.when}`);
    card.innerHTML =
      '<div class="thumb"></div>' +
      `<div class="body"><span class="glyph" aria-hidden="true">${CATEGORY_BY_ID[ev.category].glyph}</span>` +
      `<div class="txt"><div class="title">${escapeHtml(ev.title)}</div>` +
      `<div class="meta">${escapeHtml(ev.when)} · Vol. ${ev.volume}</div>` +
      `<p class="brief">${escapeHtml(ev.brief)}</p></div></div>`;

    yEl.appendChild(card);
    el.appendChild(yEl);
    this.els.world.appendChild(el);

    return {
      ev, el, yEl, card, spanEl,
      thumb: card.firstElementChild as HTMLElement,
      tier: 's', y: -1, sx: 0, width: 0, spanWidth: 0, shift: 0,
      off: false, visible: matchesFilter(ev, this.filter), laidOut: false, hasArt: false, badge: null,
    };
  }

  /** Pictures are built lazily, the first time a card grows to the illustrated size. */
  private ensureArt(item: Item): void {
    if (item.hasArt) return;
    const { ev } = item;
    const image = eventImage(ev.id);
    const picture = image
      ? `<img class="photo" src="${escapeHtml(image)}" alt="" draggable="false">`
      : `<div class="art">${illustrationSvg(ev.motif, ev.id)}</div>`;
    const figure = ev.figure ? `<span class="fig">${escapeHtml(ev.figure)}</span>` : '';
    item.thumb.innerHTML = picture + figure;
    item.hasArt = true;
  }

  /** Build the lane entry for one real event: a marker on the baseline with a label above it. */
  private createRealItem(ev: RealEvent): RealItem {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `rh t-${ev.treatment}`;
    el.dataset.id = ev.id;
    el.setAttribute('aria-label', `Real history: ${ev.title}, ${ev.when}`);
    el.innerHTML = `<span class="rh-l">${escapeHtml(ev.title)}</span><i class="rh-m" aria-hidden="true"></i>`;
    this.els.lane.appendChild(el);
    const real: RealItem = { ev, el, labelWidth: 0, sx: 0, off: false, hidden: false };
    this.guardReal(real);
    return real;
  }

  /** Hide a real-history entry whose counterparts all lie beyond the reader's progress. */
  private guardReal(real: RealItem): void {
    real.hidden = real.ev.volume > this.filter.maxVolume;
    real.el.hidden = real.hidden;
  }

  /** Dim every card that is not the selection or tied to it. */
  private markRelated(): void {
    const related = new Set<string>();
    const selected = this.selectedId ? this.byId.get(this.selectedId) : undefined;
    if (selected) {
      for (const id of selected.ev.links) related.add(id);
      for (const id of this.linkedFrom.get(selected.ev.id) ?? []) related.add(id);
    }
    const real = this.selectedRealId ? this.realById.get(this.selectedRealId) : undefined;
    if (real) for (const id of real.ev.counterparts) related.add(id);

    for (const item of this.items) item.card.classList.toggle('rel', related.has(item.ev.id));
    for (const r of this.reals) {
      r.el.classList.toggle('rel', selected != null && r.ev.counterparts.includes(selected.ev.id));
    }
    // A selection hidden by the filters has nothing to set the other cards against.
    this.els.stage.classList.toggle('has-sel', selected?.visible === true || real != null);
  }

  /* ── Geometry ── */

  /** Stage y of the first row of cards. */
  private get cardsTop(): number {
    return AXIS_HEIGHT + this.laneHeight + CARDS_PAD;
  }

  private get laneHeight(): number {
    return this.laneVisible ? LANE_HEIGHT : 0;
  }

  /** X of an event relative to the start of the axis. Backstory events ignore the zoom. */
  private worldX(ev: TimelineEvent, ppd: number): number {
    if (ev.backstoryOrder != null) {
      return -this.backstoryWidth + BACKSTORY_PAD + (ev.backstoryOrder - 1) * BACKSTORY_STEP;
    }
    return ((ev.day ?? DOMAIN_START) - DOMAIN_START) * ppd;
  }

  private anchorAt(screenX: number): Anchor {
    return screenX < this.x0 ? { days: 0, px: screenX - this.x0 } : { days: (screenX - this.x0) / this.ppd, px: 0 };
  }

  private anchorOf(ev: TimelineEvent): Anchor {
    return ev.backstoryOrder != null
      ? { days: 0, px: this.worldX(ev, 1) }
      : { days: (ev.day ?? DOMAIN_START) - DOMAIN_START, px: 0 };
  }

  /** Zoom currently being eased toward, so repeated steps compound mid-animation. */
  private targetPpd(): number {
    return this.zoomTarget ? this.zoomTarget.ppd : this.ppd;
  }

  /** Where a card (or the badge it is folded into) sits in the card viewport. */
  private boxOf(item: Item): Box {
    if (item.badge) return { x: this.x0 + item.badge.worldX, y: CARDS_PAD + item.badge.y, w: BADGE.w, h: BADGE.h };
    const size = this.tiers[item.tier];
    return { x: item.sx + item.shift, y: CARDS_PAD + item.y, w: size.w, h: size.h };
  }

  /* ── Layout ── */

  /** Pack the visible cards for a given zoom. Pure: it reads state but changes nothing. */
  private pack(ppd: number): { shown: Item[]; packing: Packing } {
    const shown = this.items.filter((it) => it.visible);
    const packing = packCards(
      shown.map((it) => ({
        x: this.worldX(it.ev, ppd),
        spanWidth: it.ev.day != null && it.ev.endDay != null ? (it.ev.endDay - it.ev.day) * ppd : 0,
        marquee: it.ev.marquee === true,
      })),
      this.tiers,
      Math.max(120, this.height - this.cardsTop - BOTTOM_PAD),
    );
    return { shown, packing };
  }

  /**
   * Re-pack the cards. Depends only on zoom, stage height, card sizes and filters, so neither panning
   * nor a change of width (the side panel sliding in) re-runs it.
   * Changes are applied to the DOM only where they differ, to keep CSS transitions smooth.
   */
  private layout(): void {
    const key = [this.ppd.toFixed(4), this.height, this.filterVersion, this.tiers.s.w, this.laneVisible].join('|');
    if (key === this.layoutKey) return;
    this.layoutKey = key;

    const { shown, packing } = this.pack(this.ppd);
    this.syncBadges(packing, shown);

    shown.forEach((item, i) => {
      const p = packing.placements[i];
      const size = this.tiers[p.tier];
      const badge = p.cluster >= 0 ? this.badges[p.cluster] : null;
      item.width = p.width;
      item.spanWidth = item.ev.day != null && item.ev.endDay != null ? (item.ev.endDay - item.ev.day) * this.ppd : 0;
      item.laidOut = true;

      if (badge !== item.badge) {
        if (!badge !== !item.badge) item.el.classList.toggle('clustered', badge != null);
        item.badge = badge;
      }
      if (p.tier !== item.tier) {
        item.card.classList.replace(`tier-${item.tier}`, `tier-${p.tier}`);
        item.tier = p.tier;
        if (p.tier === 'l') this.ensureArt(item);
      }
      if (p.y !== item.y) {
        item.y = p.y;
        item.yEl.style.transform = `translateY(${p.y}px)`;
      }
      if (item.spanEl) {
        item.spanEl.style.width = `${Math.max(0, item.spanWidth)}px`;
        item.spanEl.style.setProperty('--h', `${size.h}px`);
        item.spanEl.style.display = item.spanWidth > size.w + 4 ? '' : 'none';
      }
    });

    for (const item of this.items) item.el.classList.toggle('gone', !item.visible);
    this.layoutLane();
  }

  /** Match the pool of badge elements to the clusters of the latest packing. */
  private syncBadges(packing: Packing, shown: Item[]): void {
    while (this.badges.length > packing.clusters.length) this.badges.pop()!.el.remove();
    packing.clusters.forEach((cluster, i) => {
      let badge = this.badges[i];
      if (!badge) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'badge';
        this.els.world.appendChild(el);
        badge = this.badges[i] = { el, worldX: 0, y: 0, members: [] };
      }
      badge.worldX = cluster.x;
      badge.y = cluster.y;
      badge.members = cluster.members.map((index) => shown[index]);

      const count = badge.members.length;
      const titles = badge.members.slice(0, 8).map((m) => m.ev.title);
      if (count > titles.length) titles.push(`and ${count - titles.length} more`);
      const categories = [...new Set(badge.members.map((m) => m.ev.category))].slice(0, 5);
      badge.el.title = titles.join('\n');
      badge.el.setAttribute('aria-label', `${count} more event${count === 1 ? '' : 's'} here. Zoom in to show.`);
      badge.el.dataset.index = String(i);
      badge.el.innerHTML =
        `<b>+${count}</b> more<span class="dots">` +
        categories.map((c) => `<i class="cat-${c}"></i>`).join('') +
        '</span>';
    });
  }

  /**
   * Decide which real-history entries show their label. Entries flagged `major` choose first;
   * a label that would run into one already placed is left off, and the entry shows as a marker.
   */
  private layoutLane(): void {
    if (!this.laneVisible) return;
    const taken: [number, number][] = [];
    const ordered = [...this.reals].sort((a, b) => Number(b.ev.major === true) - Number(a.ev.major === true));
    for (const real of ordered) {
      if (real.hidden) continue;
      const from = (real.ev.day - DOMAIN_START) * this.ppd - 8;
      const to = from + real.labelWidth + 16;
      const free = taken.every(([a, b]) => to <= a || from >= b);
      if (free) taken.push([from, to]);
      real.el.classList.toggle('nolabel', !free);
    }
  }

  /** Label widths, measured with the lane's font. Must match .rh-l in app.css. */
  private measureLaneLabels(): void {
    setFont(this.ctx, this.palette, 11, 'body', 600);
    for (const real of this.reals) real.labelWidth = this.ctx.measureText(real.ev.title).width + 14;
    this.layoutKey = '';
  }

  /* ── Frame ── */

  /** Keep the view inside the timeline. */
  private clampView(): void {
    const span = (DOMAIN_END - DOMAIN_START) * this.ppd;
    // A card can reach past the end of the axis (it starts at its date and extends right),
    // so the right-hand pan limit follows the furthest card edge, not just the last date.
    let contentRight = span + 48;
    for (const item of this.items) {
      if (!item.visible || !item.laidOut || item.badge) continue;
      contentRight = Math.max(contentRight, this.worldX(item.ev, this.ppd) + this.tiers[item.tier].w + 24);
    }
    const maxX0 = this.backstoryWidth + 36;
    const minX0 = Math.min(maxX0, this.width - contentRight);
    this.x0 = clamp(this.x0, minX0, maxX0);
  }

  /** Render one frame: element positions, the canvases, and notifications to the host. */
  private draw(): void {
    this.layout();
    this.clampView();
    const W = this.width;

    for (const item of this.items) {
      const x = this.x0 + this.worldX(item.ev, this.ppd);
      item.sx = x;

      // Cull cards well outside the viewport.
      const off = x + Math.max(item.width, 260) < -200 || x > W + 200;
      if (off !== item.off) {
        item.off = off;
        item.el.classList.toggle('off', off);
      }
      if (off) continue;

      item.el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;

      // A long span keeps its card in view while its range is on screen.
      if (item.spanEl) {
        const room = item.spanWidth - this.tiers[item.tier].w;
        const shift = room > 0 ? clamp(10 - x, 0, room) : 0;
        if (shift !== item.shift) {
          item.shift = shift;
          item.card.style.left = `${shift}px`;
        }
      }
    }

    for (const badge of this.badges) {
      badge.el.style.transform = `translate3d(${(this.x0 + badge.worldX).toFixed(2)}px,${badge.y}px,0)`;
    }

    if (this.laneVisible) {
      for (const real of this.reals) {
        const x = this.x0 + (real.ev.day - DOMAIN_START) * this.ppd;
        real.sx = x;
        const off = x + real.labelWidth < -40 || x > W + 40;
        if (off !== real.off) {
          real.off = off;
          real.el.classList.toggle('off', off);
        }
        if (!off) real.el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }
    }

    const focusReal = this.realById.get(this.hoveredRealId ?? this.selectedRealId ?? '');
    const frame: Frame = {
      width: W,
      height: this.height,
      ppd: this.ppd,
      x0: this.x0,
      cardsTop: this.cardsTop,
      laneHeight: this.laneHeight,
      backstoryWidth: this.backstoryWidth,
      palette: this.palette,
      items: this.items,
      selectedId: this.selectedId,
      hoveredId: this.hoveredId,
      realGuideX: focusReal ? focusReal.sx : null,
    };
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawAxis(this.ctx, frame);
    this.overviewCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawOverview(this.overviewCtx, frame, this.overviewWidth, this.overviewHeight);
    this.drawLinkOverlay(focusReal);

    const level = levelOf(this.ppd);
    if (level !== this.level) {
      this.level = level;
      this.callbacks.onLevelChange(level);
    }
    this.reportView();
  }

  /** Gather the boxes for the overlay: thread path, the selection's links, and real-history ties. */
  private drawLinkOverlay(focusReal: RealItem | undefined): void {
    const boxes = (ids: readonly string[]): Box[] => {
      const out: Box[] = [];
      let lastBadge: Badge | null = null;
      for (const id of ids) {
        const item = this.byId.get(id);
        if (!item || !item.visible || !item.laidOut) continue;
        // Several cards folded into one badge count once.
        if (item.badge && item.badge === lastBadge) continue;
        lastBadge = item.badge;
        out.push(this.boxOf(item));
      }
      return out;
    };

    const selected = this.selectedId ? this.byId.get(this.selectedId) : undefined;
    const shown = selected?.visible && selected.laidOut ? selected : undefined;
    const outgoing = shown ? shown.ev.links : [];
    const incoming = shown ? (this.linkedFrom.get(shown.ev.id) ?? []).filter((id) => !outgoing.includes(id)) : [];

    const realTies: { x: number; to: Box }[] = [];
    if (this.laneVisible) {
      if (focusReal) for (const to of boxes(focusReal.ev.counterparts)) realTies.push({ x: focusReal.sx, to });
      if (shown) {
        for (const real of this.reals) {
          if (real !== focusReal && !real.hidden && real.ev.counterparts.includes(shown.ev.id)) {
            realTies.push({ x: real.sx, to: this.boxOf(shown) });
          }
        }
      }
    }

    this.linkCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawLinks(this.linkCtx, {
      width: this.width,
      height: this.height - AXIS_HEIGHT - this.laneHeight,
      palette: this.palette,
      from: shown ? this.boxOf(shown) : null,
      outgoing: boxes(outgoing),
      incoming: boxes(incoming),
      realTies,
      path: this.threadPath ? boxes(this.threadPath) : [],
    });
  }

  private currentViewKey(): string {
    return `${this.ppd.toFixed(3)}|${this.x0.toFixed(0)}|${this.width}`;
  }

  /** Tell the host once the view has stopped changing. */
  private reportView(): void {
    const key = this.currentViewKey();
    if (key === this.viewKey) return;
    this.viewKey = key;
    window.clearTimeout(this.viewTimer);
    this.viewTimer = window.setTimeout(() => this.callbacks.onViewChange(this.getView()), VIEW_REPORT_DELAY);
  }

  /* ── Motion ── */

  /** Schedule one frame; calls within the same frame coalesce. */
  private requestDraw(): void {
    if (this.listeners.signal.aborted) return; // destroyed
    if (!this.frameRequest) this.frameRequest = requestAnimationFrame((now) => this.tick(now));
  }

  private stopMotion(): void {
    this.flight = null;
    this.zoomTarget = null;
    this.inertia = 0;
  }

  /** Advance whichever motion is active, then draw. */
  private tick(now: number): void {
    this.frameRequest = 0;
    let again = false;

    if (this.flight) {
      const f = this.flight;
      const u = clamp((now - f.startTime) / f.duration, 0, 1);
      const eased = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      this.ppd = Math.exp(f.logFrom + (f.logTo - f.logFrom) * eased);
      const screenX = f.screenFrom + (f.screenTo - f.screenFrom) * eased;
      this.x0 = screenX - (f.days * this.ppd + f.px);
      if (u < 1) again = true;
      else this.flight = null;
    } else if (this.zoomTarget) {
      // Close a fixed fraction of the remaining ratio each frame, anchor held under the cursor.
      const t = this.zoomTarget;
      const ratio = t.ppd / this.ppd;
      const settled = Math.abs(Math.log(ratio)) < 0.004;
      this.ppd = settled ? t.ppd : this.ppd * Math.pow(ratio, this.reducedMotion ? 1 : 0.26);
      this.x0 = t.screenX - (t.days * this.ppd + t.px);
      if (settled) this.zoomTarget = null;
      else again = true;
    } else if (Math.abs(this.inertia) > 0.4) {
      this.x0 += this.inertia;
      this.inertia *= 0.9;
      again = true;
    }

    this.draw();
    if (again) this.requestDraw();
  }

  /** Zoom to `ppd`, keeping the timeline point under `screenX` fixed. */
  private zoomTo(ppd: number, screenX: number, instant = false): void {
    ppd = clamp(ppd, this.ppdMin, PPD_MAX);
    this.flight = null;
    this.inertia = 0;
    // Reuse the anchor while the cursor has not moved, so repeated wheel steps do not drift.
    const current = this.zoomTarget;
    const anchor = current && Math.abs(current.screenX - screenX) < 2 ? current : this.anchorAt(screenX);
    if (instant) {
      this.ppd = ppd;
      this.x0 = screenX - (anchor.days * ppd + anchor.px);
      this.zoomTarget = null;
    } else {
      this.zoomTarget = { ppd, screenX, days: anchor.days, px: anchor.px };
    }
    this.requestDraw();
  }

  /** Animate so that `anchor` lands at `screenTo` at zoom `ppd`. */
  private flyTo(anchor: Anchor, ppd: number, screenTo: number, duration = 700): void {
    this.zoomTarget = null;
    this.inertia = 0;
    ppd = clamp(ppd, this.ppdMin, PPD_MAX);
    if (this.reducedMotion) {
      this.ppd = ppd;
      this.x0 = screenTo - (anchor.days * ppd + anchor.px);
    } else {
      // Cap the starting offset so far-away targets do not take a long slide.
      const screenFrom = clamp(this.x0 + anchor.days * this.ppd + anchor.px, -2.2 * this.width, 3.2 * this.width);
      this.flight = {
        ...anchor,
        startTime: performance.now(),
        duration,
        logFrom: Math.log(this.ppd),
        logTo: Math.log(ppd),
        screenFrom,
        screenTo,
      };
    }
    this.requestDraw();
  }

  /**
   * Bring a card into view; `center` forces it to the middle.
   * A card folded into a badge has nothing to show, so the view also zooms in until it has a slot.
   */
  private reveal(item: Item, center: boolean): void {
    const anchor = this.anchorOf(item.ev);
    const ppd = item.visible ? this.zoomWithSlotFor(item) : this.ppd;
    const size = this.tiers[item.tier];
    const screenX = this.x0 + anchor.days * this.ppd + anchor.px;
    if (ppd === this.ppd && !center && screenX > 24 && screenX + size.w < this.width - 24) {
      this.requestDraw();
      return;
    }
    const target = clamp(this.width / 2 - size.w / 2, 16, Math.max(16, this.width - size.w - 16));
    this.flyTo(anchor, ppd, target, 620);
  }

  /** The current zoom if the card has a slot there, otherwise the nearest closer zoom at which it does. */
  private zoomWithSlotFor(item: Item): number {
    let ppd = this.ppd;
    for (;;) {
      const { shown, packing } = this.pack(ppd);
      if (packing.placements[shown.indexOf(item)].cluster < 0 || ppd >= PPD_MAX) return ppd;
      ppd = Math.min(PPD_MAX, ppd * 1.5);
    }
  }

  /** Zoom in on the date range a badge stands for. */
  private openBadge(badge: Badge): void {
    const days = badge.members.flatMap((m) => (m.ev.day != null ? [m.ev.day, m.ev.endDay ?? m.ev.day] : []));
    if (!days.length) return;
    const first = Math.min(...days);
    const last = Math.max(...days);
    const fit = (this.width * 0.55) / Math.max(14, last - first);
    this.flyTo(
      { days: (first + last) / 2 - DOMAIN_START, px: 0 },
      Math.max(this.ppd * 2.2, fit),
      this.width / 2 - this.tiers.s.w / 2,
    );
  }

  /* ── Input: stage ── */

  private bindStage(): void {
    const { stage } = this.els;
    const signal = this.listeners.signal;

    stage.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0) return;
      this.cancelPreview();
      this.callbacks.onInteract();
      this.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (this.pointers.size === 1) {
        this.stopMotion();
        this.drag = { kind: 'pan', x: ev.clientX, y: ev.clientY, x0: this.x0 };
        this.moved = false;
        this.lastDeltaX = 0;
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.drag = { kind: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y), ppd: this.ppd };
        this.moved = true;
      }
    }, { signal });

    stage.addEventListener('pointermove', (ev) => {
      const previous = this.pointers.get(ev.pointerId);
      if (!previous) return;
      this.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const drag = this.drag;
      if (!drag) return;

      if (drag.kind === 'pinch') {
        const [a, b] = [...this.pointers.values()];
        if (!b) return;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const middle = (a.x + b.x) / 2 - stage.getBoundingClientRect().left;
        this.zoomTo((drag.ppd * distance) / drag.distance, middle, true);
        return;
      }

      const dx = ev.clientX - drag.x;
      // A small dead zone keeps a click from turning into a drag.
      if (!this.moved && Math.hypot(dx, ev.clientY - drag.y) > 5) {
        this.moved = true;
        stage.classList.add('dragging');
        try {
          stage.setPointerCapture(ev.pointerId);
        } catch {
          // The pointer was already released.
        }
      }
      if (this.moved) {
        this.x0 = drag.x0 + dx;
        this.lastDeltaX = ev.clientX - previous.x;
        this.lastMoveTime = performance.now();
        this.requestDraw();
      }
    }, { signal });

    const endDrag = (ev: PointerEvent) => {
      this.pointers.delete(ev.pointerId);
      // Coast only if the pointer was still moving at release.
      const coasting =
        this.drag?.kind === 'pan' && this.moved && Math.abs(this.lastDeltaX) > 2 &&
        !this.reducedMotion && performance.now() - this.lastMoveTime < 70;
      if (coasting) {
        this.inertia = clamp(this.lastDeltaX * 0.8, -18, 18);
        this.requestDraw();
      }
      if (this.pointers.size === 0) {
        this.drag = null;
        stage.classList.remove('dragging');
        window.setTimeout(() => { this.moved = false; }, 0); // after the click event has fired
      } else if (this.pointers.size === 1) {
        // One finger lifted from a pinch: carry on as a pan.
        const [p] = [...this.pointers.values()];
        this.drag = { kind: 'pan', x: p.x, y: p.y, x0: this.x0 };
      }
    };
    stage.addEventListener('pointerup', endDrag, { signal });
    stage.addEventListener('pointercancel', endDrag, { signal });

    stage.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      this.cancelPreview();
      this.callbacks.onInteract();
      // Horizontal scroll (trackpad) or Shift+wheel pans; everything else zooms.
      if (!ev.ctrlKey && Math.abs(ev.deltaX) > Math.abs(ev.deltaY) * 1.2) {
        this.panBy(-ev.deltaX);
        return;
      }
      if (ev.shiftKey && !ev.ctrlKey) {
        this.panBy(-ev.deltaY);
        return;
      }
      const unit = ev.deltaMode === 1 ? 32 : 1; // line-mode wheels report lines, not pixels
      // ctrlKey marks a trackpad pinch, which sends small deltas.
      const factor = Math.exp(-clamp(ev.deltaY * unit, -240, 240) * (ev.ctrlKey ? 0.012 : 0.0028));
      this.zoomTo(this.targetPpd() * factor, ev.clientX - stage.getBoundingClientRect().left);
    }, { passive: false, signal });

    // The browser may scroll the stage or one of its clipped children to show a focused element;
    // undo it, the view handles that. Scroll events do not bubble, hence the capture.
    stage.addEventListener('scroll', (ev) => {
      const target = ev.target as HTMLElement;
      target.scrollLeft = 0;
      target.scrollTop = 0;
    }, { capture: true, signal });
  }

  /* ── Input: cards and badges ── */

  private bindCards(): void {
    const { world } = this.els;
    const signal = this.listeners.signal;
    const itemOf = (ev: Event): Item | undefined => {
      const card = (ev.target as Element).closest?.<HTMLElement>('.card');
      return card ? this.byId.get(card.dataset.id ?? '') : undefined;
    };

    world.addEventListener('pointerover', (ev) => {
      const item = itemOf(ev);
      if (!item) return;
      if (this.hoveredId !== item.ev.id) {
        this.hoveredId = item.ev.id;
        this.requestDraw();
      }
      if (ev.pointerType !== 'mouse' || this.drag) return;
      window.clearTimeout(this.previewTimer);
      // Illustrated cards already show their image and brief.
      if (item.tier === 'l') return;
      this.previewTimer = window.setTimeout(() => {
        if (this.hoveredId === item.ev.id && !this.drag) {
          this.callbacks.onPreview({ kind: 'event', id: item.ev.id, rect: item.card.getBoundingClientRect() });
        }
      }, 140);
    }, { signal });

    world.addEventListener('pointerout', (ev) => {
      const item = itemOf(ev);
      if (!item || item.card.contains(ev.relatedTarget as Node | null)) return;
      this.hoveredId = null;
      this.cancelPreview();
      this.requestDraw();
    }, { signal });

    world.addEventListener('click', (ev) => {
      if (this.moved) return;
      const item = itemOf(ev);
      if (item) {
        this.callbacks.onSelect(item.ev.id);
        return;
      }
      const badge = (ev.target as Element).closest?.<HTMLElement>('.badge');
      if (badge) this.openBadge(this.badges[Number(badge.dataset.index)]);
    }, { signal });

    // Keyboard focus on an off-screen card brings it into view.
    world.addEventListener('focusin', (ev) => {
      const item = itemOf(ev);
      if (item && item.card.matches(':focus-visible')) this.reveal(item, false);
    }, { signal });
  }

  private cancelPreview(): void {
    window.clearTimeout(this.previewTimer);
    this.callbacks.onPreview(null);
  }

  /* ── Input: real-history lane ── */

  private bindLane(): void {
    const { lane } = this.els;
    const signal = this.listeners.signal;
    const realOf = (ev: Event): RealItem | undefined => {
      const el = (ev.target as Element).closest?.<HTMLElement>('.rh');
      return el ? this.realById.get(el.dataset.id ?? '') : undefined;
    };

    lane.addEventListener('pointerover', (ev) => {
      const real = realOf(ev);
      if (!real || this.hoveredRealId === real.ev.id) return;
      this.hoveredRealId = real.ev.id;
      this.requestDraw();
      if (ev.pointerType !== 'mouse' || this.drag) return;
      window.clearTimeout(this.previewTimer);
      this.previewTimer = window.setTimeout(() => {
        if (this.hoveredRealId !== real.ev.id || this.drag) return;
        // Anchor to whichever part is showing: the label, or the bare marker.
        const part = real.el.querySelector(real.el.classList.contains('nolabel') ? '.rh-m' : '.rh-l') ?? real.el;
        this.callbacks.onPreview({ kind: 'real', id: real.ev.id, rect: part.getBoundingClientRect() });
      }, 140);
    }, { signal });

    lane.addEventListener('pointerout', (ev) => {
      const real = realOf(ev);
      if (!real || real.el.contains(ev.relatedTarget as Node | null)) return;
      this.hoveredRealId = null;
      this.cancelPreview();
      this.requestDraw();
    }, { signal });

    lane.addEventListener('click', (ev) => {
      const real = realOf(ev);
      if (real && !this.moved) this.callbacks.onSelectReal(real.ev.id);
    }, { signal });
  }

  /* ── Input: overview strip ── */

  private bindOverview(): void {
    const { overview } = this.els;
    const signal = this.listeners.signal;
    /** Centre the main view on a strip position. */
    const moveTo = (ev: PointerEvent) => {
      const scale = overviewScale(this.overviewWidth, { ppd: this.ppd, x0: this.x0, backstoryWidth: this.backstoryWidth });
      this.stopMotion();
      this.x0 = this.width / 2 - scale.worldOfX(ev.clientX - overview.getBoundingClientRect().left);
      this.requestDraw();
    };
    overview.addEventListener('pointerdown', (ev) => {
      this.overviewDragging = true;
      overview.setPointerCapture(ev.pointerId);
      this.callbacks.onInteract();
      moveTo(ev);
    }, { signal });
    overview.addEventListener('pointermove', (ev) => {
      if (this.overviewDragging) moveTo(ev);
    }, { signal });
    const stop = () => { this.overviewDragging = false; };
    overview.addEventListener('pointerup', stop, { signal });
    overview.addEventListener('pointercancel', stop, { signal });
  }

  /* ── Environment: size, theme, fonts ── */

  /** Re-measure the stage and strip, resize the canvases, and pick card sizes for the width. */
  private measure(): void {
    const { stage, axisCanvas, linkCanvas, overview, overviewCanvas } = this.els;
    const rect = stage.getBoundingClientRect();
    // A hidden stage has no size; keep the last measurements until it is shown again.
    if (rect.width === 0 || rect.height === 0) return;
    this.width = Math.max(200, rect.width);
    this.height = Math.max(200, rect.height);
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    fitCanvas(axisCanvas, this.width * this.dpr, this.height * this.dpr);
    fitCanvas(linkCanvas, this.width * this.dpr, (this.height - AXIS_HEIGHT - this.laneHeight) * this.dpr);

    const strip = overview.getBoundingClientRect();
    this.overviewWidth = Math.max(100, strip.width);
    this.overviewHeight = Math.max(30, strip.height);
    fitCanvas(overviewCanvas, this.overviewWidth * this.dpr, this.overviewHeight * this.dpr);

    const compact = this.width < COMPACT_WIDTH;
    stage.classList.toggle('compact', compact);
    this.tiers = compact ? TIERS_COMPACT : TIERS;

    // Never zoom out past the point where the whole axis fits.
    this.ppdMin = Math.max(PPD_MIN, (this.width - 90) / (DOMAIN_END - DOMAIN_START));
    if (this.ppd < this.ppdMin) this.ppd = this.ppdMin;
  }

  private observeEnvironment(): void {
    const resize = new ResizeObserver(() => {
      this.measure();
      // Resizing a canvas clears it, and observers run after the frame's animation callbacks. Draw now:
      // a deferred draw would leave the cleared canvas on screen for every frame of a panel animation.
      this.draw();
    });
    resize.observe(this.els.stage);
    this.observers.push(resize);

    // Canvas colours and text widths are resolved values, so re-read them when the theme or fonts change.
    const refresh = () => {
      this.palette = readPalette();
      this.measureLaneLabels();
      this.requestDraw();
    };
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', refresh, { signal: this.listeners.signal });
    const theme = new MutationObserver(refresh);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    this.observers.push(theme);
    void document.fonts?.ready.then(refresh);
  }
}
