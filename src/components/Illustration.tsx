import { useMemo } from 'react';
import { illustrationSvg } from '../art/illustration';
import type { TimelineEvent } from '../model/world';

/**
 * An event's picture: its image if it has one, otherwise its pictogram. The key figure is
 * overlaid as a pill. The parent sizes it and sets the category colour.
 */
export function Illustration({ event }: { event: Pick<TimelineEvent, 'id' | 'image' | 'motif' | 'figure'> }) {
  const { image } = event;
  const svg = useMemo(() => (image ? '' : illustrationSvg(event.motif, event.id)), [image, event.motif, event.id]);
  return (
    <>
      {image ? (
        <img className="photo" src={image} alt="" draggable={false} />
      ) : (
        // Markup comes from our own generator, never from user input.
        <div className="art" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      {event.figure && <span className="fig">{event.figure}</span>}
    </>
  );
}
