import type { ViewState } from '../engine/types';
import type { PanelPage, View, ViewPage } from '../types';
import { parseDate, toIso } from './time';

/**
 * Everything worth sharing in a link, kept in the URL hash:
 *
 *   #t=demo&z=2.3&d=1997-11-17&e=kaitaku&thread=accounting
 *
 * Fields at their default are left out. A bare `#kaitaku` (the oldest form) still opens that event.
 */
export interface UrlState {
  /** Which timeline the link is for: the demo, or the draft kept in this browser. Null in an exported page. */
  timeline: 'demo' | 'draft' | null;
  view: View;
  /** Timeline zoom and centre; null leaves the opening view alone. */
  zoom: ViewState | null;
  /** Selected event. */
  event: string | null;
  /** Side-panel page, when it is not the selected event's. */
  page: ViewPage | null;
  /** Ids of the categories turned off. */
  hidden: string[];
  /** From links older than `hide`: the only categories left on. Read, never written. */
  only?: string[];
  query: string;
  person: string | null;
  thread: string | null;
  lane: boolean;
  /** Corporate-map step; null means the latest. */
  mapStep: number | null;
}

const PAGE_PREFIX: Record<Exclude<ViewPage['kind'], 'event'>, string> = {
  person: 'person',
  thread: 'thread',
  lane: 'lane',
  company: 'co',
  term: 'term',
};

function pageToString(page: PanelPage): string | null {
  if (page.kind === 'event' || page.kind === 'form') return null;
  return `${PAGE_PREFIX[page.kind]}:${page.kind === 'person' ? page.name : page.id}`;
}

function pageFromString(text: string | null): ViewPage | null {
  if (!text) return null;
  const cut = text.indexOf(':');
  const value = text.slice(cut + 1);
  switch (text.slice(0, cut)) {
    case 'person': return { kind: 'person', name: value };
    case 'thread': return { kind: 'thread', id: value };
    case 'lane':
    case 'real': return { kind: 'lane', id: value }; // `real` is the older spelling
    case 'co': return { kind: 'company', id: value };
    case 'term': return { kind: 'term', id: value };
    default: return null;
  }
}

/** Centre of the view as text: an ISO date, or `pre<pixels>` inside the undated zone. */
function centreToString(view: ViewState, domainStart: number): string {
  if (view.px < 0) return `pre${Math.round(-view.px)}`;
  return toIso(domainStart + Math.round(view.days));
}

function parseZoom(zoom: string | null, centre: string | null, domainStart: number): ViewState | null {
  const ppd = Number(zoom);
  if (!zoom || !centre || !(ppd > 0)) return null;
  if (centre.startsWith('pre')) {
    const px = Number(centre.slice(3));
    return Number.isFinite(px) ? { ppd, days: 0, px: -px } : null;
  }
  const date = /^-?\d+-\d{2}-\d{2}$/.test(centre) ? parseDate(centre) : null;
  return date ? { ppd, days: date.day - domainStart, px: 0 } : null;
}

/** Which timeline a hash asks for, without reading the rest. Links older than the home page are for the demo. */
export function timelineOf(hash: string): 'demo' | 'draft' | null {
  const text = hash.replace(/^#/, '');
  if (!text) return null;
  const wanted = new URLSearchParams(text.includes('=') ? text : '').get('t');
  return wanted === 'draft' ? 'draft' : 'demo';
}

/**
 * Read the state from a URL hash. Unknown or malformed fields fall back to their defaults.
 * @param domainStart Day number at the start of the timeline's axis; view positions are stored as dates.
 */
export function parseUrlState(hash: string, domainStart: number): UrlState {
  const text = hash.replace(/^#/, '');
  // The oldest links are just the event id.
  const params = new URLSearchParams(text.includes('=') ? text : text ? `e=${text}` : '');
  const step = params.get('step');
  const view = params.get('view');
  return {
    timeline: timelineOf(hash),
    view: view === 'map' || view === 'cast' || view === 'glossary' ? view : 'timeline',
    zoom: parseZoom(params.get('z'), params.get('d'), domainStart),
    event: params.get('e'),
    page: pageFromString(params.get('p')),
    hidden: params.get('hide')?.split(',').filter(Boolean) ?? [],
    only: params.get('cat')?.split(',').filter(Boolean),
    query: params.get('q') ?? '',
    person: params.get('who'),
    thread: params.get('thread'),
    lane: params.get('lane') !== '0',
    mapStep: step != null && /^\d+$/.test(step) ? Number(step) : null,
  };
}

/** Build the hash for a state, without the leading `#`. */
export function formatUrlState(state: UrlState, domainStart: number): string {
  const params = new URLSearchParams();
  if (state.timeline) params.set('t', state.timeline);
  if (state.view !== 'timeline') params.set('view', state.view);
  if (state.zoom) {
    params.set('z', String(Number(state.zoom.ppd.toPrecision(3))));
    params.set('d', centreToString(state.zoom, domainStart));
  }
  if (state.event) params.set('e', state.event);
  const page = state.page ? pageToString(state.page) : null;
  if (page) params.set('p', page);
  if (state.hidden.length) params.set('hide', state.hidden.join(','));
  if (state.query) params.set('q', state.query);
  if (state.person) params.set('who', state.person);
  if (state.thread) params.set('thread', state.thread);
  if (!state.lane) params.set('lane', '0');
  if (state.mapStep != null) params.set('step', String(state.mapStep));
  // Keep dates and separators readable; URLSearchParams escapes more than a hash needs.
  return params.toString().replace(/%3A/g, ':').replace(/%2C/g, ',');
}
