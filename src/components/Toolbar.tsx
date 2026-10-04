import { useEffect, useState } from 'react';
import type { ZoomLevel } from '../engine/config';
import { LAST_VOLUME } from '../lib/spoilers';
import type { PanelPage, View } from '../types';
import { SearchBox } from './SearchBox';

const LEVELS: { id: ZoomLevel; label: string }[] = [
  { id: 'quarters', label: 'Quarters' },
  { id: 'months', label: 'Months' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'days', label: 'Days' },
];

const VOLUMES = Array.from({ length: LAST_VOLUME }, (_, i) => i + 1);

const VIEWS: { id: View; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'map', label: 'Corporate map' },
  { id: 'cast', label: 'Characters' },
];

interface ToolbarProps {
  view: View;
  onView(view: View): void;
  /** Open the page of a search result. */
  onPick(page: PanelPage): void;
  /** Narrow the timeline to the events matching a search text. */
  onFilterText(query: string): void;
  /** Reading progress: the last volume the reader has finished. */
  progress: number;
  onProgress(volume: number): void;
  /** Tick level currently shown on the axis. */
  level: ZoomLevel;
  onLevel(level: ZoomLevel): void;
  /** Multiply the zoom by a factor. */
  onZoom(factor: number): void;
  /** Copy a link to the current state; resolves to whether the clipboard accepted it. */
  onCopyLink(): Promise<boolean>;
}

/** Title, view switch, search box, reading progress, zoom controls and the share button. */
export function Toolbar(props: ToolbarProps) {
  const { view, onView, onPick, onFilterText, progress, onProgress, level, onLevel, onZoom, onCopyLink } = props;
  // Outcome of the last copy, shown on the button for a moment.
  const [copied, setCopied] = useState<boolean | null>(null);
  useEffect(() => {
    if (copied === null) return;
    const timer = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <header className="bar">
      <div className="brand">
        <span className="moon" aria-hidden="true" />
        <div>
          <h1>Modern Villainess Timeline</h1>
          <p>Event map of English Vols. 1–5, counting down to 15 September 2008</p>
        </div>
      </div>

      <div className="seg" id="views" role="group" aria-label="View">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" data-view={v.id} aria-pressed={view === v.id} onClick={() => onView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>

      <SearchBox onPick={onPick} onFilter={onFilterText} />

      <label className="progress" title="Hide everything from the volumes you have not read yet">
        <span>Read up to</span>
        <select
          id="progress"
          className={`pick${progress < LAST_VOLUME ? ' on' : ''}`}
          value={progress}
          onChange={(e) => onProgress(Number(e.target.value))}
        >
          {VOLUMES.map((volume) => (
            <option key={volume} value={volume}>
              {volume === LAST_VOLUME ? `Vol. ${volume} (everything)` : `Vol. ${volume}`}
            </option>
          ))}
        </select>
      </label>

      {view === 'timeline' && (
        <div className="zoom">
          <button className="iconbtn" type="button" aria-label="Zoom out" title="Zoom out" onClick={() => onZoom(1 / 1.7)}>
            −
          </button>
          <div className="seg" id="scale" role="group" aria-label="Time scale">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" data-level={l.id} aria-pressed={level === l.id} onClick={() => onLevel(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <button className="iconbtn" type="button" aria-label="Zoom in" title="Zoom in" onClick={() => onZoom(1.7)}>
            +
          </button>
        </div>
      )}

      <button
        id="share"
        className="textbtn"
        type="button"
        title="Copy a link that reopens this exact view"
        onClick={() => void onCopyLink().then(setCopied)}
      >
        {copied === null ? 'Copy link' : copied ? 'Link copied' : 'Link is in the address bar'}
      </button>
    </header>
  );
}
