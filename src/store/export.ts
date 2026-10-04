import { DocError, parseJson, slug, type ParseResult } from '../model/parse';
import type { TimelineDoc } from '../model/schema';

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

/** Text safe to place inside a <script> element: nothing in it can close the element early. */
const scriptSafe = (text: string) => text.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

/** Fetch a same-origin file's text; null if it cannot be read (as on file:// pages). */
async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/**
 * Build a standalone copy of this page with `doc` embedded.
 *
 * A production build is already one file, so its scripts and styles are copied as they stand;
 * any that are separate files are fetched and inlined. Throws DocError when that is impossible:
 * the development server serves the app as loose modules, which cannot be packed here.
 */
export async function buildHtml(doc: TimelineDoc): Promise<string> {
  if (import.meta.env.DEV) {
    throw new DocError('Exporting to HTML needs the built app. Run “npm run build” and open dist/index.html, or export JSON for now.');
  }
  const page = document.documentElement.cloneNode(true) as HTMLElement;
  // The copy starts clean: no rendered app, no earlier timeline, no state left by this session.
  page.querySelector('#root')?.replaceChildren();
  page.querySelector(`#${EMBED_ID}`)?.remove();
  page.removeAttribute('style');
  page.querySelector('body')?.removeAttribute('style');
  page.querySelector('title')!.textContent = doc.title;

  for (const script of page.querySelectorAll<HTMLScriptElement>('script[src]')) {
    const source = await fetchText(script.src);
    if (source == null) throw new DocError('This page’s scripts could not be read, so it cannot be exported as one file. Export JSON instead.');
    const inline = document.createElement('script');
    if (script.type) inline.type = script.type;
    inline.textContent = scriptSafe(source);
    script.replaceWith(inline);
  }
  for (const link of page.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
    // Fonts from another site stay as links; the page falls back to system fonts offline.
    if (new URL(link.href).origin !== window.location.origin) continue;
    const source = await fetchText(link.href);
    if (source == null) continue;
    const style = document.createElement('style');
    style.textContent = source;
    link.replaceWith(style);
  }

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
