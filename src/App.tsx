import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CastRail } from './components/CastRail';
import { CharacterList } from './components/CharacterList';
import { CorporateMap } from './components/CorporateMap';
import { DetailPanel } from './components/DetailPanel';
import { FilterRail } from './components/FilterRail';
import { HoverPreview, type Preview } from './components/HoverPreview';
import { MapControls } from './components/MapControls';
import { Toolbar } from './components/Toolbar';
import { TermContext, WorldContext, type TermActions } from './context';
import { matchesFilter } from './data';
import { CATEGORIES } from './data/categories';
import type { CategoryId, EventFilter } from './data/types';
import { worldAt, type World } from './data/world';
import type { ZoomLevel } from './engine/config';
import type { Reveal } from './engine/types';
import { search as searchWorld } from './lib/search';
import { useTimeline } from './hooks/useTimeline';
import { loadProgress, saveProgress } from './lib/spoilers';
import { formatUrlState, parseUrlState, type UrlState } from './lib/urlState';
import type { OpenMode, PanelPage, View } from './types';

const ALL_CATEGORIES: ReadonlySet<CategoryId> = new Set(CATEGORIES.map((c) => c.id));

/** Pause after the last change before the address bar is updated. */
const URL_WRITE_DELAY = 250;

/** Whether a page points at something that exists and that the reader's progress allows. */
function pageExists(page: PanelPage, world: World): boolean {
  switch (page.kind) {
    case 'event': return world.eventById.has(page.id);
    case 'person': return world.personByName.has(page.name);
    case 'thread': return world.threadById.has(page.id);
    case 'real': return world.realById.has(page.id);
    case 'company': {
      const node = world.nodeById.get(page.id);
      return node != null && (node.since == null || world.eventById.has(node.since));
    }
    case 'term': return world.termById.has(page.id);
  }
}

/** Turn what a link says into app state, dropping anything unknown or beyond the reader's progress. */
function fromUrl(url: UrlState, world: World) {
  const selectedId = url.event && world.eventById.has(url.event) ? url.event : null;
  const page = url.page && pageExists(url.page, world) ? url.page : null;
  const stack: PanelPage[] = [];
  if (selectedId) stack.push({ kind: 'event', id: selectedId });
  if (page) stack.push(page);
  return {
    view: url.view,
    categories: url.categories ? new Set(url.categories) : ALL_CATEGORIES,
    search: url.query,
    person: url.person && world.personByName.has(url.person) ? url.person : null,
    thread: url.thread && world.threadById.has(url.thread) ? url.thread : null,
    lane: url.lane,
    selectedId,
    stack,
    mapStep: Math.min(world.lastStep, url.mapStep ?? world.lastStep),
    timeline: url.timeline,
  };
}

const INITIAL_PROGRESS = loadProgress();
const INITIAL = fromUrl(parseUrlState(window.location.hash), worldAt(INITIAL_PROGRESS));

/**
 * Application shell. React owns the toolbar, filters, side panel, hover preview, the corporate map
 * and the character list; the timeline itself is drawn by the engine (see engine/Timeline.ts)
 * inside the stage.
 *
 * State worth sharing (view, zoom, selection, filters) is mirrored into the URL hash. Reading
 * progress is the reader's own setting: it is kept in the browser, never in a link, and everything
 * shown is read from the World built for it (see data/world.ts).
 */
