import type { ZoomLevel } from '../engine/config';

const LEVELS: { id: ZoomLevel; label: string }[] = [
  { id: 'quarters', label: 'Quarters' },
  { id: 'months', label: 'Months' },
  { id: 'weeks', label: 'Weeks' },
  { id: 'days', label: 'Days' },
];

interface ToolbarProps {
  search: string;
  onSearch(text: string): void;
  /** Tick level currently shown on the axis. */
  level: ZoomLevel;
  onLevel(level: ZoomLevel): void;
  /** Multiply the zoom by a factor. */
  onZoom(factor: number): void;
}

/** Title, search box and zoom controls. */
export function Toolbar({ search, onSearch, level, onLevel, onZoom }: ToolbarProps) {
  return (
    <header className="bar">
      <div className="brand">
        <span className="moon" aria-hidden="true" />
        <div>
          <h1>Modern Villainess Timeline</h1>
          <p>Event map of English Vols. 1–5, counting down to 15 September 2008</p>
        </div>
      </div>
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
    </header>
  );
}
