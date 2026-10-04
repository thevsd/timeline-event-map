import { CATEGORIES } from '../data/categories';
import type { CategoryId } from '../data/types';
import type { ViewState } from '../engine/types';
import type { PanelPage, View } from '../types';
import { DOMAIN_START, dateOf, toDay } from './time';

/**
 * Everything worth sharing in a link, kept in the URL hash:
 *
 *   #z=2.3&d=1997-11-17&e=kaitaku&thread=accounting
 *
 * Fields at their default are left out. A bare `#kaitaku` (the older form) still opens that event.
 */
export interface UrlState {
  view: View;
  /** Timeline zoom and centre; null leaves the opening view alone. */
  timeline: ViewState | null;
  /** Selected event. */
  event: string | null;
  /** Side-panel page, when it is not the selected event's. */
  page: PanelPage | null;
  /** Enabled categories; null means all. */
  categories: CategoryId[] | null;
  query: string;
  person: string | null;
  thread: string | null;
  lane: boolean;
  /** Corporate-map step; null means the latest. */
  mapStep: number | null;
}

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

const PAGE_PREFIX: Record<Exclude<PanelPage['kind'], 'event'>, string> = {
  person: 'person',
  thread: 'thread',
  real: 'real',
  company: 'co',
};

function pageToString(page: PanelPage): string | null {
  if (page.kind === 'event') return null;
  return `${PAGE_PREFIX[page.kind]}:${page.kind === 'person' ? page.name : page.id}`;
}

function pageFromString(text: string | null): PanelPage | null {
  if (!text) return null;
  const cut = text.indexOf(':');
  const value = text.slice(cut + 1);
  switch (text.slice(0, cut)) {
    case 'person': return { kind: 'person', name: value };
    case 'thread': return { kind: 'thread', id: value };
    case 'real': return { kind: 'real', id: value };
    case 'co': return { kind: 'company', id: value };
    default: return null;
  }
}

/** Centre of the view as text: an ISO date, or `pre<pixels>` inside the backstory zone. */
function centreToString(view: ViewState): string {
  if (view.px < 0) return `pre${Math.round(-view.px)}`;
  return dateOf(DOMAIN_START + Math.round(view.days)).toISOString().slice(0, 10);
}

function parseTimeline(zoom: string | null, centre: string | null): ViewState | null {
  const ppd = Number(zoom);
  if (!zoom || !centre || !(ppd > 0)) return null;
  if (centre.startsWith('pre')) {
    const px = Number(centre.slice(3));
    return Number.isFinite(px) ? { ppd, days: 0, px: -px } : null;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(centre) ? { ppd, days: toDay(centre) - DOMAIN_START, px: 0 } : null;
}

/** Read the state from a URL hash. Unknown or malformed fields fall back to their defaults. */
export function parseUrlState(hash: string): UrlState {
  const text = hash.replace(/^#/, '');
  // Older links are just the event id.
  const params = new URLSearchParams(text.includes('=') ? text : text ? `e=${text}` : '');
  const categories = params.get('cat')?.split(',').filter((id): id is CategoryId => CATEGORY_IDS.has(id)) ?? null;
  const step = params.get('step');
  return {
    view: params.get('view') === 'map' ? 'map' : 'timeline',
    timeline: parseTimeline(params.get('z'), params.get('d')),
    event: params.get('e'),
    page: pageFromString(params.get('p')),
    categories,
    query: params.get('q') ?? '',
    person: params.get('who'),
    thread: params.get('thread'),
    lane: params.get('lane') !== '0',
    mapStep: step != null && /^\d+$/.test(step) ? Number(step) : null,
  };
}

/** Build the hash for a state, without the leading `#`. Empty when everything is at its default. */
export function formatUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.view === 'map') params.set('view', 'map');
  if (state.timeline) {
    params.set('z', String(Number(state.timeline.ppd.toPrecision(3))));
    params.set('d', centreToString(state.timeline));
  }
  if (state.event) params.set('e', state.event);
  const page = state.page ? pageToString(state.page) : null;
  if (page) params.set('p', page);
  if (state.categories) params.set('cat', state.categories.join(','));
  if (state.query) params.set('q', state.query);
  if (state.person) params.set('who', state.person);
  if (state.thread) params.set('thread', state.thread);
  if (!state.lane) params.set('lane', '0');
  if (state.mapStep != null) params.set('step', String(state.mapStep));
  // Keep dates and separators readable; URLSearchParams escapes more than a hash needs.
  return params.toString().replace(/%3A/g, ':').replace(/%2C/g, ',');
}
