import { useLayoutEffect, useRef, useState } from 'react';
import type { TermDoc } from '../model/schema';
import type { LaneItem, TimelineEvent } from '../model/world';
import { Illustration } from './Illustration';

/** What is being hovered, and the screen rectangle to attach the preview to. */
export type Preview =
  | { kind: 'event'; event: TimelineEvent; rect: DOMRect }
  | { kind: 'lane'; item: LaneItem; lane: string; rect: DOMRect }
  | { kind: 'term'; term: TermDoc; rect: DOMRect };

const WIDTH = 280; // matches .pop in app.css
const MARGIN = 8;

/**
 * Floating preview shown while the pointer rests on a card that has no illustration, on a
 * lane entry, or on a glossary term. Sits below its target when there is room, otherwise above it.
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
  const on = preview ? ' on' : '';

  if (shown.kind === 'term') {
    const { term } = shown;
    return (
      <div ref={element} className={`pop termpop${on}`} style={position} aria-hidden="true">
        <div className="pb">
          <div className="kicker">Glossary</div>
          <h3>{term.term}</h3>
          {term.origin && <div className="when">{term.origin}</div>}
          <p>{term.definition}</p>
          <div className="cta">Click the term for where it comes up</div>
        </div>
      </div>
    );
  }

  if (shown.kind === 'lane') {
    const { item } = shown;
    return (
      <div ref={element} className={`pop hue-${item.hue}${on}`} style={position} aria-hidden="true">
        <div className="pb">
          <div className="kicker rh-tag">
            <i className="rh-m" />
            {shown.lane}
            {item.kindName && ` · ${item.kindName}`}
          </div>
          <h3>{item.title}</h3>
          <div className="when">{item.when}</div>
          {item.text && <p>{item.text}</p>}
          <div className="cta">Click for the full entry</div>
        </div>
      </div>
    );
  }

  const { event } = shown;
  return (
    <div ref={element} className={`pop hue-${event.hue}${on}`} style={position} aria-hidden="true">
      <div className="ph">
        <Illustration event={event} />
      </div>
      <div className="pb">
        <h3>{event.title}</h3>
        <div className="when">
          {[event.when, event.partName, event.source].filter(Boolean).join(' · ')}
        </div>
        <p>{event.summary}</p>
        <div className="cta">Click the card for the full entry</div>
      </div>
    </div>
  );
}
