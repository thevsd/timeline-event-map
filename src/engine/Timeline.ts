import { illustrationSvg } from '../art/illustration';
import { CATEGORY_BY_ID } from '../data/categories';
import { matchesFilter } from '../data';
import type { EventFilter, TimelineEvent } from '../data/types';
import { CRASH_DAY, DOMAIN_END, DOMAIN_START, toDay } from '../lib/time';
import {
  BACKSTORY_PAD, BACKSTORY_STEP, BOTTOM_PAD, CARDS_TOP, COMPACT_WIDTH, LEVEL_PPD, PPD_MAX, PPD_MIN,
  TIERS, TIERS_COMPACT, clamp, levelOf, type TierSizes, type ZoomLevel,
} from './config';
import { drawAxis } from './drawAxis';
import { drawOverview, overviewScale } from './drawOverview';
import { packCards } from './layout';
import { readPalette, type Palette } from './palette';
import type { Frame, Item, JumpTarget, TimelineCallbacks } from './types';

/** DOM nodes the engine draws into. The host creates them; the engine owns their contents. */
export interface TimelineElements {
  stage: HTMLElement;
  /** Container for the event cards, inside the stage. */
  world: HTMLElement;
  axisCanvas: HTMLCanvasElement;
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

type Drag =
  | { kind: 'pan'; x: number; y: number; x0: number; scrollY: number }
  | { kind: 'pinch'; distance: number; ppd: number };

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (ch) => HTML_ESCAPES[ch]);

/**
 * The timeline engine: a zoomable time axis with event cards packed beneath it.
 *
 * Framework-free. A canvas draws the axis, gridlines, markers and the overview strip; DOM buttons
 * are the cards, so they keep real text, focus and CSS transitions. The view is two numbers:
 * `ppd` (pixels per day) and `x0` (screen x of the start of the axis).
 *
 * The host passes data and state in through the public methods and listens through callbacks.
 */
export class Timeline {
  private readonly items: Item[];
  private readonly byId = new Map<string, Item>();
  /** Pixel width of the backstory zone. */
  private readonly backstoryWidth: number;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly overviewCtx: CanvasRenderingContext2D;
  /** Aborting this removes every listener the engine added. */
  private readonly listeners = new AbortController();
  private readonly observers: { disconnect(): void }[] = [];
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // View
  private ppd = 2.1;
  private x0 = 0;
  private scrollY = 0;
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

  // Derived
  private hoveredId: string | null = null;
  private layoutKey = '';
  private filterVersion = 0;
  private level: ZoomLevel | null = null;
  private overflowing = false;

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

  constructor(
    private readonly els: TimelineElements,
    events: readonly TimelineEvent[],
    filter: EventFilter,
    private readonly callbacks: TimelineCallbacks,
  ) {
    this.ctx = els.axisCanvas.getContext('2d')!;
    this.overviewCtx = els.overviewCanvas.getContext('2d')!;
    this.filter = filter;
    this.palette = readPalette();

    this.items = events.map((ev) => this.createItem(ev));
    for (const item of this.items) this.byId.set(item.ev.id, item);
    const backstoryCount = events.filter((ev) => ev.backstoryOrder != null).length;
    this.backstoryWidth = BACKSTORY_PAD * 2 + BACKSTORY_STEP * backstoryCount;

    this.bindStage();
    this.bindCards();
    this.bindOverview();
    this.observeEnvironment();

    // Opening view: months, starting in spring 1997.
    this.measure();
    this.ppd = clamp(this.width < COMPACT_WIDTH ? 1.6 : 2.3, this.ppdMin, PPD_MAX);
    this.x0 = 40 - (toDay('1997-03-01') - DOMAIN_START) * this.ppd;
    this.draw();
  }

  /* ── Public API ── */

  /** Apply new category toggles and search text. */
  setFilter(filter: EventFilter): void {
    this.filter = filter;
    this.filterVersion++;
    for (const item of this.items) item.visible = matchesFilter(item.ev, filter);
    this.requestDraw();
  }

