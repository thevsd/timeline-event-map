import { useCallback, useEffect, useRef, useState } from 'react';
import { Workspace, type Origin } from './Workspace';
import { DialogHost, type Dialog } from './components/editor/dialogs';
import { Home } from './components/home/Home';
import { demoDoc } from './data';
import { timelineOf } from './lib/urlState';
import { emptyDoc } from './model/edit';
import type { ParseResult } from './model/parse';
import type { TimelineDoc } from './model/schema';
import { AccountError, whoAmI, type Account } from './store/account';
import { readEmbedded } from './store/export';
import { loadTimeline } from './store/timelines';

/** The timeline that is open. A new `id` makes the workspace start afresh. */
interface Session {
  id: number;
  doc: TimelineDoc;
  origin: Origin;
  /** Id of the timeline in the account, once it is saved there. */
  savedId: string | null;
  /** Open ready to edit: a timeline just created or imported. */
  editing: boolean;
}

// An exported page carries its timeline; it opens straight onto it.
const EMBEDDED = readEmbedded();
/** What the address asks for when the page loads. */
const WANTED = EMBEDDED ? null : timelineOf(window.location.hash);

/** Saved timelines are named by their id in links; any other name but `demo` has nothing to reopen. */
const isSavedId = (token: string | null): token is string => !!token && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

let lastSessionId = 0;
const session = (doc: TimelineDoc, origin: Origin, savedId: string | null = null, editing = false): Session => ({
  id: ++lastSessionId,
  doc,
  origin,
  savedId,
  editing,
});

/**
 * History state of an entry made by opening a timeline from the home page. The browser's Back
 * button then returns to the home page, and Forward to the timeline.
 */
interface EntryState {
  fromHome: true;
  /** The timeline, as a link names it: `demo`, `embedded`, `new` or a saved id. */
  token: string;
}

const entryState = (): EntryState | null => {
  const state: unknown = window.history.state;
  return state && typeof state === 'object' && (state as EntryState).fromHome === true ? (state as EntryState) : null;
};

/** The address without its hash: the home page. */
const homeUrl = () => window.location.pathname + window.location.search;

/** Which timeline the current history entry stands for; null for the home page. */
function wantedNow(): string | null {
  // An exported page keeps no timeline name in its address; the entry's state tells.
  if (EMBEDDED) return entryState()?.token ?? null;
  return timelineOf(window.location.hash);
}

/**
 * The shell: the home page, or one timeline in a workspace.
 *
 * It decides which timeline is open (the demo, one saved to the account, a new or imported one,
 * or the one embedded in an exported page) and who is signed in. Nothing is kept in the browser:
 * a timeline is saved to the account or exported as a file.
 */
export default function App() {
  const [current, setCurrent] = useState<Session | null>(() =>
    EMBEDDED ? session(EMBEDDED.doc, 'embedded') : WANTED === 'demo' ? session(demoDoc, 'demo') : null,
  );
  /** 'offline' until the account server answers; a page opened from disk never offers accounts. */
  const [account, setAccount] = useState<Account | null | 'offline'>('offline');
  /** Still asking the server for a saved timeline the link names. */
  const [waiting, setWaiting] = useState(isSavedId(WANTED));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const leaveGuard = useRef<(() => boolean) | null>(null);

  /** Open a timeline from the home page, as a history entry of its own. */
  const enter = useCallback((next: Session) => {
    const token = next.origin === 'account' && next.savedId ? next.savedId : next.origin;
    try {
      window.history.pushState({ fromHome: true, token } satisfies EntryState, '', homeUrl());
    } catch {
      // Sandboxed frames may refuse history changes; Back then leaves the page as before.
    }
    setCurrent(next);
  }, []);

  const showHome = useCallback(() => {
    setCurrent(null);
    document.title = 'Timeline Event Map';
  }, []);

  // Who is signed in, and the saved timeline a link asks for. Older versions kept a draft in this
  // browser; nothing is kept between visits now, so it is cleared.
  useEffect(() => {
    try {
      indexedDB.deleteDatabase('timeline-event-map');
    } catch {
      // No storage here: nothing to clear.
    }
    void whoAmI().then(async (who) => {
      setAccount(who);
      if (!isSavedId(WANTED)) return;
      try {
        if (who && who !== 'offline') return setCurrent(session(await loadTimeline(WANTED), 'account', WANTED));
      } catch {
        // Deleted, someone else's, or the server is away: the home page instead.
      }
      window.history.replaceState(null, '', homeUrl());
    }).finally(() => setWaiting(false));
  }, []);

  // Back and Forward move between the home page and the timeline.
  useEffect(() => {
    const onPopState = () => {
      const wanted = wantedNow();
      if (!wanted) {
        // Unsaved changes or a form with input: stay, and let the workspace ask.
        if (leaveGuard.current?.()) return window.history.forward();
        return showHome();
      }
      if (isSavedId(wanted)) {
        void loadTimeline(wanted).then(
          (doc) => setCurrent((open) => open ?? session(doc, 'account', wanted)),
          () => {},
        );
        return;
      }
      // A new timeline that was left unsaved is gone; the home page stays.
      setCurrent((open) => {
        if (open) return open;
        if (wanted === 'demo') return session(demoDoc, 'demo');
        if (wanted === 'embedded' && EMBEDDED) return session(EMBEDDED.doc, 'embedded');
        return null;
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [showHome]);

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

  // The first save gives the timeline an id; the workspace keeps its session, so it carries on.
  const onSaved = useCallback((savedId: string) => {
    setCurrent((open) => (open ? { ...open, origin: 'account', savedId } : open));
  }, []);

  const openSaved = useCallback(
    (id: string) => {
      loadTimeline(id).then(
        (doc) => enter(session(doc, 'account', id)),
        (error: unknown) =>
          setDialog({
            type: 'message',
            title: 'This timeline could not be opened',
            lines: [error instanceof AccountError ? error.message : 'Something went wrong while loading it. Try again.'],
          }),
      );
    },
    [enter],
  );

  const onImport = useCallback(
    ({ doc, warnings }: ParseResult) => {
      enter(session(doc, 'new', null, true));
      if (!warnings.length) return;
      setDialog({
        type: 'message',
        title: `Imported, with ${warnings.length} thing${warnings.length === 1 ? '' : 's'} to check`,
        lines: warnings.slice(0, 40).concat(warnings.length > 40 ? [`…and ${warnings.length - 40} more.`] : []),
      });
    },
    [enter],
  );

  if (waiting) return null;

  // The pop-ups of the home page name no timeline; inside a workspace it has its own.
  return (
    <>
      {current ? (
        <Workspace
          key={current.id}
          initial={current.doc}
          origin={current.origin}
          savedId={current.savedId}
          startEditing={current.editing}
          account={account}
          onAccount={setAccount}
          onSaved={onSaved}
          onHome={goHome}
          leaveGuard={leaveGuard}
        />
      ) : (
        <Home
          account={account}
          onAccount={setAccount}
          embedded={EMBEDDED?.doc ?? null}
          onOpenEmbedded={() => EMBEDDED && enter(session(EMBEDDED.doc, 'embedded'))}
          onOpenDemo={() => enter(session(demoDoc, 'demo'))}
          onOpenSaved={openSaved}
          onCreate={(title) => enter(session(emptyDoc(title), 'new', null, true))}
          onImport={onImport}
        />
      )}
      {dialog && dialog.type === 'message' && <DialogHost dialog={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}
