import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CastRail } from './components/CastRail';
import { CharacterList } from './components/CharacterList';
import { CorporateMap } from './components/CorporateMap';
import { DetailPanel } from './components/DetailPanel';
import { FilterRail } from './components/FilterRail';
import { GlossaryList } from './components/GlossaryList';
import { GlossaryRail } from './components/GlossaryRail';
import { HoverPreview, type Preview } from './components/HoverPreview';
import { MapControls } from './components/MapControls';
import { ThreadBar } from './components/ThreadBar';
import { Toolbar, levelsFrom } from './components/Toolbar';
import { DialogHost, type Dialog } from './components/editor/dialogs';
import type { FormProps } from './components/editor/form';
import { AccountDialog } from './components/home/AccountDialog';
import { TermContext, WorldContext, type TermActions } from './context';
import type { ZoomLevel } from './engine/config';
import type { Reveal } from './engine/types';
import { useDocument } from './hooks/useDocument';
import { useTimeline } from './hooks/useTimeline';
import { corporateOf, hasCorporateMap } from './lib/corporate';
import { search as searchWorld } from './lib/search';
import { loadProgress, saveProgress } from './lib/spoilers';
import { formatUrlState, parseUrlState, type UrlState } from './lib/urlState';
import { newId, saveThread } from './model/edit';
import { DocError } from './model/parse';
import { matchesFilter, type EventFilter } from './model/filter';
import type { ThreadDoc, TimelineDoc } from './model/schema';
import { worldOf, type World } from './model/world';
import { AccountError, type Account } from './store/account';
import { exportHtml, exportJson, exportText } from './store/export';
import { SignedOut, saveTimeline } from './store/timelines';
import type { FormTarget, OpenMode, PanelPage, View, ViewPage } from './types';

/** Pause after the last change before the address bar is updated. */
const URL_WRITE_DELAY = 250;

/** Where the timeline on screen came from: built in, saved to the account, saved nowhere yet, or an exported page. */
export type Origin = 'demo' | 'account' | 'new' | 'embedded';

interface WorkspaceProps {
  /** The timeline to open. Later changes are kept here, with their history. */
  initial: TimelineDoc;
  origin: Origin;
  /** Id of the timeline in the account; null until it is first saved there. */
  savedId: string | null;
  /** Open with editing switched on, as for a timeline just created. */
  startEditing: boolean;
  /** Who is signed in; 'offline' where there is no account server (a page opened from disk). */
  account: Account | null | 'offline';
  /** Someone signed in, or the server said the session is over. */
  onAccount(account: Account | null): void;
  /** The first save to the account gave the timeline this id. */
  onSaved(savedId: string): void;
  onHome(): void;
  /**
   * Set while the workspace is open: asked when the browser's Back button leaves for the home
   * page. Returns true when there is something to lose (unsaved changes, a form with input); the
   * workspace then asks the reader itself.
   */
  leaveGuard: { current: (() => boolean) | null };
}

/** A thread being put together by clicking cards. */
interface ThreadDraft {
  /** Id of the thread being changed; null for a new one. */
  id: string | null;
  name: string;
  summary: string;
  events: string[];
}

/** Whether a page points at something that exists and that the reader's progress allows. */
function pageExists(page: PanelPage, world: World): boolean {
  switch (page.kind) {
    case 'event': return world.eventById.has(page.id);
    case 'person': return world.personByName.has(page.name);
    case 'thread': return world.threadById.has(page.id);
    case 'lane': return world.laneById.has(page.id);
    case 'company': {
      if (!hasCorporateMap(world.doc)) return false;
      const node = corporateOf(world).nodeById.get(page.id);
      return node != null && (node.since == null || world.eventById.has(node.since));
    }
    case 'term': return world.termById.has(page.id);
    case 'form': return true;
  }
}

/** Turn what a link says into state, dropping anything unknown or beyond the reader's progress. */
function fromUrl(url: UrlState, world: World) {
  const selectedId = url.event && world.eventById.has(url.event) ? url.event : null;
  const page = url.page && pageExists(url.page, world) ? url.page : null;
  const stack: PanelPage[] = [];
  if (selectedId) stack.push({ kind: 'event', id: selectedId });
  if (page) stack.push(page);
  const lastStep = hasCorporateMap(world.doc) ? corporateOf(world).lastStep : 0;
  return {
    view: url.view === 'map' && !hasCorporateMap(world.doc) ? ('timeline' as const) : url.view,
    hidden: new Set(
      url.only?.length
        ? world.categories.filter((c) => !url.only!.includes(c.id)).map((c) => c.id)
        : url.hidden.filter((id) => world.categoryById.has(id)),
    ),
    search: url.query,
    person: url.person && world.personByName.has(url.person) ? url.person : null,
    thread: url.thread && world.threadById.has(url.thread) ? url.thread : null,
    lane: url.lane,
    selectedId,
    stack,
    mapStep: Math.min(lastStep, url.mapStep ?? lastStep),
    zoom: url.zoom,
  };
}

