import { useCallback, useEffect, useMemo, useState } from 'react';
import { DetailPanel } from './components/DetailPanel';
import { FilterRail } from './components/FilterRail';
import { HoverPreview, type Preview } from './components/HoverPreview';
import { Toolbar } from './components/Toolbar';
import { EVENTS, EVENT_BY_ID, matchesFilter } from './data';
import { CATEGORIES } from './data/categories';
import type { CategoryId, EventFilter } from './data/types';
import type { ZoomLevel } from './engine/config';
import { useTimeline } from './hooks/useTimeline';

const ALL_CATEGORIES: ReadonlySet<CategoryId> = new Set(CATEGORIES.map((c) => c.id));

/**
 * Application shell. React owns the toolbar, filters, detail panel and hover preview;
 * the timeline itself is drawn by the engine (see engine/Timeline.ts) inside the stage.
 */
export default function App() {
  const [categories, setCategories] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [level, setLevel] = useState<ZoomLevel>('months');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hintVisible, setHintVisible] = useState(true);

  const filter = useMemo<EventFilter>(() => ({ categories, query: search.trim().toLowerCase() }), [categories, search]);
  const visibleEvents = useMemo(() => EVENTS.filter((ev) => matchesFilter(ev, filter)), [filter]);

  const { refs, engine } = useTimeline(filter, {
    onSelect: (id) => select(id),
    onPreview: (p) => {
      const event = p ? EVENT_BY_ID.get(p.id) : undefined;
      setPreview(p && event ? { event, rect: p.rect } : null);
    },
    onLevelChange: setLevel,
    onInteract: () => setHintVisible(false),
  });

  /** Select an event (or clear with null) in both React state and the engine. */
  const select = useCallback(
    (id: string | null, center = false) => {
      setSelectedId(id);
      engine.current?.setSelected(id, center);
    },
    [engine],
  );

  /** Move the selection to the previous or next visible event. */
  const step = useCallback(
    (direction: -1 | 1) => {
      if (!visibleEvents.length) return;
      const index = visibleEvents.findIndex((ev) => ev.id === selectedId);
      const next = index < 0 ? 0 : Math.max(0, Math.min(visibleEvents.length - 1, index + direction));
      select(visibleEvents[next].id, true);
    },
    [visibleEvents, selectedId, select],
  );

  const toggleCategory = useCallback((id: CategoryId) => {
    setCategories((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  // Deep link: #<event id> opens that event on load.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && EVENT_BY_ID.has(id)) select(id, true);
  }, [select]);

  // Keyboard shortcuts. With the panel open, arrows step through events; otherwise they pan.
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement) {
        if (ev.key === 'Escape') {
          setSearch('');
          ev.target.blur();
        }
        return;
      }
      switch (ev.key) {
        case 'Escape':
          if (selectedId) select(null);
          break;
        case 'ArrowRight':
        case 'ArrowLeft': {
          const direction = ev.key === 'ArrowRight' ? 1 : -1;
          if (selectedId) {
            ev.preventDefault();
            step(direction);
          } else {
            engine.current?.panBy(-direction * 120);
          }
          break;
        }
        case '+':
        case '=':
          engine.current?.zoomBy(1.5);
          break;
        case '-':
        case '_':
          engine.current?.zoomBy(1 / 1.5);
          break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [engine, select, selectedId, step]);

  const selected = selectedId ? (EVENT_BY_ID.get(selectedId) ?? null) : null;
  const position = selected ? visibleEvents.indexOf(selected) + 1 : 0;
  const dismissHint = () => setHintVisible(false);

  return (
    <>
      <div className="app">
        <Toolbar
          search={search}
          onSearch={setSearch}
          level={level}
          onLevel={(l) => {
            dismissHint();
            engine.current?.setLevel(l);
          }}
          onZoom={(factor) => {
            dismissHint();
            engine.current?.zoomBy(factor);
          }}
        />

        <FilterRail
          enabled={categories}
          onToggle={toggleCategory}
          onJump={(target) => {
            dismissHint();
            engine.current?.jumpTo(target);
          }}
          visibleCount={visibleEvents.length}
        />

        <div className="main">
          {/* The engine owns everything inside the stage: it fills `.world` with cards and toggles state classes on the stage. */}
          <section id="stage" className="stage" ref={refs.stage} aria-label="Timeline">
            <canvas ref={refs.axisCanvas} aria-hidden="true" />
            {/* Card viewport: clips the cards to the area below the axis header. */}
            <div className="cards">
              <div className="world" ref={refs.world} />
            </div>
            <div className="fade" aria-hidden="true" />
            <div className="more" aria-hidden="true">
              More events below: drag to scroll
            </div>
            {visibleEvents.length === 0 && (
              <div className="empty" id="empty">
                No events match. Clear the search or turn a category back on.
              </div>
            )}
            <div className={`hint${hintVisible ? '' : ' gone'}`}>Scroll to zoom · drag to pan · click a card for detail</div>
          </section>

          <DetailPanel
            event={selected}
            position={position}
            total={visibleEvents.length}
            onClose={() => select(null)}
            onStep={step}
            onSelect={(id) => select(id, true)}
            onSearchPerson={setSearch}
          />
        </div>

        <div id="mini" className="mini" ref={refs.overview} aria-label="Overview of the whole timeline. Drag to move.">
          <canvas ref={refs.overviewCanvas} aria-hidden="true" />
        </div>
      </div>

      <HoverPreview preview={preview} />
    </>
  );
}
