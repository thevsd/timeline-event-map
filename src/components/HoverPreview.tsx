import { useLayoutEffect, useRef, useState } from 'react';
import type { TimelineEvent } from '../data/types';
import { Illustration } from './Illustration';

export interface Preview {
  event: TimelineEvent;
  /** Screen rectangle of the card being hovered. */
  rect: DOMRect;
}

const WIDTH = 280; // matches .pop in app.css
const MARGIN = 8;

/**
 * Floating preview shown while the pointer rests on a card that has no illustration.
 * Sits below the card when there is room, otherwise above it.
 */
export function HoverPreview({ preview }: { preview: Preview | null }) {
  const element = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  // Keep the last content while fading out.
  const last = useRef(preview);
  if (preview) last.current = preview;
  const shown = preview ?? last.current;

  // Measure after render, before paint, so the first frame is already in place.
  useLayoutEffect(() => {
    if (!preview || !element.current) return;
    const height = element.current.offsetHeight;
    const { rect } = preview;
    let top = rect.bottom + MARGIN;
    if (top + height > window.innerHeight - MARGIN) top = rect.top - height - MARGIN;
    setPosition({
      left: Math.max(MARGIN, Math.min(rect.left, window.innerWidth - WIDTH - MARGIN)),
      top: Math.max(MARGIN, top),
    });
  }, [preview]);

  if (!shown) return null;
  const { event } = shown;
  return (
    <div ref={element} className={`pop cat-${event.category}${preview ? ' on' : ''}`} style={position} aria-hidden="true">
      <div className="ph">
        <Illustration event={event} />
      </div>
      <div className="pb">
        <h3>{event.title}</h3>
        <div className="when">
          {event.when} · Vol. {event.volume}, {event.chapter}
        </div>
        <p>{event.brief}</p>
        <div className="cta">Click the card for the full entry</div>
      </div>
    </div>
  );
}
