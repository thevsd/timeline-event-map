import { useEffect, useState } from 'react';
import type { ZoomLevel } from '../engine/config';
import type { View } from '../types';

const LEVELS: { id: ZoomLevel; label: string }[] = [
  { id: 'quarters', label: 'Quarters' },
  { id: 'months', label: 'Months' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'days', label: 'Days' },
];

const VIEWS: { id: View; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'map', label: 'Corporate map' },
  { id: 'cast', label: 'Characters' },
];

interface ToolbarProps {
  view: View;
  onView(view: View): void;
  search: string;
  onSearch(text: string): void;
  /** Tick level currently shown on the axis. */
  level: ZoomLevel;
  onLevel(level: ZoomLevel): void;
  /** Multiply the zoom by a factor. */
  onZoom(factor: number): void;
  /** Copy a link to the current state; resolves to whether the clipboard accepted it. */
  onCopyLink(): Promise<boolean>;
}

/** Title, view switch, search box, zoom controls and the share button. */
export function Toolbar({ view, onView, search, onSearch, level, onLevel, onZoom, onCopyLink }: ToolbarProps) {
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

      {view === 'timeline' && (
        <>
          <input
            id="search"
            className="search"
            type="search"
            placeholder="Search events or people"
            aria-label="Search events or people"
            autoComplete="off"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
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
        </>
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
