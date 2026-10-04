interface ThreadBarProps {
  /** Number of events picked so far. */
  count: number;
  /** Name of the thread being changed; empty for a new one. */
  name: string;
  onUndo(): void;
  onCancel(): void;
  onSave(): void;
}

/** Shown in place of the filter row during thread mode: what to do, how far along, and the way out. */
export function ThreadBar({ count, name, onUndo, onCancel, onSave }: ThreadBarProps) {
  return (
    <div className="rail threadbar" role="status">
      <span className="tbmode">{name ? `Thread · ${name}` : 'Thread mode'}</span>
      <span className="tbhint">Click the cards that belong to the thread. Click one again to take it out.</span>
      <span className="count">
        {count} event{count === 1 ? '' : 's'} picked
      </span>
      <button type="button" className="textbtn" disabled={!count} onClick={onUndo}>
        Undo last
      </button>
      <button type="button" className="textbtn" id="thread-cancel" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" className="textbtn primary" id="thread-save" disabled={!count} onClick={onSave}>
        Save thread…
      </button>
    </div>
  );
}
