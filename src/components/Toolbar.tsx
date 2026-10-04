import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../context';
import { ZOOM_LEVELS, type ZoomLevel } from '../engine/config';
import type { View, ViewPage } from '../types';
import { SearchBox } from './SearchBox';

const LEVEL_LABEL: Record<ZoomLevel, string> = {
  decades: 'Decades',
  years: 'Years',
  quarters: 'Quarters',
  months: 'Months',
  weeks: 'Weeks',
  days: 'Days',
};

const VIEW_LABEL: Record<View, string> = { timeline: 'Timeline', cast: 'People', glossary: 'Glossary', map: 'Corporate map' };

interface ToolbarProps {
  view: View;
  /** Views this timeline has, in order. */
  views: readonly View[];
  onView(view: View): void;
  /** Leave the timeline for the home page. */
  onHome(): void;
  /** Open the page of a search result. */
  onPick(page: ViewPage): void;
  /** Narrow the timeline to the events matching a search text. */
  onFilterText(query: string): void;
  /** Reading progress: the last part the reader has finished. */
  progress: number;
  onProgress(part: number): void;
  /** Tick level currently shown on the axis, and the levels this timeline is long enough to use. */
  level: ZoomLevel;
  levels: readonly ZoomLevel[];
  onLevel(level: ZoomLevel): void;
  /** Multiply the zoom by a factor. */
  onZoom(factor: number): void;
  editing: boolean;
  onEditing(editing: boolean): void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  /** Copy a link to the current state; resolves to whether the clipboard accepted it. Null where links make no sense. */
  onCopyLink: (() => Promise<boolean>) | null;
  onExportHtml(): void;
  onExportJson(): void;
  /** One line on where the timeline is kept, e.g. "Saved in this browser". */
  status: string;
}

/** Title, view switch, search box, reading progress, zoom controls, the edit switch and the share menu. */
export function Toolbar(props: ToolbarProps) {
  const { view, views, onView, onHome, onPick, onFilterText, progress, onProgress, level, levels, onLevel, onZoom } = props;
  const { editing, onEditing, canUndo, canRedo, onUndo, onRedo, onCopyLink, onExportHtml, onExportJson, status } = props;
  const { doc } = useWorld();

  // Outcome of the last copy, shown in the menu for a moment.
  const [copied, setCopied] = useState<boolean | null>(null);
  useEffect(() => {
    if (copied === null) return;
    const timer = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // The share menu closes on a click anywhere else, or Escape.
  const [menu, setMenu] = useState(false);
  const menuBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (ev: Event) => {
      if (ev instanceof KeyboardEvent ? ev.key === 'Escape' : !menuBox.current?.contains(ev.target as Node)) setMenu(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menu]);
  const choose = (action: () => void) => () => {
    setMenu(false);
    action();
  };

  return (
    <header className="bar">
      <div className="brand">
        <button type="button" className="moon" id="home" aria-label="Home" title="Back to the home page" onClick={onHome} />
        <div>
          <h1>{doc.title}</h1>
          {doc.subtitle && <p>{doc.subtitle}</p>}
        </div>
      </div>

      <div className="seg" id="views" role="group" aria-label="View">
        {views.map((v) => (
          <button key={v} type="button" data-view={v} aria-pressed={view === v} onClick={() => onView(v)}>
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      <SearchBox onPick={onPick} onFilter={onFilterText} />

      {doc.parts.length > 1 && (
        <label className="progress" title="Hide everything from the parts you have not reached yet">
          <span>Read up to</span>
          <select
            id="progress"
            className={`pick${progress < doc.parts.length ? ' on' : ''}`}
            value={progress}
            onChange={(e) => onProgress(Number(e.target.value))}
          >
            {doc.parts.map((name, index) => (
              <option key={name} value={index + 1}>
                {index + 1 === doc.parts.length ? `${name} (everything)` : name}
              </option>
            ))}
          </select>
        </label>
      )}

      {view === 'timeline' && (
        <div className="zoom">
          <button className="iconbtn" type="button" aria-label="Zoom out" title="Zoom out" onClick={() => onZoom(1 / 1.7)}>
            −
          </button>
          <div className="seg" id="scale" role="group" aria-label="Time scale">
            {levels.map((l) => (
              <button key={l} type="button" data-level={l} aria-pressed={level === l} onClick={() => onLevel(l)}>
                {LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
          <button className="iconbtn" type="button" aria-label="Zoom in" title="Zoom in" onClick={() => onZoom(1.7)}>
            +
          </button>
        </div>
      )}

      <div className="tools">
        {editing && (
          <>
            <button className="iconbtn" type="button" id="undo" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
              ↶
            </button>
            <button className="iconbtn" type="button" id="redo" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
              ↷
            </button>
          </>
        )}
        <button
          id="edit"
          className={editing ? 'textbtn on' : 'textbtn'}
          type="button"
          aria-pressed={editing}
          title={editing ? 'Stop editing' : 'Add and change events, people and terms'}
          onClick={() => onEditing(!editing)}
        >
          {editing ? 'Done editing' : 'Edit'}
        </button>
        <div className="menubox" ref={menuBox}>
          <button id="share" className="textbtn" type="button" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            {copied === null ? 'Share' : copied ? 'Link copied' : 'Link is in the address bar'}
          </button>
          {menu && (
            <div className="menu" role="menu">
              <button type="button" role="menuitem" id="export-html" onClick={choose(onExportHtml)}>
                Export as a web page (.html)
                <small>One file that opens straight onto this timeline</small>
              </button>
              <button type="button" role="menuitem" id="export-json" onClick={choose(onExportJson)}>
                Export as data (.json)
                <small>To import again, or to hand to an AI model</small>
              </button>
              {onCopyLink && (
                <button type="button" role="menuitem" id="copy-link" onClick={choose(() => void onCopyLink().then(setCopied))}>
                  Copy link
                  <small>Reopens this exact view in this browser</small>
                </button>
              )}
              <span className="menunote">{status}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** Levels a timeline can reach: every level from the finest down to the one its furthest zoom-out lands on. */
export function levelsFrom(coarsest: ZoomLevel): ZoomLevel[] {
  return ZOOM_LEVELS.slice(ZOOM_LEVELS.indexOf(coarsest));
}
