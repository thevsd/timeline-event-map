import { parseDoc } from '../model/parse';
import type { TimelineDoc } from '../model/schema';

/**
 * The draft: the timeline being edited, kept in this browser so a reload does not lose it.
 *
 * It lives in IndexedDB because a timeline with pictures outgrows localStorage. Storage can be
 * missing or refused (private windows, some file:// pages); every call then resolves quietly
 * and the draft simply lasts for the visit.
 */

const DATABASE = 'timeline-event-map';
const STORE = 'drafts';
const KEY = 'current';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Run one request against the draft store. */
async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(database.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

/** The saved draft, or null if there is none or storage is unavailable. */
export async function loadDraft(): Promise<TimelineDoc | null> {
  try {
    const saved: unknown = await run('readonly', (store) => store.get(KEY));
    // Through the loader, so a draft saved by an older version is brought up to date.
    return saved ? parseDoc(saved).doc : null;
  } catch {
    return null;
  }
}

/** Save the draft. Resolves to whether it was stored. */
export async function saveDraft(doc: TimelineDoc): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.put(doc, KEY));
    return true;
  } catch {
    return false;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(KEY));
  } catch {
    // Nothing to clear, or nowhere to clear it from.
  }
}
