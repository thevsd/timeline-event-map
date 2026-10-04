import { useEffect, useRef, type RefObject } from 'react';
import { EVENTS } from '../data';
import type { EventFilter } from '../data/types';
import { Timeline } from '../engine/Timeline';
import type { TimelineCallbacks } from '../engine/types';

export interface TimelineRefs {
  stage: RefObject<HTMLElement | null>;
  world: RefObject<HTMLDivElement | null>;
  axisCanvas: RefObject<HTMLCanvasElement | null>;
  overview: RefObject<HTMLDivElement | null>;
  overviewCanvas: RefObject<HTMLCanvasElement | null>;
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
export function useTimeline(filter: EventFilter, callbacks: TimelineCallbacks) {
  const refs: TimelineRefs = {
    stage: useRef<HTMLElement>(null),
    world: useRef<HTMLDivElement>(null),
    axisCanvas: useRef<HTMLCanvasElement>(null),
    overview: useRef<HTMLDivElement>(null),
    overviewCanvas: useRef<HTMLCanvasElement>(null),
  };
  const engine = useRef<Timeline | null>(null);

  const latestCallbacks = useRef(callbacks);
  const latestFilter = useRef(filter);
  useEffect(() => {
    latestCallbacks.current = callbacks;
    latestFilter.current = filter;
  });

  // Create on mount, destroy on unmount.
  const { stage, world, axisCanvas, overview, overviewCanvas } = refs;
  useEffect(() => {
    if (!stage.current || !world.current || !axisCanvas.current || !overview.current || !overviewCanvas.current) return;
    const instance = new Timeline(
      {
        stage: stage.current,
        world: world.current,
        axisCanvas: axisCanvas.current,
        overview: overview.current,
        overviewCanvas: overviewCanvas.current,
      },
      EVENTS,
      latestFilter.current,
      {
        onSelect: (id) => latestCallbacks.current.onSelect(id),
        onPreview: (preview) => latestCallbacks.current.onPreview(preview),
        onLevelChange: (level) => latestCallbacks.current.onLevelChange(level),
        onInteract: () => latestCallbacks.current.onInteract(),
      },
    );
    engine.current = instance;
    return () => {
      instance.destroy();
      engine.current = null;
    };
  }, [stage, world, axisCanvas, overview, overviewCanvas]);

  // Push filter changes into the engine.
  useEffect(() => {
    engine.current?.setFilter(filter);
  }, [filter]);

  return { refs, engine };
}
