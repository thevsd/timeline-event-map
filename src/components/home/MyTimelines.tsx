import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AccountError } from '../../store/account';
import { exportJson, formatSize } from '../../store/export';
import { SignedOut, changeTimeline, deleteTimeline, listTimelines, loadTimeline, type SavedTimeline } from '../../store/timelines';

interface MyTimelinesProps {
  onOpen(id: string): void;
  /** The server says no one is signed in any more. */
  onSignedOut(): void;
}

/** Up to this many timelines all show; beyond it, only the pinned ones do and the rest fold away. */
const SHOWN = 3;

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

/**
 * The signed-in account's timelines, newest first and pinned ones on top. With more than three, the
 * unpinned ones fold into a closed "More timelines" section, or, with nothing pinned, the whole list
 * folds under its heading. Each row has a menu: rename, pin, export, delete.
 */
export function MyTimelines({ onOpen, onSignedOut }: MyTimelinesProps) {
  const [list, setList] = useState<SavedTimeline[] | null>(null);
  const [problem, setProblem] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  /** Id of the row whose menu is open. It closes on a click anywhere else, or Escape. */
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuBox = useRef<HTMLDivElement>(null);

  const fail = (error: unknown) => {
    if (error instanceof SignedOut) onSignedOut();
    setProblem(error instanceof AccountError ? error.message : 'Something went wrong. Try again.');
  };

  useEffect(() => {
    listTimelines().then(setList, fail);
    // Once, when the list appears: a new sign-in mounts it afresh.
  }, []);

  useEffect(() => {
    if (!menuFor) return;
    const close = (ev: Event) => {
      if (ev instanceof KeyboardEvent ? ev.key === 'Escape' : !menuBox.current?.contains(ev.target as Node)) setMenuFor(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuFor]);

  if (!list) return problem ? <p className="homeproblem" role="alert">{problem}</p> : null;

  const replace = (saved: SavedTimeline) => setList((current) => current?.map((t) => (t.id === saved.id ? saved : t)) ?? null);
  const change = (id: string, what: { title?: string; pinned?: boolean }) => {
    setProblem('');
    changeTimeline(id, what).then(replace, fail);
  };

  const rename = (ev: FormEvent) => {
    ev.preventDefault();
    if (!renaming) return;
    const { id, title } = renaming;
    setRenaming(null);
    if (title.trim() !== list.find((t) => t.id === id)?.title) change(id, { title });
  };

  const remove = (item: SavedTimeline) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    deleteTimeline(item.id).then(() => setList((current) => current?.filter((t) => t.id !== item.id) ?? null), fail);
  };

  const choose = (action: () => void) => () => {
    setMenuFor(null);
    action();
  };

  const pinned = list.filter((t) => t.pinned);
  const rest = list.filter((t) => !t.pinned);
  const folds = list.length > SHOWN;
  const shown = folds ? pinned : [...pinned, ...rest];

  const row = (item: SavedTimeline) => (
    <li key={item.id}>
      <span className="pinmark" title={item.pinned ? 'Pinned' : undefined}>
        {item.pinned && <PinIcon />}
      </span>
      {renaming?.id === item.id ? (
        <form className="minerename" onSubmit={rename}>
          <input
            type="text"
            aria-label="New name"
            autoFocus
            value={renaming.title}
            onChange={(e) => setRenaming({ id: item.id, title: e.target.value })}
            onKeyDown={(ev) => ev.key === 'Escape' && setRenaming(null)}
          />
          <button type="submit" className="textbtn primary">
            Rename
          </button>
          <button type="button" className="textbtn" onClick={() => setRenaming(null)}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <button type="button" className="minetitle" onClick={() => onOpen(item.id)}>
            {item.title}
          </button>
          <span className="meta">
            {formatSize(item.size)} · saved {when(item.updatedAt)}
          </span>
          <div className="menubox" ref={menuFor === item.id ? menuBox : undefined}>
            <button
              type="button"
              className="textbtn"
              aria-label={`More for “${item.title}”`}
              aria-haspopup="menu"
              aria-expanded={menuFor === item.id}
              onClick={() => setMenuFor(menuFor === item.id ? null : item.id)}
            >
              …
            </button>
            {menuFor === item.id && (
              <div className="menu" role="menu">
                <button type="button" role="menuitem" onClick={choose(() => setRenaming({ id: item.id, title: item.title }))}>
                  Rename
                </button>
                <button type="button" role="menuitem" onClick={choose(() => change(item.id, { pinned: !item.pinned }))}>
                  {item.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button type="button" role="menuitem" onClick={choose(() => void loadTimeline(item.id).then(exportJson, fail))}>
                  Export to local
                </button>
                <button type="button" role="menuitem" className="danger" onClick={choose(() => remove(item))}>
                  Delete
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </li>
  );

  if (folds && !pinned.length) {
    return (
      <section aria-labelledby="mine-title" className="mine">
        {problem && (
          <p className="homeproblem" role="alert">
            {problem}
          </p>
        )}
        <details className="minetop">
          <summary>
            <h2 id="mine-title" className="sectiontitle">
              My timelines ({list.length})
            </h2>
          </summary>
          <ol className="minelist">{list.map(row)}</ol>
        </details>
      </section>
    );
  }

  return (
    <section aria-labelledby="mine-title" className="mine">
      <h2 id="mine-title" className="sectiontitle">
        My timelines
      </h2>
      {problem && (
        <p className="homeproblem" role="alert">
          {problem}
        </p>
      )}
      {list.length === 0 && <p className="fine">Nothing saved yet. Open a timeline and press Save to keep it here.</p>}
      {shown.length > 0 && <ol className="minelist">{shown.map(row)}</ol>}
      {folds && rest.length > 0 && (
        <details className="minemore">
          <summary>More timelines ({rest.length})</summary>
          <ol className="minelist">{rest.map(row)}</ol>
        </details>
      )}
    </section>
  );
}
