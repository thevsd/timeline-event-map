import { useCallback, useEffect, useRef, useState } from 'react';
import { Workspace, type Origin } from './Workspace';
import { DialogHost, type Dialog } from './components/editor/dialogs';
import { Home } from './components/home/Home';
import { demoDoc } from './data';
import { timelineOf } from './lib/urlState';
import { emptyDoc } from './model/edit';
import type { ParseResult } from './model/parse';
import type { TimelineDoc } from './model/schema';
import { clearDraft, loadDraft, saveDraft } from './store/draft';
import { readEmbedded } from './store/export';

/** The timeline that is open. A new `id` makes the workspace start afresh. */
interface Session {
  id: number;
  doc: TimelineDoc;
  origin: Origin;
  /** Open ready to edit: a timeline just created or imported. */
  editing: boolean;
}

/** Pause after the last edit before the draft is written. */
const SAVE_DELAY = 400;

// An exported page carries its timeline; it opens straight onto it.
const EMBEDDED = readEmbedded();
/** What the address asks for when the page loads. */
const WANTED = EMBEDDED ? null : timelineOf(window.location.hash);

let lastSessionId = 0;
const session = (doc: TimelineDoc, origin: Origin, editing = false): Session => ({ id: ++lastSessionId, doc, origin, editing });

/**
 * History state of an entry made by opening a timeline from the home page. The browser's Back
 * button then returns to the home page, and Forward to the timeline.
 */
interface EntryState {
  fromHome: true;
  origin: Origin;
}

const entryState = (): EntryState | null => {
  const state: unknown = window.history.state;
  return state && typeof state === 'object' && (state as EntryState).fromHome === true ? (state as EntryState) : null;
};

/** The address without its hash: the home page. */
const homeUrl = () => window.location.pathname + window.location.search;

/** Which timeline the current history entry stands for; null for the home page. */
function wantedNow(): Origin | null {
  // An exported page keeps no timeline name in its address; the entry's state tells.
  if (EMBEDDED) return entryState()?.origin ?? null;
  return timelineOf(window.location.hash);
}

/**
 * The shell: the home page, or one timeline in a workspace.
 *
 * It decides which timeline is open (the demo, the draft kept in this browser, an imported
 * file, or the one embedded in an exported page) and keeps the draft saved.
 */
export default function App() {
  const [current, setCurrent] = useState<Session | null>(() =>
    EMBEDDED ? session(EMBEDDED.doc, 'embedded') : WANTED === 'demo' ? session(demoDoc, 'demo') : null,
  );
  /** The draft in storage: offered on the home page, and replaced when another timeline is edited. */
  const [draft, setDraft] = useState<TimelineDoc | null>(null);
  /** Still reading storage for a link that asks for the draft. */
  const [waiting, setWaiting] = useState(WANTED === 'draft');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const leaveGuard = useRef<(() => boolean) | null>(null);

  /** Open a timeline from the home page, as a history entry of its own. */
  const enter = useCallback((next: Session) => {
    try {
      window.history.pushState({ fromHome: true, origin: next.origin } satisfies EntryState, '', homeUrl());
    } catch {
      // Sandboxed frames may refuse history changes; Back then leaves the page as before.
    }
    setCurrent(next);
  }, []);

  const showHome = useCallback(() => {
    setCurrent(null);
    document.title = 'Timeline Event Map';
  }, []);

  // Back and Forward move between the home page and the timeline.
  useEffect(() => {
    const onPopState = () => {
      const wanted = wantedNow();
      if (!wanted) {
        // A form with unsaved changes: stay, and let the workspace ask.
        if (leaveGuard.current?.()) return window.history.forward();
        return showHome();
      }
      setCurrent((open) => {
        if (open) return open;
        if (wanted === 'demo') return session(demoDoc, 'demo');
        if (wanted === 'embedded') return EMBEDDED ? session(EMBEDDED.doc, 'embedded') : null;
        return draftRef.current ? session(draftRef.current, 'draft', true) : null;
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [showHome]);

  // Find the draft once. A link to it opens it; otherwise it waits on the home page.
  useEffect(() => {
    void loadDraft().then((saved) => {
      setDraft(saved);
      if (WANTED === 'draft' && saved) setCurrent(session(saved, 'draft', true));
      setWaiting(false);
    });
  }, []);

  /** Leave the timeline for the home page. */
  const goHome = useCallback(() => {
    // Reached from the home page: step back to that entry, as the Back button would.
    if (entryState()) return window.history.back();
    showHome();
    try {
      window.history.replaceState(null, '', homeUrl());
    } catch {
      // Sandboxed frames may refuse history changes.
    }
  }, [showHome]);

  // Keep the draft saved while it is edited. An edited demo or exported page becomes the draft; the
  // workspace keeps its id, so it carries on without starting afresh.
  const saveTimer = useRef(0);
  const onChange = useCallback((doc: TimelineDoc) => {
    setDraft(doc);
    setCurrent((open) => (open && open.origin !== 'draft' ? { ...open, origin: 'draft' } : open));
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveDraft(doc), SAVE_DELAY);
  }, []);

  /** Open `doc` as the draft, asking first if that replaces a different one. */
  const openAsDraft = useCallback(
    (doc: TimelineDoc, after?: () => void) => {
      const start = () => {
        setDraft(doc);
        void saveDraft(doc);
        enter(session(doc, 'draft', true));
        after?.();
      };
      if (!draft) return start();
      setDialog({
        type: 'confirm',
        title: 'Replace your draft?',
        message: `“${draft.title}” is kept in this browser as your draft. Starting another timeline replaces it. Export it first if you still need it.`,
        confirm: 'Replace my draft',
        danger: true,
        onConfirm: start,
      });
    },
    [draft, enter],
  );

  const onImport = useCallback(
    ({ doc, warnings }: ParseResult) => {
      openAsDraft(doc, () => {
        if (!warnings.length) return;
        setDialog({
          type: 'message',
          title: `Imported, with ${warnings.length} thing${warnings.length === 1 ? '' : 's'} to check`,
          lines: warnings.slice(0, 40).concat(warnings.length > 40 ? [`…and ${warnings.length - 40} more.`] : []),
        });
      });
    },
    [openAsDraft],
  );

  const discardDraft = useCallback(() => {
    if (!draft) return;
    setDialog({
      type: 'confirm',
      title: 'Discard your draft?',
      message: `“${draft.title}” will be removed from this browser. This cannot be undone.`,
      confirm: 'Discard draft',
      danger: true,
      onConfirm: () => {
        setDraft(null);
        void clearDraft();
      },
    });
  }, [draft]);

  if (waiting) return null;

  // The pop-ups of the home page name no timeline; inside a workspace it has its own.
  return (
    <>
      {current ? (
        <Workspace
          key={current.id}
          initial={current.doc}
          origin={current.origin}
          startEditing={current.editing}
          draftTitle={current.origin === 'draft' ? null : (draft?.title ?? null)}
          onChange={onChange}
          onHome={goHome}
          leaveGuard={leaveGuard}
        />
      ) : (
        <Home
          draft={draft}
          embedded={EMBEDDED?.doc ?? null}
          onOpenEmbedded={() => EMBEDDED && enter(session(EMBEDDED.doc, 'embedded'))}
          onOpenDemo={() => enter(session(demoDoc, 'demo'))}
          onOpenDraft={() => draft && enter(session(draft, 'draft', true))}
          onDiscardDraft={discardDraft}
          onCreate={(title) => openAsDraft(emptyDoc(title))}
          onImport={onImport}
        />
      )}
      {dialog && (dialog.type === 'confirm' || dialog.type === 'message') && <DialogHost dialog={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}
