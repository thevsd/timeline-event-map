import { useEffect, useRef, type RefObject } from 'react';
import { EVENTS, REAL_EVENTS } from '../data';
import type { EventFilter } from '../data/types';
import { Timeline } from '../engine/Timeline';
import type { TimelineCallbacks } from '../engine/types';

export interface TimelineRefs {
  stage: RefObject<HTMLElement | null>;
  world: RefObject<HTMLDivElement | null>;
  lane: RefObject<HTMLDivElement | null>;
  axisCanvas: RefObject<HTMLCanvasElement | null>;
  linkCanvas: RefObject<HTMLCanvasElement | null>;
  overview: RefObject<HTMLDivElement | null>;
  overviewCanvas: RefObject<HTMLCanvasElement | null>;
}

/** State the host keeps and the engine follows. */
export interface TimelineState {
  filter: EventFilter;
  /** Whether the real-history lane is shown. */
  laneVisible: boolean;
  /** Event ids of the active thread, in story order, or null. */
  threadPath: readonly string[] | null;
}

/**
 * Creates the timeline engine once the host elements exist, and destroys it on unmount.
 *
 * The engine lives outside React's render cycle: it is created once and driven through its
 * methods. Callbacks are read through a ref, so the engine always calls the latest ones
 * without being re-created.
 *
 * @returns Refs to attach to the host elements, and a ref to the engine (null until mounted).
 */
export function useTimeline(state: TimelineState, callbacks: TimelineCallbacks) {
  const refs: TimelineRefs = {
    stage: useRef<HTMLElement>(null),
    world: useRef<HTMLDivElement>(null),
    lane: useRef<HTMLDivElement>(null),
    axisCanvas: useRef<HTMLCanvasElement>(null),
    linkCanvas: useRef<HTMLCanvasElement>(null),
    overview: useRef<HTMLDivElement>(null),
    overviewCanvas: useRef<HTMLCanvasElement>(null),
  };
  const engine = useRef<Timeline | null>(null);
  const { filter, laneVisible, threadPath } = state;

  const latestCallbacks = useRef(callbacks);
  const latestFilter = useRef(filter);
  useEffect(() => {
    latestCallbacks.current = callbacks;
    latestFilter.current = filter;
  });

  // Create on mount, destroy on unmount.
  const { stage, world, lane, axisCanvas, linkCanvas, overview, overviewCanvas } = refs;
  useEffect(() => {
    if (
      !stage.current || !world.current || !lane.current || !axisCanvas.current ||
      !linkCanvas.current || !overview.current || !overviewCanvas.current
    ) {
      return;
    }
    const instance = new Timeline(
      {
        stage: stage.current,
        world: world.current,
        lane: lane.current,
        axisCanvas: axisCanvas.current,
        linkCanvas: linkCanvas.current,
        overview: overview.current,
        overviewCanvas: overviewCanvas.current,
      },
      EVENTS,
      REAL_EVENTS,
      latestFilter.current,
      {
        onSelect: (id) => latestCallbacks.current.onSelect(id),
        onSelectReal: (id) => latestCallbacks.current.onSelectReal(id),
        onPreview: (target) => latestCallbacks.current.onPreview(target),
        onLevelChange: (level) => latestCallbacks.current.onLevelChange(level),
        onInteract: () => latestCallbacks.current.onInteract(),
        onViewChange: (view) => latestCallbacks.current.onViewChange(view),
      },
    );
    engine.current = instance;
    return () => {
      instance.destroy();
      engine.current = null;
    };
  }, [stage, world, lane, axisCanvas, linkCanvas, overview, overviewCanvas]);

  // Push state changes into the engine.
  useEffect(() => {
    engine.current?.setFilter(filter);
  }, [filter]);
  useEffect(() => {
    engine.current?.setLaneVisible(laneVisible);
  }, [laneVisible]);
  useEffect(() => {
    engine.current?.setThreadPath(threadPath);
  }, [threadPath]);

  return { refs, engine };
}
