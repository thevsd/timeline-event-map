import { useEffect, useState } from 'react';
import { useWorld } from '../context';
import { stepEvent } from '../lib/corporate';

/** Pause on each step while playing. */
const PLAY_INTERVAL = 1700;

interface MapControlsProps {
  /** Current step: 0 is the map before any change, the world's `lastStep` the latest the reader may see. */
  step: number;
  onStep(step: number): void;
  /** Open the step's event on the timeline. */
  onOpenEvent(id: string): void;
}

/** Step controls for the corporate map: first, back, play, forward, last, a scrubber, and the step's event. */
export function MapControls({ step, onStep, onOpenEvent }: MapControlsProps) {
  const lastStep = useWorld().lastStep;
  const [playing, setPlaying] = useState(false);
  const event = stepEvent(step);

  // Advance while playing; stop at the end.
  useEffect(() => {
    if (!playing) return;
    if (step >= lastStep) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => onStep(step + 1), PLAY_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [playing, step, onStep, lastStep]);

  const play = () => {
    if (!playing && step >= lastStep) onStep(0); // replay from the start
    setPlaying(!playing);
  };
  const go = (to: number) => {
    setPlaying(false);
    onStep(Math.max(0, Math.min(lastStep, to)));
  };

  return (
    <div className="rail maprail">
      <span className="label">Step</span>
      <div className="stepper" role="group" aria-label="Step through the changes">
        <button className="iconbtn" type="button" aria-label="First step" title="Start" onClick={() => go(0)}>
          «
        </button>
        <button className="iconbtn" type="button" id="map-prev" aria-label="Previous step" title="Previous change" onClick={() => go(step - 1)}>
          ‹
        </button>
        <button className="iconbtn play" type="button" id="map-play" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play through'} onClick={play}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button className="iconbtn" type="button" id="map-next" aria-label="Next step" title="Next change" onClick={() => go(step + 1)}>
          ›
        </button>
        <button className="iconbtn" type="button" aria-label="Last step" title="Latest" onClick={() => go(lastStep)}>
          »
        </button>
      </div>
      <input
        id="map-step"
        className="scrub"
        type="range"
        min={0}
        max={lastStep}
        value={step}
        aria-label="Step"
        onChange={(e) => go(Number(e.target.value))}
      />
      <span className="stepinfo" id="map-info">
        <b>
          {step} / {lastStep}
        </b>
        {event ? `${event.when.replace(/^c\. /, '')} · ${event.title}` : 'Before Runa acts'}
      </span>
      {event && (
        <button type="button" className="chip jump" id="map-open" onClick={() => onOpenEvent(event.id)}>
          Open on timeline
        </button>
      )}
    </div>
  );
}
