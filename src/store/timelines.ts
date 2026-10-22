import { parseJson } from '../model/parse';
import type { TimelineDoc } from '../model/schema';
import { AccountError, problemOf } from './account';

/**
 * Timelines saved to the signed-in account, kept by the server in server/ (Timelines.cs).
 * Only the owner's cookie opens them; nothing is kept in this browser.
 */

/** A row of the "My timelines" list. */
export interface SavedTimeline {
  id: string;
  title: string;
  /** Bytes of the stored JSON. */
  size: number;
  updatedAt: string;
}

/** The session is over (or never was): the server answered 401. */
export class SignedOut extends AccountError {}

async function call(method: string, path: string, body?: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`/api/timelines${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body });
  } catch {
    throw new AccountError('The account server cannot be reached.');
  }
  if (res.status === 401) throw new SignedOut('You are signed out. Sign in again to save.');
  if (!res.ok) throw new AccountError(await problemOf(res));
  return res;
}

export const listTimelines = async () => (await (await call('GET', '/')).json()) as SavedTimeline[];

/** A saved timeline, through the loader like any other that comes in. */
export const loadTimeline = async (id: string) => parseJson(await (await call('GET', `/${id}`)).text()).doc;

/** Save `doc`: as a new timeline without an id, over the saved one with it. */
export const saveTimeline = async (doc: TimelineDoc, id: string | null) =>
  (await (await call(id ? 'PUT' : 'POST', id ? `/${id}` : '/', JSON.stringify(doc))).json()) as SavedTimeline;

export const renameTimeline = async (id: string, title: string) =>
  (await (await call('PATCH', `/${id}`, JSON.stringify({ title }))).json()) as SavedTimeline;

export const deleteTimeline = async (id: string) => void (await call('DELETE', `/${id}`));

/** Store the list's order: every id, top first. */
export const reorderTimelines = async (ids: string[]) => void (await call('PUT', '/order', JSON.stringify(ids)));
