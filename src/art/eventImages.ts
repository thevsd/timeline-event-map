/**
 * Optional real images for events.
 *
 * Put a file named after an event id in src/assets/events/ (for example `kaitaku.webp`) and it
 * replaces that event's pictogram on its card, hover preview and detail page. Events without a
 * file keep the pictogram. See src/assets/events/README.md for sizes.
 */
const files = import.meta.glob<string>('../assets/events/*.{png,jpg,jpeg,webp,avif,gif,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Event id (the file name without its extension) to image URL. */
const IMAGES = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  IMAGES.set(path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, ''), url);
}

/** URL of the event's image, or undefined if it has none. */
export function eventImage(eventId: string): string | undefined {
  return IMAGES.get(eventId);
}

/** File names that match no event; reported by the data check during development. */
export function unmatchedImages(knownIds: ReadonlySet<string>): string[] {
  return [...IMAGES.keys()].filter((id) => !knownIds.has(id));
}
