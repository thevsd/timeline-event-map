import { useEffect, useMemo, useState } from 'react';
import { artClass, illustrationSvg } from '../art/illustration';
import type { TimelineEvent } from '../model/world';

/**
 * An event's picture: its image if it has one, otherwise its pictogram. The key figure is
 * overlaid as a pill. The parent sizes it and sets the category colour.
 */
export function Illustration({ event }: { event: Pick<TimelineEvent, 'id' | 'image' | 'motif' | 'art' | 'figure'> }) {
  // A linked picture that cannot be loaded gives way to the pictogram.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [event.image]);
  const image = failed ? undefined : event.image;
  const scene = event.art?.scene;
  const svg = useMemo(() => (image ? '' : illustrationSvg(event.motif, event.id, scene)), [image, event.motif, event.id, scene]);
  return (
    <>
      {image ? (
        <img className="photo" src={image} alt="" decoding="async" draggable={false} onError={() => setFailed(true)} />
      ) : (
        // Markup comes from our own generator, never from user input.
        <div className={artClass(event.art)} dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      {event.figure && <span className="fig">{event.figure}</span>}
    </>
  );
}
