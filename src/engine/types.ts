import type { TimelineEvent } from '../data/types';
import type { Tier, ZoomLevel } from './config';
import type { Palette } from './palette';

/** Per-event runtime state: DOM nodes plus the latest layout and screen position. */
export interface Item {
  ev: TimelineEvent;
  /** Outer wrapper; carries x and is updated every frame. */
  el: HTMLDivElement;
  /** Inner wrapper; carries y and animates with a CSS transition. */
  yEl: HTMLDivElement;
  card: HTMLButtonElement;
  thumb: HTMLElement;
  /** Range band for events that span a period. */
  spanEl: HTMLDivElement | null;
  tier: Tier;
  y: number;
  /** Screen x of the event's date. */
  sx: number;
  /** Width reserved by the layout. */
  width: number;
  /** Pixel width of the span at the current zoom. */
  spanWidth: number;
  /** How far the card has slid along its span to stay in view. */
  shift: number;
  /** Culled: far outside the viewport. */
  off: boolean;
  /** Passes the current filters. */
  visible: boolean;
  /** Has been through the layout at least once. */
  laidOut: boolean;
  hasArt: boolean;
}

/** Everything the canvas renderers need for one frame. */
export interface Frame {
  /** Stage size in CSS pixels. */
  width: number;
  height: number;
  /** Pixels per day. */
  ppd: number;
  /** Screen x of the start of the axis. */
  x0: number;
  /** Vertical scroll of the card area. */
  scrollY: number;
  /** Pixel width of the backstory zone. */
  backstoryWidth: number;
  palette: Palette;
  items: readonly Item[];
  selectedId: string | null;
  hoveredId: string | null;
}

/** What the engine reports to its host. */
export interface TimelineCallbacks {
  /** A card was clicked or tapped. */
  onSelect(id: string): void;
  /** The pointer rests on a card that has no illustration; null when it leaves. */
  onPreview(preview: { id: string; rect: DOMRect } | null): void;
  /** The axis switched tick level. */
  onLevelChange(level: ZoomLevel): void;
  /** The user panned, zoomed or pressed on the stage. */
  onInteract(): void;
}

/** Where a jump button sends the view: the backstory zone, the 2008 frame scene, or a volume. */
export type JumpTarget = 'backstory' | 'crash' | number;