/**
 * One timeline on screen. React owns the toolbar, filters, side panel, pop-ups, the people and
 * glossary lists; the timeline itself is drawn by the engine (see engine/Timeline.ts) inside the stage.
 *
 * Everything shown is read from the World built for the document and the reader's progress
 * (see model/world.ts). State worth sharing (view, zoom, selection, filters) is mirrored into
 * the URL hash; reading progress is the reader's own setting and stays in the browser.
 */
export function Workspace({ initial, origin, savedId, startEditing, account, onAccount, onSaved, onHome, leaveGuard }: WorkspaceProps) {
  const { doc, set: setDoc, undo, redo, canUndo, canRedo } = useDocument(initial);
  /** The document as last saved, or as opened: leaving it as it is loses nothing. Undo back to it counts too. */
  const [savedDoc, setSavedDoc] = useState(initial);
  const dirty = doc !== savedDoc;

  /** Last part the reader has finished; everything later is hidden. Null reads everything. */
  const [progress, setProgress] = useState(() => loadProgress(initial.title));
  const world = useMemo(() => worldOf(doc, Math.min(progress ?? Infinity, doc.parts.length)), [doc, progress]);
  const hasMap = hasCorporateMap(doc);
  const lastStep = hasMap ? corporateOf(world).lastStep : 0;

  // State the page was opened with: whatever its link says, read once.
  const [opening] = useState(() => fromUrl(parseUrlState(window.location.hash, world.domain.start), world));
  const [view, setView] = useState<View>(opening.view);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(opening.hidden);
  /** Text the timeline is narrowed to, applied from the search box. */
  const [search, setSearch] = useState(opening.search);
  /** Search text of the People and Glossary tabs; not part of a link. */
  const [castQuery, setCastQuery] = useState('');
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [person, setPerson] = useState(opening.person);
  const [thread, setThread] = useState(opening.thread);
  const [lane, setLane] = useState(opening.lane);
  const [selectedId, setSelectedId] = useState(opening.selectedId);
  /** Side-panel pages, oldest first; the last one is showing. */
  const [stack, setStack] = useState(opening.stack);
  const [mapStep, setMapStep] = useState(opening.mapStep);
  const [level, setLevel] = useState<ZoomLevel>('months');
  const [coarsest, setCoarsest] = useState<ZoomLevel>('quarters');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hintVisible, setHintVisible] = useState(true);

  const [editing, setEditing] = useState(startEditing);
  const [threadDraft, setThreadDraft] = useState<ThreadDraft | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  /** Whether the open form holds input that has not been saved. */
  const formTouched = useRef(false);

  const page = stack.length ? stack[stack.length - 1] : null;
  const filter = useMemo<EventFilter>(
    () => ({
      hidden,
      // The search box and this filter share one matcher, so the count it offers is the count shown.
      textMatches: search.trim() ? new Set(searchWorld(world, search, 0).eventIds) : null,
      person,
      // Thread mode shows every card, so any of them can be picked.
      threadEvents: thread && !threadDraft ? new Set(world.threadById.get(thread)?.events) : null,
    }),
    [world, hidden, search, person, thread, threadDraft],
  );
  const visibleEvents = useMemo(() => world.events.filter((ev) => matchesFilter(ev, filter)), [world, filter]);
  /** Events joined by the numbered path: the thread being built, or the one being followed. */
  const threadPath = useMemo(() => {
    if (threadDraft) return [...threadDraft.events].sort((a, b) => (world.eventOrder.get(a) ?? 0) - (world.eventOrder.get(b) ?? 0));
    return thread ? (world.threadById.get(thread)?.events ?? null) : null;
  }, [world, thread, threadDraft]);

  /* ── URL ── */

  /** The timeline view goes into links only once it has moved or came from one. */
  const viewTouched = useRef(opening.zoom != null);
  const urlTimer = useRef(0);
  const writeUrlRef = useRef(() => {});
  /** The hash this workspace last wrote to the address. */
  const writtenHash = useRef('');
  const scheduleUrlWrite = useCallback(() => {
    window.clearTimeout(urlTimer.current);
    urlTimer.current = window.setTimeout(() => writeUrlRef.current(), URL_WRITE_DELAY);
  }, []);
  // A write still pending when the workspace closes would land on the home page's address.
  useEffect(() => () => window.clearTimeout(urlTimer.current), []);

  // Read by callbacks that outlive the render they were made in.
  const worldRef = useRef(world);
  const stackRef = useRef(stack);
  const threadDraftRef = useRef(threadDraft);
  stackRef.current = stack;
  threadDraftRef.current = threadDraft;

  const { refs, engine } = useTimeline(
    { world, filter, laneVisible: lane, threadPath },
    {
      onSelect: (id) => (threadDraftRef.current ? toggleThreadEvent(id) : open({ kind: 'event', id }, 'reset', 'ifNeeded')),
      onSelectLane: (id) => {
        if (!threadDraftRef.current) open({ kind: 'lane', id }, 'reset');
      },
      onPreview: (target) => {
        if (!target) return setPreview(null);
        const event = target.kind === 'event' ? world.eventById.get(target.id) : undefined;
        const item = target.kind === 'lane' ? world.laneById.get(target.id) : undefined;
        setPreview(
          event
            ? { kind: 'event', event, rect: target.rect }
            : item
              ? { kind: 'lane', item, lane: world.lane?.title ?? '', rect: target.rect }
              : null,
        );
      },
      onLevelChange: setLevel,
      onCoarsestLevel: setCoarsest,
      onInteract: () => setHintVisible(false),
      onViewChange: () => {
        viewTouched.current = true;
        scheduleUrlWrite();
      },
    },
  );

  // Latest state for the debounced writer, which runs outside the render that scheduled it.
  useEffect(() => {
    writeUrlRef.current = () => {
      const hash = formatUrlState(
        {
          timeline: origin === 'embedded' ? null : origin === 'account' ? savedId : origin,
          view,
          zoom: viewTouched.current ? (engine.current?.getView() ?? null) : null,
          event: selectedId,
          page: page && page.kind !== 'event' && page.kind !== 'form' ? page : null,
          hidden: [...hidden],
          query: search.trim(),
          person,
          thread,
          lane,
          mapStep: !hasMap || mapStep === lastStep ? null : mapStep,
        },
        world.domain.start,
      );
      writtenHash.current = hash;
      try {
        // The entry's state says how the timeline was reached (see App); keep it.
        window.history.replaceState(window.history.state, '', hash ? `#${hash}` : window.location.pathname + window.location.search);
      } catch {
        // Sandboxed frames may refuse history changes; sharing then falls back to the opening view.
      }
    };
  });

  // Write on every change, the first render included: a link should name its timeline from the start.
  useEffect(() => {
    scheduleUrlWrite();
  }, [origin, savedId, view, hidden, search, person, thread, lane, selectedId, stack, mapStep, scheduleUrlWrite]);

  /* ── Pop-ups ── */

  const ask = useCallback((next: Dialog) => setDialog(next), []);

  /** Run `action` now, or after the reader agrees to lose what an open form holds. */
  const leavingForm = useCallback(
    (action: () => void) => {
      const top = stackRef.current[stackRef.current.length - 1];
      if (top?.kind !== 'form' || !formTouched.current) return action();
      ask({
        type: 'confirm',
        title: 'Discard your changes?',
        message: 'The form has changes that are not saved yet.',
        confirm: 'Discard changes',
        danger: true,
        onConfirm: () => {
          formTouched.current = false;
          action();
        },
      });
    },
    [ask],
  );

  /* ── Navigation ── */

  /** Point the engine, and the main view, at whatever a page is about. */
  const focus = useCallback(
    (target: PanelPage | null, reveal: Reveal) => {
      if (target?.kind === 'event') {
        setSelectedId(target.id);
        engine.current?.setSelected(target.id, reveal);
      }
      engine.current?.setSelectedLane(target?.kind === 'lane' ? target.id : null);
      if (target?.kind === 'company') setView('map');
      else if (target?.kind === 'event' || target?.kind === 'lane') setView('timeline');
    },
    [engine],
  );

  /** Show a page in the side panel. Replacing a form that holds unsaved input asks first. */
  const open = useCallback(
    (target: PanelPage, mode: OpenMode = 'push', reveal: Reveal = 'center') => {
      const go = () => {
        formTouched.current = false;
        setStack((current) => {
          if (mode === 'reset') return [target];
          if (mode === 'replace') return [...current.slice(0, -1), target];
          return [...current, target];
        });
        // Starting afresh on something that is not an event leaves no event selected.
        if (mode === 'reset' && target.kind !== 'event' && target.kind !== 'form') {
          setSelectedId(null);
          engine.current?.setSelected(null);
        }
        focus(target, reveal);
      };
      leavingForm(go);
    },
    [engine, focus, leavingForm],
  );

  const close = useCallback(() => {
    leavingForm(() => {
      setStack([]);
      setSelectedId(null);
      engine.current?.setSelected(null);
      engine.current?.setSelectedLane(null);
    });
  }, [engine, leavingForm]);

  const back = useCallback(() => {
    if (stack.length < 2) return close();
    leavingForm(() => {
      const rest = stack.slice(0, -1);
      setStack(rest);
      focus(rest[rest.length - 1], 'ifNeeded');
    });
  }, [stack, close, focus, leavingForm]);

  /** Switch the main view. A panel page that belongs to another view is closed; people and glossary terms fit any view. */
  const switchView = useCallback(
    (next: View) => {
      if (page?.kind === 'form') {
        // A form does not survive the change of layout between tabs, so it is closed (after asking, if it holds input).
        return leavingForm(() => {
          setStack((current) => current.filter((p) => p.kind !== 'form'));
          setView(next);
        });
      }
      setView(next);
      if (!page || page.kind === 'person' || page.kind === 'term') return;
      const home: View = page.kind === 'company' ? 'map' : 'timeline';
      if (home !== next) close();
    },
    [page, close, leavingForm],
  );

  /** Move the selection to the previous or next visible event. */
  const step = useCallback(
    (direction: -1 | 1) => {
      if (!visibleEvents.length) return;
      const index = visibleEvents.findIndex((ev) => ev.id === selectedId);
      const next = index < 0 ? 0 : Math.max(0, Math.min(visibleEvents.length - 1, index + direction));
      open({ kind: 'event', id: visibleEvents[next].id }, 'replace');
    },
    [visibleEvents, selectedId, open],
  );

  /* ── Filters ── */

  const toggleCategory = useCallback((id: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  /** Narrow the timeline to a thread and frame its events; null shows everything again. */
  const filterThread = useCallback(
    (id: string | null) => {
      setThread(id);
      const found = id ? world.threadById.get(id) : undefined;
      if (found) {
        setView('timeline');
        engine.current?.fitEvents(found.events);
      }
    },
    [engine, world],
  );

  /** Narrow the timeline to one person's events and frame them; null shows everything again. */
  const filterPerson = useCallback(
    (name: string | null) => {
      setPerson(name);
      if (name) {
        setView('timeline');
        engine.current?.fitEvents(world.eventsOf(name).map((ev) => ev.id));
      }
    },
    [engine, world],
  );

  /** Narrow the timeline to the events matching a text and frame them; empty shows everything again. */
  const filterText = useCallback(
    (query: string) => {
      setSearch(query);
      if (!query) return;
      setView('timeline');
      const textMatches = new Set(searchWorld(world, query, 0).eventIds);
      const matching = world.events.filter((ev) => matchesFilter(ev, { ...filter, textMatches }));
      engine.current?.fitEvents(matching.map((ev) => ev.id));
    },
    [engine, world, filter],
  );

  /** Open a search result. A fresh search starts a fresh panel. */
  const pick = useCallback((target: ViewPage) => open(target, 'reset'), [open]);

  /* ── Reading progress ── */

  const changeProgress = useCallback(
    (part: number) => {
      // The last part is "everything": stored as no limit, so parts added later are not hidden by it.
      const limit = part >= doc.parts.length ? null : part;
      setProgress(limit);
      saveProgress(doc.title, limit);
    },
    [doc.title, doc.parts.length],
  );

  /** A page to open once the engine has the world that contains it: something just saved. */
  const pendingOpen = useRef<{ page: PanelPage; mode: OpenMode } | null>(null);

  // A new world (an edit, undo, or a change of progress) can leave state pointing at things that
  // are gone or hidden: drop it. Then open whatever the change asked for.
  useEffect(() => {
    const before = worldRef.current;
    worldRef.current = world;
    const kept = stack.filter((p) => pageExists(p, world));
    if (kept.length !== stack.length) setStack(kept);
    if (selectedId && !world.eventById.has(selectedId)) {
      setSelectedId(null);
      engine.current?.setSelected(null);
    }
    if (page?.kind === 'lane' && !world.laneById.has(page.id)) engine.current?.setSelectedLane(null);
    if (person && !world.personByName.has(person)) setPerson(null);
    if (thread && !world.threadById.has(thread)) setThread(null);
    if (view === 'map' && !hasMap) setView('timeline');
    if (hasMap) {
      // The map stays at its latest step when that step moves, and never runs past it.
      const previousLast = hasCorporateMap(before.doc) ? corporateOf(before).lastStep : lastStep;
      if (mapStep > lastStep || mapStep === previousLast) setMapStep(lastStep);
    }
    if (pendingOpen.current) {
      const { page: target, mode } = pendingOpen.current;
      pendingOpen.current = null;
      open(target, mode);
    }
    // Only a new world needs this; the rest is read as it stands at that moment.
  }, [world]);

  useEffect(() => {
    document.title = doc.title;
  }, [doc]);

  /* ── Editing ── */

  /** Switch editing on, then run `then`. */
  const withEditing = useCallback((then: () => void) => {
    setEditing(true);
    then();
  }, []);

  const toggleEditing = useCallback(
    (on: boolean) => {
      if (on) return withEditing(() => {});
      leavingForm(() => {
        setEditing(false);
        setThreadDraft(null);
        setStack((current) => current.filter((p) => p.kind !== 'form'));
      });
    },
    [withEditing, leavingForm],
  );

  /** Open a form in the side panel. */
  const edit = useCallback(
    (form: FormTarget) => withEditing(() => open({ kind: 'form', form }, form.type === 'settings' ? 'reset' : 'push')),
    [withEditing, open],
  );

  /** Add whatever the current tab holds: an event, a person or a term. */
  const addHere = useCallback(() => {
    if (threadDraftRef.current) return;
    edit(view === 'cast' ? { type: 'person' } : view === 'glossary' ? { type: 'term' } : { type: 'event' });
  }, [edit, view]);

  const form = useMemo<FormProps>(
    () => ({
      onCommit: (next, then) => {
        setDoc(next);
        if (then === undefined) return; // a quick add: the form stays open
        formTouched.current = false;
        if (then === null) {
          setStack((current) => current.slice(0, -1));
        } else {
          // The saved thing takes the form's place, once the engine knows about it.
          pendingOpen.current = { page: then, mode: 'replace' };
        }
      },
      onCancel: () => leavingForm(() => setStack((current) => current.slice(0, -1))),
      onTouch: () => {
        formTouched.current = true;
      },
      ask,
    }),
    [setDoc, leavingForm, ask],
  );

  /* ── Thread mode ── */

  /** Start picking a thread's events on the timeline: a new thread, or an existing one to change. */
  const startThreadMode = useCallback(
    (existing?: ThreadDoc) =>
      withEditing(() =>
        leavingForm(() => {
          setThreadDraft({ id: existing?.id ?? null, name: existing?.name ?? '', summary: existing?.summary ?? '', events: existing?.events ?? [] });
          setStack([]);
          setSelectedId(null);
          engine.current?.setSelected(null);
          engine.current?.setSelectedLane(null);
          setView('timeline');
          setHintVisible(false);
        }),
      ),
    [withEditing, leavingForm, engine],
  );

  function toggleThreadEvent(id: string) {
    setThreadDraft((current) =>
      current && { ...current, events: current.events.includes(id) ? current.events.filter((other) => other !== id) : [...current.events, id] },
    );
  }

  /** Ask for the thread's name, then store it. */
  const saveThreadDraft = useCallback(() => {
    const draft = threadDraftRef.current;
    if (!draft?.events.length) return;
    ask({
      type: 'thread',
      name: draft.name,
      summary: draft.summary,
      count: draft.events.length,
      onDone: (name, summary) => {
        const id = draft.id ?? newId(name, doc.threads);
        setDoc(saveThread(doc, { id, name, events: draft.events, ...(summary ? { summary } : {}) }));
        setThreadDraft(null);
        pendingOpen.current = { page: { kind: 'thread', id }, mode: 'reset' };
      },
    });
  }, [ask, doc, setDoc]);

  /* ── Glossary ── */

  const termActions = useMemo<TermActions>(
    () => ({
      preview: (id, rect) => {
        const term = id ? worldRef.current.termById.get(id) : undefined;
        setPreview(term && rect ? { kind: 'term', term, rect } : null);
      },
      open: (id) => open({ kind: 'term', id }),
    }),
    [open],
  );

  /* ── Links and export ── */

  /** Apply a parsed link to the workspace and the engine. */
  const applyUrl = useCallback(
    (state: ReturnType<typeof fromUrl>) => {
      setView(state.view);
      setHidden(state.hidden);
      setSearch(state.search);
      setPerson(state.person);
      setThread(state.thread);
      setLane(state.lane);
      setSelectedId(state.selectedId);
      setStack(state.stack);
      setMapStep(state.mapStep);

      const top = state.stack.length ? state.stack[state.stack.length - 1] : null;
      if (state.zoom) {
        viewTouched.current = true;
        engine.current?.setView(state.zoom);
      }
      // A link that carries its own view is restored as it was; otherwise centre on the selection.
      engine.current?.setSelected(state.selectedId, state.zoom ? 'ifNeeded' : 'center');
      engine.current?.setSelectedLane(top?.kind === 'lane' ? top.id : null);
    },
    [engine],
  );

  // Open the link the page was loaded with, and follow later edits to the hash.
  useEffect(() => {
    applyUrl(opening);
    const onHashChange = () => {
      if (!window.location.hash) return; // the shell is leaving for the home page
      // Back at the address this workspace wrote itself (a Back press that was called off): nothing to follow.
      if (window.location.hash.slice(1) === writtenHash.current) return;
      applyUrl(fromUrl(parseUrlState(window.location.hash, worldRef.current.domain.start), worldRef.current));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applyUrl, opening]);

  const copyLink = useCallback(async () => {
    window.clearTimeout(urlTimer.current);
    writeUrlRef.current();
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch {
      return false;
    }
  }, []);

  const saveHtml = useCallback(() => {
    exportHtml(doc).catch((error: unknown) => {
      ask({
        type: 'message',
        title: 'This page cannot be exported as HTML',
        lines: [error instanceof DocError ? error.message : 'Something went wrong while packing the page. Export as data (.json) instead.'],
      });
    });
  }, [doc, ask]);

  /* ── Saving ── */

  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  /** Signing in from here: what to do once someone is. */
  const [signIn, setSignIn] = useState<{ then(): void } | null>(null);
  const signedIn = useRef(false);

  /** Send the timeline to the account, naming it first if it has never been saved; then run `after`. */
  const upload = useCallback(
    (after?: () => void) => {
      if (sending.current) return;
      const send = (next: TimelineDoc) => {
        sending.current = true;
        setBusy(true);
        saveTimeline(next, savedId)
          .then((saved) => {
            setSavedDoc(next);
            if (!savedId) onSaved(saved.id);
            after?.();
          })
          .catch((error: unknown) => {
            if (error instanceof SignedOut) onAccount(null);
            ask({
              type: 'message',
              title: 'Not saved',
              lines: [error instanceof AccountError ? error.message : 'Something went wrong while saving. Try again.'],
            });
          })
          .finally(() => {
            sending.current = false;
            setBusy(false);
          });
      };
      if (savedId) return send(doc);
      // The name goes into the timeline itself, so the list, the title and exports agree.
      ask({
        type: 'name',
        title: 'Save to your account',
        label: 'Name',
        name: doc.title,
        confirm: 'Save',
        onDone: (name) => {
          const next = name === doc.title ? doc : { ...doc, title: name };
          setDoc(next);
          send(next);
        },
      });
    },
    [doc, savedId, setDoc, onSaved, onAccount, ask],
  );

  /** Save, signing in first if no one is. */
  const save = useCallback(
    (after?: () => void) => {
      if (account === 'offline') return;
      if (account) return upload(after);
      signedIn.current = false;
      setSignIn({ then: () => upload(after) });
    },
    [account, upload],
  );

  /** Set once the reader has chosen to go, so the Back button does not ask again on the way out. */
  const leaving = useRef(false);
  const leave = useCallback(
    () =>
      leavingForm(() => {
        const go = () => {
          leaving.current = true;
          onHome();
        };
        if (!dirty) return go();
        const download = {
          label: 'Download a copy',
          run: () => {
            exportJson(doc);
            go();
          },
        };
        const lose = { label: 'Leave without saving', danger: true, run: go };
        if (account && account !== 'offline') {
          return ask({
            type: 'choice',
            title: 'Save your changes?',
            message: 'This timeline has changes that are not saved to your account. Leaving now loses them.',
            choices: [{ label: 'Save and leave', run: () => save(go) }, lose],
          });
        }
        ask({
          type: 'choice',
          title: 'Your changes will be lost',
          message:
            account === 'offline'
              ? 'Nothing is kept in this browser. Download a copy to import it again later.'
              : 'Nothing is kept in this browser. Sign in to save it to your account, or download a copy to import later.',
          choices: account === 'offline' ? [download, lose] : [{ label: 'Sign in to save', run: () => save(go) }, download, lose],
        });
      }),
    [leavingForm, onHome, dirty, doc, account, ask, save],
  );
  useEffect(() => {
    leaveGuard.current = () => {
      if (leaving.current) return false;
      const top = stackRef.current[stackRef.current.length - 1];
      if (!dirty && (top?.kind !== 'form' || !formTouched.current)) return false;
      leave();
      return true;
    };
    return () => {
      leaveGuard.current = null;
    };
  }, [leaveGuard, leave, dirty]);

  // Closing or reloading the tab can only get the browser's own warning; its text cannot be changed.
  // Listening only while there is something to lose keeps the page eligible for the back-forward cache.
  useEffect(() => {
    if (!dirty) return;
    const warn = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /* ── Keyboard ── */

  // Arrows step through events while one is open, step the map in map view, and otherwise pan.
  // Keys typed into a field belong to that field, apart from the shortcuts that use Ctrl.
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      const command = ev.ctrlKey || ev.metaKey;
      // Ctrl+S saves to the account, wherever the focus is. Without an account server it stays the browser's.
      if (command && ev.key.toLowerCase() === 's' && account !== 'offline') {
        ev.preventDefault();
        return dialog || signIn ? undefined : save();
      }
      if (command && ev.key === 'Insert') {
        ev.preventDefault();
        return dialog ? undefined : addHere();
      }
      // Ctrl+> is Ctrl+Shift+. on most keyboards; either spelling of the key counts.
      if (command && (ev.key === '>' || ev.key === '.') && !dialog) {
        ev.preventDefault();
        if (threadDraft) return threadDraft.events.length ? saveThreadDraft() : setThreadDraft(null);
        return startThreadMode();
      }
      // Ctrl+Enter saves the form in the side panel, wherever the focus is. A pop-up handles its own.
      if (command && ev.key === 'Enter' && page?.kind === 'form' && !dialog) {
        ev.preventDefault();
        return document.querySelector<HTMLFormElement>('#panel form')?.requestSubmit();
      }
      const typing = ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target instanceof HTMLSelectElement;
      if (typing) {
        if (ev.key === 'Escape' && ev.target instanceof HTMLInputElement && ev.target.type === 'search' && ev.target.id !== 'search') {
          setCastQuery('');
          setGlossaryQuery('');
          ev.target.blur();
        }
        return;
      }
      if (dialog) return;
      if (command && ev.key.toLowerCase() === 'z' && editing) {
        ev.preventDefault();
        return ev.shiftKey ? redo() : undo();
      }
      if (command && ev.key.toLowerCase() === 'y' && editing) {
        ev.preventDefault();
        return redo();
      }
      if (command || ev.altKey) return;
      switch (ev.key) {
        case 'Escape':
          if (threadDraft) setThreadDraft(null);
          else if (page) close();
          break;
        case 'Enter':
          if (threadDraft) saveThreadDraft();
          break;
        case 'ArrowRight':
        case 'ArrowLeft': {
          const direction = ev.key === 'ArrowRight' ? 1 : -1;
          if (view === 'map') {
            ev.preventDefault();
            setMapStep((current) => Math.max(0, Math.min(lastStep, current + direction)));
          } else if (view === 'timeline' && page?.kind === 'event') {
            ev.preventDefault();
            step(direction);
          } else if (view === 'timeline') {
            engine.current?.panBy(-direction * 120);
          }
          break;
        }
        case '+':
        case '=':
          if (view === 'timeline') engine.current?.zoomBy(1.5);
          break;
        case '-':
        case '_':
          if (view === 'timeline') engine.current?.zoomBy(1 / 1.5);
          break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [engine, account, save, signIn, addHere, close, dialog, editing, lastStep, page, redo, saveThreadDraft, startThreadMode, step, threadDraft, undo, view]);

  const position = page?.kind === 'event' ? visibleEvents.findIndex((ev) => ev.id === page.id) + 1 : 0;
  const dismissHint = () => setHintVisible(false);
  const views: View[] = ['timeline', 'cast', 'glossary', ...(hasMap ? (['map'] as const) : [])];
  const floating = view === 'cast' || view === 'glossary';
  /** One line next to the title on where the timeline is kept. None for the demo or an exported page as opened. */
  const status =
    account === 'offline'
      ? null
      : origin === 'account' && !dirty
        ? 'Saved to your account'
        : !dirty && origin !== 'new'
          ? null
          : !account
            ? 'Sign in to save'
            : dirty
              ? 'Unsaved changes (Kept temporarily in this browser)'
              : 'Not saved yet';

  return (
    <WorldContext.Provider value={world}>
      <div className={editing ? 'app is-editing' : 'app'}>
        <Toolbar
          view={view}
          views={views}
          onView={switchView}
          onHome={leave}
          onPick={pick}
          onFilterText={filterText}
          progress={world.max}
          onProgress={changeProgress}
          level={level}
          levels={levelsFrom(coarsest)}
          onLevel={(l) => {
            dismissHint();
            engine.current?.setLevel(l);
          }}
          onZoom={(factor) => {
            dismissHint();
            engine.current?.zoomBy(factor);
          }}
          editing={editing}
          onEditing={toggleEditing}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onCopyLink={copyLink}
          onExportHtml={saveHtml}
          onExportJson={() => exportJson(doc)}
          onExportText={() => exportText(doc)}
          status={status}
          onSave={account === 'offline' ? null : () => save()}
          canSave={!busy && (dirty || origin !== 'account')}
        />

        {threadDraft ? (
          <ThreadBar
            count={threadDraft.events.length}
            name={threadDraft.name}
            onUndo={() => setThreadDraft({ ...threadDraft, events: threadDraft.events.slice(0, -1) })}
            onCancel={() => setThreadDraft(null)}
            onSave={saveThreadDraft}
          />
        ) : view === 'timeline' ? (
          <FilterRail
            hidden={hidden}
            onToggle={toggleCategory}
            onJump={(target) => {
              dismissHint();
              engine.current?.jumpTo(target);
            }}
            thread={thread}
            onThread={(id) => {
              filterThread(id);
              if (id) open({ kind: 'thread', id }, 'reset');
            }}
            person={person}
            onPerson={(name) => {
              filterPerson(name);
              if (name) open({ kind: 'person', name }, 'reset');
            }}
            query={search.trim()}
            onClearQuery={() => setSearch('')}
            lane={lane}
            onLane={setLane}
            visibleCount={visibleEvents.length}
            editing={editing}
            onAddEvent={() => edit({ type: 'event' })}
            onThreadMode={() => startThreadMode()}
            onAddLaneItem={() => edit({ type: 'laneItem' })}
            onSettings={() => edit({ type: 'settings' })}
          />
        ) : view === 'map' ? (
          <MapControls step={mapStep} onStep={setMapStep} onOpenEvent={(id) => open({ kind: 'event', id }, 'reset')} />
        ) : view === 'cast' ? (
          <CastRail query={castQuery} onQuery={setCastQuery} editing={editing} onAdd={() => edit({ type: 'person' })} />
        ) : (
          <GlossaryRail query={glossaryQuery} onQuery={setGlossaryQuery} editing={editing} onAdd={() => edit({ type: 'term' })} />
        )}

        {/* Beside the people and glossary lists the panel floats over them, so their grids never re-wrap while it slides. */}
        <div className={floating ? 'main float' : 'main'}>
          {/* The engine owns everything it adds inside the stage: cards, badges, lane entries, and state classes on the stage. */}
          <section
            id="stage"
            className={threadDraft ? 'stage picking' : 'stage'}
            ref={refs.stage}
            aria-label="Timeline"
            hidden={view !== 'timeline'}
          >
            <canvas ref={refs.axisCanvas} aria-hidden="true" />
            <div className="lane" ref={refs.lane} role="group" aria-label={world.lane?.title ?? 'Second lane'}>
              <span className="lane-cap" aria-hidden="true">
                {world.lane?.title}
              </span>
            </div>
            {/* Card viewport: clips the cards to the area below the axis header and the lane. */}
            <div className="cards">
              <div className="world" ref={refs.world} />
              <canvas className="links" ref={refs.linkCanvas} aria-hidden="true" />
            </div>
            {visibleEvents.length === 0 && (
              <div className="empty" id="empty">
                {world.events.length ? (
                  'No events match. Clear the text, the thread or the person, or turn a category back on.'
                ) : (
                  <>
                    This timeline has no events yet.
                    {editing ? (
                      <button type="button" className="textbtn primary" onClick={() => edit({ type: 'event' })}>
                        Add the first event
                      </button>
                    ) : (
                      ' Switch on Edit to add them.'
                    )}
                  </>
                )}
              </div>
            )}
            <div className={`hint${hintVisible && world.events.length ? '' : ' gone'}`}>Scroll to zoom · drag to pan · click a card for detail</div>
          </section>

          {view === 'map' && hasMap && (
            <CorporateMap
              step={mapStep}
              selectedId={page?.kind === 'company' ? page.id : null}
              onSelect={(id) => open({ kind: 'company', id }, page?.kind === 'company' ? 'replace' : 'reset')}
            />
          )}

          {view === 'cast' && (
            <CharacterList
              query={castQuery}
              selected={page?.kind === 'person' ? page.name : null}
              onSelect={(name) => open({ kind: 'person', name }, 'reset')}
              editing={editing}
              onAdd={() => edit({ type: 'person' })}
            />
          )}

          {view === 'glossary' && (
            <GlossaryList
              query={glossaryQuery}
              selected={page?.kind === 'term' ? page.id : null}
              onSelect={(id) => open({ kind: 'term', id }, 'reset')}
              editing={editing}
              onAdd={() => edit({ type: 'term' })}
            />
          )}

          {/* Glossary terms are live only inside the panel; elsewhere text stays plain. */}
          <TermContext.Provider value={termActions}>
            {/* Keyed by how it is laid out: a fresh element takes its place at once, where a kept one would animate from the other layout's width. */}
            <DetailPanel
              key={floating ? 'float' : 'push'}
              page={page}
              canGoBack={stack.length > 1}
              position={position}
              total={visibleEvents.length}
              person={person}
              thread={thread}
              mapStep={mapStep}
              editing={editing}
              onBack={back}
              onClose={close}
              onStep={step}
              onOpen={open}
              onFilterPerson={filterPerson}
              onFilterThread={filterThread}
              form={form}
              onPickThread={(picked) => {
                // The form's input travels with the thread, so there is nothing to lose by leaving it.
                formTouched.current = false;
                startThreadMode(picked);
              }}
            />
          </TermContext.Provider>
        </div>

        <div
          id="mini"
          className="mini"
          ref={refs.overview}
          aria-label="Overview of the whole timeline. Drag to move."
          hidden={view !== 'timeline'}
        >
          <canvas ref={refs.overviewCanvas} aria-hidden="true" />
        </div>
      </div>

      <HoverPreview preview={preview} />
      <DialogHost dialog={dialog} onClose={() => setDialog(null)} />
      {signIn && (
        <AccountDialog
          onSignedIn={(who) => {
            signedIn.current = true;
            onAccount(who);
          }}
          // Closes after a sign-in, or after the recovery code of a new account has been saved.
          onClose={() => {
            setSignIn(null);
            if (signedIn.current) signIn.then();
          }}
        />
      )}
    </WorldContext.Provider>
  );
}
