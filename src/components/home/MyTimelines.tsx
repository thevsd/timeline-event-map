import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { AccountError } from '../../store/account';
import { formatSize } from '../../store/export';
import { SignedOut, deleteTimeline, listTimelines, renameTimeline, reorderTimelines, type SavedTimeline } from '../../store/timelines';

interface MyTimelinesProps {
  onOpen(id: string): void;
  /** The server says no one is signed in any more. */
  onSignedOut(): void;
}

/** `list` with `id` moved to `index`. */
function moved(list: SavedTimeline[], id: string, index: number): SavedTimeline[] {
  const item = list.find((t) => t.id === id);
  if (!item) return list;
  const rest = list.filter((t) => t.id !== id);
  return [...rest.slice(0, index), item, ...rest.slice(index)];
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * The signed-in account's timelines: open one, rename it, delete it, or drag it by its handle
 * (arrow keys on the handle do the same) to change the order.
 */
export function MyTimelines({ onOpen, onSignedOut }: MyTimelinesProps) {
  const [list, setList] = useState<SavedTimeline[] | null>(null);
  const [problem, setProblem] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  /** Id of the row being dragged, and the order when the drag began. */
  const drag = useRef<{ id: string; before: string } | null>(null);

  const fail = (error: unknown) => {
    if (error instanceof SignedOut) onSignedOut();
    setProblem(error instanceof AccountError ? error.message : 'Something went wrong. Try again.');
  };

  useEffect(() => {
    listTimelines().then(setList, fail);
    // Once, when the list appears: a new sign-in mounts it afresh.
  }, []);

  if (!list) return problem ? <p className="homeproblem" role="alert">{problem}</p> : null;

  const order = (next: SavedTimeline[]) => next.map((t) => t.id).join();
  const storeOrder = (next: SavedTimeline[]) => {
    setProblem('');
    reorderTimelines(next.map((t) => t.id)).catch(fail);
  };

  const onHandleKey = (ev: KeyboardEvent, index: number, id: string) => {
    const to = ev.key === 'ArrowUp' ? index - 1 : ev.key === 'ArrowDown' ? index + 1 : -1;
    if (to < 0 || to >= list.length) return;
    ev.preventDefault();
    const next = moved(list, id, to);
    setList(next);
    storeOrder(next);
  };

  const rename = (ev: FormEvent) => {
    ev.preventDefault();
    if (!renaming) return;
    const { id, title } = renaming;
    setRenaming(null);
    if (title.trim() === list.find((t) => t.id === id)?.title) return;
    renameTimeline(id, title).then((saved) => setList((current) => current?.map((t) => (t.id === id ? saved : t)) ?? null), fail);
  };

  const remove = (item: SavedTimeline) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    deleteTimeline(item.id).then(() => setList((current) => current?.filter((t) => t.id !== item.id) ?? null), fail);
  };

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
      {list.length === 0 ? (
        <p className="fine">Nothing saved yet. Open a timeline and press Save to keep it here.</p>
      ) : (
        <ol className="minelist">
          {list.map((item, index) => (
            <li
              key={item.id}
              className={drag.current?.id === item.id ? 'dragging' : undefined}
              onDragOver={(ev: DragEvent) => {
                if (!drag.current) return;
                ev.preventDefault();
                // The list follows the pointer; the order is stored when the drag ends.
                if (drag.current.id !== item.id) setList(moved(list, drag.current.id, index));
              }}
              onDrop={(ev: DragEvent) => ev.preventDefault()}
            >
              <button
                type="button"
                className="handle"
                draggable
                aria-label={`Move “${item.title}”: drag, or use the arrow keys`}
                title="Drag to move, or use the arrow keys"
                onKeyDown={(ev) => onHandleKey(ev, index, item.id)}
                onDragStart={(ev: DragEvent<HTMLButtonElement>) => {
                  drag.current = { id: item.id, before: order(list) };
                  ev.dataTransfer.effectAllowed = 'move';
                  ev.dataTransfer.setData('text/plain', item.title);
                  // Drag the whole row, not just the handle.
                  const row = ev.currentTarget.closest('li');
                  if (row) ev.dataTransfer.setDragImage(row, 16, 16);
                }}
                onDragEnd={() => {
                  const before = drag.current?.before;
                  drag.current = null;
                  if (before !== order(list)) storeOrder(list);
                  else setList([...list]);
                }}
              >
                ⠿
              </button>
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
                  <span className="startactions">
                    <button type="button" className="textbtn" onClick={() => setRenaming({ id: item.id, title: item.title })}>
                      Rename
                    </button>
                    <button type="button" className="textbtn danger" onClick={() => remove(item)}>
                      Delete
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
