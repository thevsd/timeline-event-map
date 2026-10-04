import type { LaneItem, TimelineEvent, World } from '../model/world';
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
  /** Folded into a "+N more" badge; null when the card has a slot of its own. */
  badge: Badge | null;
}

/** A "+N more" badge standing in for cards that do not fit at the current zoom. */
export interface Badge {
  el: HTMLButtonElement;
  /** X relative to the start of the axis, at the current zoom. */
  worldX: number;
  y: number;
  members: Item[];
}

/** Runtime state for one entry of the second lane. */
export interface LaneEntry {
  ev: LaneItem;
  el: HTMLButtonElement;
  /** Pixel width of the label, for the overlap test. */
  labelWidth: number;
  /** Screen x of its date. */
  sx: number;
  off: boolean;
}

/** A rectangle in card-viewport coordinates. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
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
  /** Stage y of the first row of cards. */
  cardsTop: number;
  /** Height of the second lane; 0 when it is hidden or absent. */
  laneHeight: number;
  /** Pixel width of the undated zone. */
  undatedWidth: number;
  /** Day numbers at the two ends of the to-scale axis. */
  domainStart: number;
  domainEnd: number;
  /** Source of the captions, gaps and countdown the axis draws. */
  world: World;
  palette: Palette;
  items: readonly Item[];
  selectedId: string | null;
  hoveredId: string | null;
  /** Screen x of the hovered or selected lane entry, for its guide line. */
  laneGuideX: number | null;
}

/** Zoom, plus the timeline point at the centre of the stage. */
export interface ViewState {
  /** Pixels per day. */
  ppd: number;
  /** Days from the start of the axis. */
  days: number;
  /** Pixel offset; non-zero only inside the undated zone, which does not scale. */
  px: number;
}

/** How far to move the view when selecting: not at all, only if off screen, or always to the centre. */
export type Reveal = 'none' | 'ifNeeded' | 'center';

/** What the pointer is resting on. */
export interface PreviewTarget {
  kind: 'event' | 'lane';
  id: string;
  rect: DOMRect;
}

/** What the engine reports to its host. */
export interface TimelineCallbacks {
  /** A card was clicked or tapped. */
  onSelect(id: string): void;
  /** A lane entry was clicked or tapped. */
  onSelectLane(id: string): void;
  /** The pointer rests on a card without an illustration, or on a lane entry; null when it leaves. */
  onPreview(target: PreviewTarget | null): void;
  /** The axis switched tick level. */
  onLevelChange(level: ZoomLevel): void;
  /** The tick level at the furthest zoom-out changed: the timeline's length or the stage's width did. */
  onCoarsestLevel(level: ZoomLevel): void;
  /** The user panned, zoomed or pressed on the stage. */
  onInteract(): void;
  /** The view came to rest somewhere new. */
  onViewChange(view: ViewState): void;
}

/** Where a jump button sends the view: the undated zone, the countdown event, or a part (by number). */
export type JumpTarget = 'undated' | 'countdown' | number;