export default function App() {
  const [view, setView] = useState<View>(INITIAL.view);
  /** Last volume the reader has finished; everything later is hidden. */
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const world = useMemo(() => worldAt(progress), [progress]);
  const [categories, setCategories] = useState<ReadonlySet<CategoryId>>(INITIAL.categories);
  /** Text the timeline is narrowed to, applied from the search box. */
  const [search, setSearch] = useState(INITIAL.search);
  /** Search text of the Characters tab; not part of a link. */
  const [castQuery, setCastQuery] = useState('');
  const [person, setPerson] = useState(INITIAL.person);
  const [thread, setThread] = useState(INITIAL.thread);
  const [lane, setLane] = useState(INITIAL.lane);
  const [selectedId, setSelectedId] = useState(INITIAL.selectedId);
  /** Side-panel pages, oldest first; the last one is showing. */
  const [stack, setStack] = useState(INITIAL.stack);
  const [mapStep, setMapStep] = useState(INITIAL.mapStep);
  const [level, setLevel] = useState<ZoomLevel>('months');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hintVisible, setHintVisible] = useState(true);

  const filter = useMemo<EventFilter>(
    () => ({
      categories,
      maxVolume: progress,
      // The search box and this filter share one matcher, so the count it offers is the count shown.
      textMatches: search.trim() ? new Set(searchWorld(world, search, 0).eventIds) : null,
      person,
      thread,
    }),
    [world, categories, progress, search, person, thread],
  );
  const visibleEvents = useMemo(() => world.events.filter((ev) => matchesFilter(ev, filter)), [world, filter]);
  const threadPath = thread ? (world.threadById.get(thread)?.events ?? null) : null;
  const page = stack.length ? stack[stack.length - 1] : null;

  /* ── URL ── */

  /** The timeline view goes into links only once it has moved or came from one. */
  const viewTouched = useRef(INITIAL.timeline != null);
  const urlTimer = useRef(0);
  const writeUrlRef = useRef(() => {});
  const scheduleUrlWrite = useCallback(() => {
    window.clearTimeout(urlTimer.current);
    urlTimer.current = window.setTimeout(() => writeUrlRef.current(), URL_WRITE_DELAY);
  }, []);

  const { refs, engine } = useTimeline(
    { filter, laneVisible: lane, threadPath },
    {
      onSelect: (id) => open({ kind: 'event', id }, 'reset', 'ifNeeded'),
      onSelectReal: (id) => open({ kind: 'real', id }, 'reset'),
      onPreview: (target) => {
        if (!target) return setPreview(null);
        const event = target.kind === 'event' ? world.eventById.get(target.id) : undefined;
        const real = target.kind === 'real' ? world.realById.get(target.id) : undefined;
        setPreview(event ? { kind: 'event', event, rect: target.rect } : real ? { kind: 'real', real, rect: target.rect } : null);
      },
      onLevelChange: setLevel,
      onInteract: () => setHintVisible(false),
      onViewChange: () => {
        viewTouched.current = true;
        scheduleUrlWrite();
      },
    },
  );

  // Latest state for the debounced writer, which runs outside the render that scheduled it.
  useEffect(() => {
    writeUrlRef.current = () => {
      const hash = formatUrlState({
        view,
        timeline: viewTouched.current ? (engine.current?.getView() ?? null) : null,
        event: selectedId,
        page: page && page.kind !== 'event' ? page : null,
        categories: categories.size === ALL_CATEGORIES.size ? null : [...categories],
        query: search.trim(),
        person,
        thread,
        lane,
        mapStep: mapStep === world.lastStep ? null : mapStep,
      });
      try {
        window.history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname + window.location.search);
      } catch {
        // Sandboxed frames may refuse history changes; sharing then falls back to the opening view.
      }
    };
  });

  // Write on every change after the first render.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) scheduleUrlWrite();
    mounted.current = true;
  }, [view, categories, search, person, thread, lane, selectedId, stack, mapStep, scheduleUrlWrite]);

  /* ── Navigation ── */

  /** Point the engine, and the main view, at whatever a page is about. */
  const focus = useCallback(
    (target: PanelPage | null, reveal: Reveal) => {
      if (target?.kind === 'event') {
        setSelectedId(target.id);
        engine.current?.setSelected(target.id, reveal);
      }
      engine.current?.setSelectedReal(target?.kind === 'real' ? target.id : null);
      if (target?.kind === 'company') setView('map');
      else if (target?.kind === 'event' || target?.kind === 'real') setView('timeline');
    },
    [engine],
  );

  /** Show a page in the side panel. */
  const open = useCallback(
    (target: PanelPage, mode: OpenMode = 'push', reveal: Reveal = 'center') => {
      setStack((current) => {
        if (mode === 'reset') return [target];
        if (mode === 'replace') return [...current.slice(0, -1), target];
        return [...current, target];
      });
      // Starting afresh on something that is not an event leaves no event selected.
      if (mode === 'reset' && target.kind !== 'event') {
        setSelectedId(null);
        engine.current?.setSelected(null);
      }
      focus(target, reveal);
    },
    [engine, focus],
  );

  const close = useCallback(() => {
    setStack([]);
    setSelectedId(null);
    engine.current?.setSelected(null);
    engine.current?.setSelectedReal(null);
  }, [engine]);

  const back = useCallback(() => {
    if (stack.length < 2) return close();
    const rest = stack.slice(0, -1);
    setStack(rest);
    focus(rest[rest.length - 1], 'ifNeeded');
  }, [stack, close, focus]);

  /** Switch the main view. A panel page that belongs to another view is closed; people and glossary terms fit any view. */
  const switchView = useCallback(
    (next: View) => {
      setView(next);
      if (!page || page.kind === 'person' || page.kind === 'term') return;
      const home: View = page.kind === 'company' ? 'map' : 'timeline';
      if (home !== next) close();
    },
    [page, close],
  );

  /** Move the selection to the previous or next visible event. */
  const step = useCallback(
    (direction: -1 | 1) => {
      if (!visibleEvents.length) return;
      const index = visibleEvents.findIndex((ev) => ev.id === selectedId);
      const next = index < 0 ? 0 : Math.max(0, Math.min(visibleEvents.length - 1, index + direction));
      open({ kind: 'event', id: visibleEvents[next].id }, 'replace');
    },
    [visibleEvents, selectedId, open],
  );

  /* ── Filters ── */

  const toggleCategory = useCallback((id: CategoryId) => {
    setCategories((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  /** Narrow the timeline to a thread and frame its events; null shows everything again. */
  const filterThread = useCallback(
    (id: string | null) => {
      setThread(id);
      const found = id ? world.threadById.get(id) : undefined;
      if (found) {
        setView('timeline');
        engine.current?.fitEvents(found.events);
      }
    },
    [engine, world],
  );

  /** Narrow the timeline to one person's events and frame them; null shows everything again. */
  const filterPerson = useCallback(
    (name: string | null) => {
      setPerson(name);
      if (name) {
        setView('timeline');
        engine.current?.fitEvents(world.eventsOf(name).map((ev) => ev.id));
      }
    },
    [engine, world],
  );

  /** Narrow the timeline to the events matching a text and frame them; empty shows everything again. */
  const filterText = useCallback(
    (query: string) => {
      setSearch(query);
      if (!query) return;
      setView('timeline');
      const textMatches = new Set(searchWorld(world, query, 0).eventIds);
      const matching = world.events.filter((ev) => matchesFilter(ev, { ...filter, textMatches }));
      engine.current?.fitEvents(matching.map((ev) => ev.id));
    },
    [engine, world, filter],
  );

  /** Open a search result. A fresh search starts a fresh panel. */
  const pick = useCallback((target: PanelPage) => open(target, 'reset'), [open]);

  /* ── Reading progress ── */

  const changeProgress = useCallback((volume: number) => {
    setProgress(volume);
    saveProgress(volume);
  }, []);

  // Lowering the progress can leave state pointing at things that are now hidden: drop it.
  const worldRef = useRef(world);
  useEffect(() => {
    const before = worldRef.current;
    worldRef.current = world;
    const kept = stack.filter((p) => pageExists(p, world));
    if (kept.length !== stack.length) setStack(kept);
    if (selectedId && !world.eventById.has(selectedId)) {
      setSelectedId(null);
      engine.current?.setSelected(null);
    }
    if (page?.kind === 'real' && !world.realById.has(page.id)) engine.current?.setSelectedReal(null);
    if (person && !world.personByName.has(person)) setPerson(null);
    if (thread && !world.threadById.has(thread)) setThread(null);
    // The map stays at its latest step when that step moves, and never runs past it.
    if (mapStep > world.lastStep || mapStep === before.lastStep) setMapStep(world.lastStep);
    // Only a change of progress needs this; the rest is read as it stands at that moment.
  }, [world]);

  /* ── Glossary ── */

  const termActions = useMemo<TermActions>(
    () => ({
      preview: (id, rect) => {
        const term = id ? worldRef.current.termById.get(id) : undefined;
        setPreview(term && rect ? { kind: 'term', term, rect } : null);
      },
      open: (id) => open({ kind: 'term', id }),
    }),
    [open],
  );

  /* ── Links ── */

  /** Apply a parsed link to the app and the engine. */
  const applyUrl = useCallback(
    (state: typeof INITIAL) => {
      setView(state.view);
      setCategories(state.categories);
      setSearch(state.search);
      setPerson(state.person);
      setThread(state.thread);
      setLane(state.lane);
      setSelectedId(state.selectedId);
      setStack(state.stack);
      setMapStep(state.mapStep);

      const top = state.stack.length ? state.stack[state.stack.length - 1] : null;
      if (state.timeline) {
        viewTouched.current = true;
        engine.current?.setView(state.timeline);
      }
      // A link that carries its own view is restored as it was; otherwise centre on the selection.
      engine.current?.setSelected(state.selectedId, state.timeline ? 'ifNeeded' : 'center');
      engine.current?.setSelectedReal(top?.kind === 'real' ? top.id : null);
    },
    [engine],
  );

  // Open the link the page was loaded with, and follow later edits to the hash.
  useEffect(() => {
    applyUrl(INITIAL);
    const onHashChange = () => applyUrl(fromUrl(parseUrlState(window.location.hash), worldRef.current));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applyUrl]);

  const copyLink = useCallback(async () => {
    window.clearTimeout(urlTimer.current);
    writeUrlRef.current();
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch {
      return false;
    }
  }, []);

  /* ── Keyboard ── */

  // Arrows step through events while one is open, step the map in map view, and otherwise pan.
  // Keys typed into a field belong to that field; the search box handles its own (see SearchBox).
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement) {
        if (ev.key === 'Escape' && ev.target.id === 'cast-search') {
          setCastQuery('');
          ev.target.blur();
        }
        return;
      }
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      switch (ev.key) {
        case 'Escape':
          if (page) close();
          break;
        case 'ArrowRight':
        case 'ArrowLeft': {
          const direction = ev.key === 'ArrowRight' ? 1 : -1;
          if (view === 'map') {
            ev.preventDefault();
            setMapStep((current) => Math.max(0, Math.min(world.lastStep, current + direction)));
          } else if (view === 'timeline' && page?.kind === 'event') {
            ev.preventDefault();
            step(direction);
          } else if (view === 'timeline') {
            engine.current?.panBy(-direction * 120);
          }
          break;
        }
        case '+':
        case '=':
          if (view === 'timeline') engine.current?.zoomBy(1.5);
          break;
        case '-':
        case '_':
          if (view === 'timeline') engine.current?.zoomBy(1 / 1.5);
          break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [engine, close, page, step, view, world]);

  const position = page?.kind === 'event' ? visibleEvents.findIndex((ev) => ev.id === page.id) + 1 : 0;
  const dismissHint = () => setHintVisible(false);

  return (
    <WorldContext.Provider value={world}>
      <div className="app">
        <Toolbar
          view={view}
          onView={switchView}
          onPick={pick}
          onFilterText={filterText}
          progress={progress}
          onProgress={changeProgress}
          level={level}
          onLevel={(l) => {
            dismissHint();
            engine.current?.setLevel(l);
          }}
          onZoom={(factor) => {
            dismissHint();
            engine.current?.zoomBy(factor);
          }}
          onCopyLink={copyLink}
        />

        {view === 'timeline' ? (
          <FilterRail
            enabled={categories}
            onToggle={toggleCategory}
            onJump={(target) => {
              dismissHint();
              engine.current?.jumpTo(target);
            }}
            thread={thread}
            onThread={(id) => {
              filterThread(id);
              if (id) open({ kind: 'thread', id }, 'reset');
            }}
            person={person}
            onPerson={(name) => {
              filterPerson(name);
              if (name) open({ kind: 'person', name }, 'reset');
            }}
            query={search.trim()}
            onClearQuery={() => setSearch('')}
            lane={lane}
            onLane={setLane}
            visibleCount={visibleEvents.length}
          />
        ) : view === 'map' ? (
          <MapControls step={mapStep} onStep={setMapStep} onOpenEvent={(id) => open({ kind: 'event', id }, 'reset')} />
        ) : (
          <CastRail query={castQuery} onQuery={setCastQuery} />
        )}

        {/* Beside the character list the panel floats over it, so the grid never re-wraps while it slides. */}
        <div className={view === 'cast' ? 'main float' : 'main'}>
          {/* The engine owns everything it adds inside the stage: cards, badges, lane entries, and state classes on the stage. */}
          <section id="stage" className="stage" ref={refs.stage} aria-label="Timeline" hidden={view !== 'timeline'}>
            <canvas ref={refs.axisCanvas} aria-hidden="true" />
            <div className="lane" ref={refs.lane} role="group" aria-label="Real history">
              <span className="lane-cap" aria-hidden="true">
                Real history
              </span>
            </div>
            {/* Card viewport: clips the cards to the area below the axis header and the lane. */}
            <div className="cards">
              <div className="world" ref={refs.world} />
              <canvas className="links" ref={refs.linkCanvas} aria-hidden="true" />
            </div>
            {visibleEvents.length === 0 && (
              <div className="empty" id="empty">
                No events match. Clear the text, the thread or the person, or turn a category back on.
              </div>
            )}
            <div className={`hint${hintVisible ? '' : ' gone'}`}>Scroll to zoom · drag to pan · click a card for detail</div>
          </section>

          {view === 'map' && (
            <CorporateMap
              step={mapStep}
              selectedId={page?.kind === 'company' ? page.id : null}
              onSelect={(id) => open({ kind: 'company', id }, page?.kind === 'company' ? 'replace' : 'reset')}
            />
          )}

          {view === 'cast' && (
            <CharacterList
              query={castQuery}
              selected={page?.kind === 'person' ? page.name : null}
              onSelect={(name) => open({ kind: 'person', name }, 'reset')}
            />
          )}

          {/* Glossary terms are live only inside the panel; elsewhere text stays plain. */}
          <TermContext.Provider value={termActions}>
            {/* Keyed by how it is laid out: a fresh element takes its place at once, where a kept one would animate from the other layout's width. */}
            <DetailPanel
              key={view === 'cast' ? 'float' : 'push'}
              page={page}
              canGoBack={stack.length > 1}
              position={position}
              total={visibleEvents.length}
              person={person}
              thread={thread}
              mapStep={mapStep}
              onBack={back}
              onClose={close}
              onStep={step}
              onOpen={open}
              onFilterPerson={filterPerson}
              onFilterThread={filterThread}
            />
          </TermContext.Provider>
        </div>

        <div
          id="mini"
          className="mini"
          ref={refs.overview}
          aria-label="Overview of the whole timeline. Drag to move."
          hidden={view !== 'timeline'}
        >
          <canvas ref={refs.overviewCanvas} aria-hidden="true" />
        </div>
      </div>

      <HoverPreview preview={preview} />
    </WorldContext.Provider>
  );
}