  /**
   * Mark an event as selected and bring its card into view; null clears the selection.
   * @param center Move the card to the middle even if it is already on screen.
   */
  setSelected(id: string | null, center = false): void {
    const hadSelection = this.selectedId !== null;
    if (this.selectedId) this.byId.get(this.selectedId)?.card.classList.remove('is-sel');
    this.selectedId = id;
    this.cancelPreview();
    window.clearTimeout(this.revealTimer);

    const item = id ? this.byId.get(id) : undefined;
    if (item) {
      item.card.classList.add('is-sel');
      // On first selection the host's detail panel is still opening; wait for the stage to settle.
      if (hadSelection || this.reducedMotion) this.reveal(item, center);
      else this.revealTimer = window.setTimeout(() => this.reveal(item, center), 420);
    }
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
      this.flyTo({ days: CRASH_DAY - DOMAIN_START, px: 0 }, Math.max(this.ppd, 1.2), W * 0.42);
      return;
    }
    // Fit the volume's events. The frame scene is filed under Vol. 1 but sits in 2008, so skip it.
    const days: number[] = [];
    for (const { ev } of this.items) {
      if (ev.volume !== target || ev.day == null || ev.day >= CRASH_DAY) continue;
      days.push(ev.day, ev.endDay ?? ev.day);
    }
    if (!days.length) return;
    const first = Math.min(...days);
    const last = Math.max(...days);
    const ppd = clamp((W - 330) / Math.max(30, last - first), this.ppdMin, 6);
    this.flyTo({ days: (first + last) / 2 - DOMAIN_START, px: 0 }, ppd, (W - 250) / 2 + 20);
  }

  /** Pan horizontally by a number of pixels. */
  panBy(dx: number): void {
    this.stopMotion();
    this.x0 += dx;
    this.requestDraw();
  }

  /** Remove listeners, observers, timers and cards. The instance is unusable afterwards. */
  destroy(): void {
    this.listeners.abort();
    for (const o of this.observers) o.disconnect();
    cancelAnimationFrame(this.frameRequest);
    window.clearTimeout(this.previewTimer);
    window.clearTimeout(this.revealTimer);
    this.els.world.replaceChildren();
    this.els.stage.classList.remove('dragging', 'overflow', 'compact');
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
      off: false, visible: matchesFilter(ev, this.filter), laidOut: false, hasArt: false,
    };
  }

  /** Illustrations are built lazily, the first time a card grows to the illustrated size. */
  private ensureArt(item: Item): void {
    if (item.hasArt) return;
    const { ev } = item;
    const figure = ev.figure ? `<span class="fig">${escapeHtml(ev.figure)}</span>` : '';
    item.thumb.innerHTML = `<div class="art">${illustrationSvg(ev.motif, ev.id)}</div>${figure}`;
    item.hasArt = true;
  }

  /* ── Geometry ── */

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

  /* ── Layout ── */

  /**
   * Re-pack the cards. Depends only on zoom, stage size and filters, so panning never re-runs it.
   * Changes are applied to the DOM only where they differ, to keep CSS transitions smooth.
   */
  private layout(): void {
    const key = `${this.ppd.toFixed(4)}|${this.width}|${this.height}|${this.filterVersion}|${this.tiers.s.w}`;
    if (key === this.layoutKey) return;
    this.layoutKey = key;

    const shown = this.items.filter((it) => it.visible);
    const availableHeight = Math.max(120, this.height - CARDS_TOP - BOTTOM_PAD);
    const placements = packCards(
      shown.map((it) => ({
        x: this.worldX(it.ev, this.ppd),
        spanWidth: it.ev.day != null && it.ev.endDay != null ? (it.ev.endDay - it.ev.day) * this.ppd : 0,
        marquee: it.ev.marquee === true,
      })),
      this.tiers,
      availableHeight,
    );

    shown.forEach((item, i) => {
      const p = placements[i];
      const size = this.tiers[p.tier];
      item.width = p.width;
      item.spanWidth = item.ev.day != null && item.ev.endDay != null ? (item.ev.endDay - item.ev.day) * this.ppd : 0;
      item.laidOut = true;

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
  }

  /* ── Frame ── */

  /** Keep the view inside the timeline, and the vertical scroll inside what is on screen. */
  private clampView(): void {
    const span = (DOMAIN_END - DOMAIN_START) * this.ppd;
    const maxX0 = this.backstoryWidth + 36;
    const minX0 = Math.min(maxX0, this.width - 48 - span);
    this.x0 = clamp(this.x0, minX0, maxX0);

    // Tallest stack among the cards currently in view.
    let tallest = 0;
    for (const item of this.items) {
      if (!item.visible || !item.laidOut) continue;
      const x = this.x0 + this.worldX(item.ev, this.ppd);
      if (x < this.width && x + item.width > 0) tallest = Math.max(tallest, item.y + this.tiers[item.tier].h);
    }
    const maxScroll = Math.max(0, tallest + CARDS_TOP + BOTTOM_PAD - this.height);
    this.scrollY = clamp(this.scrollY, 0, maxScroll);

    const overflowing = maxScroll - this.scrollY > 24;
    if (overflowing !== this.overflowing) {
      this.overflowing = overflowing;
      this.els.stage.classList.toggle('overflow', overflowing);
    }
  }

  /** Render one frame: card positions, both canvases, and the tick-level notification. */
  private draw(): void {
    this.layout();
    this.clampView();
    this.els.world.style.transform = `translate3d(0,${CARDS_TOP - this.scrollY}px,0)`;

    for (const item of this.items) {
      const x = this.x0 + this.worldX(item.ev, this.ppd);
      item.sx = x;

      // Cull cards well outside the viewport.
      const off = x + Math.max(item.width, 260) < -200 || x > this.width + 200;
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

    const frame: Frame = {
      width: this.width,
      height: this.height,
      ppd: this.ppd,
      x0: this.x0,
      scrollY: this.scrollY,
      backstoryWidth: this.backstoryWidth,
      palette: this.palette,
      items: this.items,
      selectedId: this.selectedId,
      hoveredId: this.hoveredId,
    };
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawAxis(this.ctx, frame);
    this.overviewCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawOverview(this.overviewCtx, frame, this.overviewWidth, this.overviewHeight);

    const level = levelOf(this.ppd);
    if (level !== this.level) {
      this.level = level;
      this.callbacks.onLevelChange(level);
    }
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

  /** Bring a card into view; `center` forces it to the middle. */
  private reveal(item: Item, center: boolean): void {
    const anchor = this.anchorOf(item.ev);
    const size = this.tiers[item.tier];
    const screenX = this.x0 + anchor.days * this.ppd + anchor.px;
    if (!center && screenX > 24 && screenX + size.w < this.width - 24) {
      this.requestDraw();
      return;
    }
    const target = clamp(this.width / 2 - size.w / 2, 16, Math.max(16, this.width - size.w - 16));
    this.flyTo(anchor, this.ppd, target, 620);
    const needed = item.y + size.h + CARDS_TOP + BOTTOM_PAD - this.height;
    if (this.scrollY < needed) this.scrollY = needed;
    if (item.y < this.scrollY) this.scrollY = item.y;
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
        this.drag = { kind: 'pan', x: ev.clientX, y: ev.clientY, x0: this.x0, scrollY: this.scrollY };
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
      const dy = ev.clientY - drag.y;
      // A small dead zone keeps a click from turning into a drag.
      if (!this.moved && Math.hypot(dx, dy) > 5) {
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
        this.scrollY = drag.scrollY - dy;
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
        this.drag = { kind: 'pan', x: p.x, y: p.y, x0: this.x0, scrollY: this.scrollY };
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

    // The browser may scroll the stage itself to show a focused card; undo it, the view handles that.
    stage.addEventListener('scroll', () => {
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
    }, { signal });
  }

  /* ── Input: cards ── */

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
          this.callbacks.onPreview({ id: item.ev.id, rect: item.card.getBoundingClientRect() });
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
      const item = itemOf(ev);
      if (item && !this.moved) this.callbacks.onSelect(item.ev.id);
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
    const { stage, axisCanvas, overview, overviewCanvas } = this.els;
    const rect = stage.getBoundingClientRect();
    this.width = Math.max(200, rect.width);
    this.height = Math.max(200, rect.height);
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    axisCanvas.width = Math.round(this.width * this.dpr);
    axisCanvas.height = Math.round(this.height * this.dpr);

    const strip = overview.getBoundingClientRect();
    this.overviewWidth = Math.max(100, strip.width);
    this.overviewHeight = Math.max(30, strip.height);
    overviewCanvas.width = Math.round(this.overviewWidth * this.dpr);
    overviewCanvas.height = Math.round(this.overviewHeight * this.dpr);

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
      this.requestDraw();
    });
    resize.observe(this.els.stage);
    this.observers.push(resize);

    // Canvas colours are resolved values, so re-read them when the theme or fonts change.
    const recolor = () => {
      this.palette = readPalette();
      this.requestDraw();
    };
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', recolor, { signal: this.listeners.signal });
    const theme = new MutationObserver(recolor);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    this.observers.push(theme);
    void document.fonts?.ready.then(recolor);
  }
}
