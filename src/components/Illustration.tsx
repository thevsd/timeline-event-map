import { useMemo } from 'react';
import { illustrationSvg } from '../art/illustration';
import type { TimelineEvent } from '../data/types';

/** An event's pictogram, with its key figure as a pill. The parent sizes it and sets the category colour. */
export function Illustration({ event }: { event: TimelineEvent }) {
  const svg = useMemo(() => illustrationSvg(event.motif, event.id), [event.motif, event.id]);
  return (
    <>
      {/* Markup comes from our own generator, never from user input. */}
      <div className="art" dangerouslySetInnerHTML={{ __html: svg }} />
      {event.figure && <span className="fig">{event.figure}</span>}
    </>
  );
}
