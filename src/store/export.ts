import { DocError, parseJson, slug, type ParseResult } from '../model/parse';
import type { TimelineDoc } from '../model/schema';
import { isEmbedded } from './images';

/**
 * Getting a timeline out of the app and back in, without a server.
 *
 * JSON is the working format. The HTML export is this very page with the timeline embedded in
 * it: one file that opens straight onto the timeline, anywhere, offline.
 */

/** Id of the element that carries an embedded timeline. */
const EMBED_ID = 'timeline-data';

/** The timeline embedded in this page, if it is an exported one. */
export function readEmbedded(): ParseResult | null {
  const element = document.getElementById(EMBED_ID);
  if (!element?.textContent) return null;
  try {
    return parseJson(element.textContent);
  } catch {
    return null;
  }
}

/** Hand the browser a file to save. */
function download(name: string, type: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the download a moment to start before the URL is released.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const fileNameOf = (doc: TimelineDoc, extension: string) => `${slug(doc.title)}.${extension}`;

export function exportJson(doc: TimelineDoc): void {
  download(fileNameOf(doc, 'json'), 'application/json', JSON.stringify(doc, null, 2));
}

/** The document without the pictures stored in it. Linked pictures stay: they are only an address. */
export function withoutPictures(doc: TimelineDoc): TimelineDoc {
  return {
    ...doc,
    events: doc.events.map((ev) => {
      if (!isEmbedded(ev.image)) return ev;
      const { image: _image, ...rest } = ev;
      return rest;
    }),
    people: doc.people.map((person) => {
      if (!isEmbedded(person.image)) return person;
      const { image: _image, imageCredit: _credit, ...rest } = person;
      return rest;
    }),
  };
}

/** Export the text of the timeline only: a file small enough to hand to an AI model. */
export function exportText(doc: TimelineDoc): void {
  download(`${slug(doc.title)}-text.json`, 'application/json', JSON.stringify(withoutPictures(doc), null, 2));
}

/** What a timeline weighs as a file, in bytes. */
export interface Weight {
  /** The document as JSON. */
  data: number;
  /** The same without its stored pictures. */
  text: number;
  /** Pictures stored in the document. */
  pictures: number;
  /** An exported page; null where the size of the app itself is not known (it is not one file here). */
  page: number | null;
}

const byteLength = (text: string) => new Blob([text]).size;

export function weightOf(doc: TimelineDoc): Weight {
  const pictures = [...doc.events, ...doc.people].filter((entry) => isEmbedded(entry.image)).length;
  const data = byteLength(JSON.stringify(doc));
  const text = pictures ? byteLength(JSON.stringify(withoutPictures(doc))) : data;
  // A single-file build carries the app in the page; its length is the rest of an exported page.
  const packed = !import.meta.env.DEV && !document.querySelector('script[src]:not([src^="http"])');
  let app = 0;
  if (packed) for (const part of document.querySelectorAll('script:not([src]):not([type="application/json"]), style')) app += part.textContent?.length ?? 0;
  return { data, text, pictures, page: app > 100_000 ? data + app : null };
}

/** A size for people: "850 KB", "12.7 MB". */
export function formatSize(bytes: number): string {
  return bytes < 1_048_576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/** Text safe to place inside a <script> element: nothing in it can close the element early. */
const scriptSafe = (text: string) => text.replace(/<\/(script)/gi, '<\\/$1').replace(/<(!--)/g, '\\x3C$1');

/** Name the page carries in its head (index.html); tells this app's page from anything else a server may answer with. */
const APP_NAME = 'Timeline Event Map';

const isThisApp = (page: ParentNode) =>
  page.querySelector('#root') !== null && page.querySelector('meta[name="application-name"]')?.getAttribute('content') === APP_NAME;

/** Fetch a file's text; null if it cannot be read (as on file:// pages). */
async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/**
 * This page as the server sent it, parsed afresh. Unlike the live document it holds nothing a
 * browser extension or this session added. Null where the source cannot be read again, as on
 * a page opened from disk.
 */
async function servedPage(): Promise<HTMLElement | null> {
  if (!/^https?:$/.test(window.location.protocol)) return null;
  const source = await fetchText(window.location.href.split('#')[0]!);
  if (source == null) return null;
  const page = new DOMParser().parseFromString(source, 'text/html').documentElement;
  return isThisApp(page) ? page : null;
}

/** The live document, copied and emptied of what this session rendered into it. */
function livePage(): HTMLElement {
  const page = document.documentElement.cloneNode(true) as HTMLElement;
  page.querySelector('#root')?.replaceChildren();
  page.removeAttribute('style');
  page.querySelector('body')?.removeAttribute('style');
  return page;
}

const UNPACKABLE = 'This page’s scripts could not be read, so it cannot be exported as one file. Export as data (.json) instead.';

/**
 * Build a standalone copy of this page with `doc` embedded.
 *
 * The copy is made from the page's own source where that can be fetched (a hosted site), and
 * from the live document otherwise (a page opened from disk). A single-file build is copied as
 * it stands; scripts and styles kept in separate files are fetched and inlined. Throws DocError
 * when the page cannot be packed: the development server serves the app as loose modules.
 */
export async function buildHtml(doc: TimelineDoc): Promise<string> {
  if (import.meta.env.DEV) {
    throw new DocError(
      'The development server cannot pack the app into one file. Run “npm run build”, then “npm run preview”, and export from there. Export as data (.json) works here.',
    );
  }
  const page = (await servedPage()) ?? livePage();
  const here = window.location.href;
  page.querySelector(`#${EMBED_ID}`)?.remove();
  page.querySelector('title')!.textContent = doc.title;

  for (const script of page.querySelectorAll('script[src]')) {
    const url = new URL(script.getAttribute('src') || 'about:blank', here);
    // The app loads no script from elsewhere: such an element was added by the host or an extension.
    if (url.origin !== window.location.origin) {
      script.remove();
      continue;
    }
    const source = await fetchText(url.href);
    if (source == null) throw new DocError(UNPACKABLE);
    const inline = document.createElement('script');
    const type = script.getAttribute('type');
    if (type) inline.type = type;
    inline.textContent = scriptSafe(source);
    script.replaceWith(inline);
  }
  for (const link of page.querySelectorAll('link[rel="stylesheet"], link[rel="modulepreload"]')) {
    const url = new URL(link.getAttribute('href') || 'about:blank', here);
    // Fonts from another site stay as links; the page falls back to system fonts offline.
    if (url.origin !== window.location.origin) continue;
    if (link.getAttribute('rel') === 'modulepreload') {
      link.remove();
      continue;
    }
    const source = await fetchText(url.href);
    if (source == null) continue;
    const style = document.createElement('style');
    style.textContent = source;
    link.replaceWith(style);
  }
  // Without the app's code the file would open blank.
  const runnable = [...page.querySelectorAll('script:not([src])')].some((script) => script.getAttribute('type') !== 'application/json' && script.textContent);
  if (!runnable) throw new DocError(UNPACKABLE);

  const data = document.createElement('script');
  data.id = EMBED_ID;
  data.type = 'application/json';
  // Escaped so that no text in the timeline can end the element.
  data.textContent = JSON.stringify(doc).replace(/</g, '\\u003c');
  page.querySelector('head')!.appendChild(data);

  return `<!doctype html>\n${page.outerHTML}`;
}

/** Export the timeline as one HTML file. Throws DocError with a message for the user when it cannot. */
export async function exportHtml(doc: TimelineDoc): Promise<void> {
  download(fileNameOf(doc, 'html'), 'text/html', await buildHtml(doc));
}

/** Read a file the user picked or dropped as a timeline. Throws DocError with a readable message. */
export async function readFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  // An exported page can be imported back: its timeline is in the embedded element.
  if (/^\s*<!doctype html|^\s*<html/i.test(text)) {
    const embedded = new DOMParser().parseFromString(text, 'text/html').getElementById(EMBED_ID)?.textContent;
    if (!embedded) throw new DocError('This HTML file has no timeline in it. Import a file exported from this app, or a JSON file.');
    return parseJson(embedded);
  }
  return parseJson(text);
}
