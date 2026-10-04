import { useCallback, useState } from 'react';
import type { TimelineDoc } from '../model/schema';

/** How many steps back undo can go. */
const HISTORY_LIMIT = 100;

interface History {
  doc: TimelineDoc;
  past: TimelineDoc[];
  future: TimelineDoc[];
}

/**
 * The document being viewed or edited, with undo and redo.
 *
 * Documents are never changed in place (see model/edit.ts), so history is just the earlier values.
 */
export function useDocument(initial: TimelineDoc) {
  const [history, setHistory] = useState<History>({ doc: initial, past: [], future: [] });

  /** Store a changed document as one undoable step. */
  const set = useCallback((doc: TimelineDoc) => {
    setHistory((current) =>
      doc === current.doc ? current : { doc, past: [...current.past.slice(1 - HISTORY_LIMIT), current.doc], future: [] },
    );
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past[current.past.length - 1];
      return previous ? { doc: previous, past: current.past.slice(0, -1), future: [current.doc, ...current.future] } : current;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future;
      return next ? { doc: next, past: [...current.past, current.doc], future: rest } : current;
    });
  }, []);

  return { doc: history.doc, set, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}
