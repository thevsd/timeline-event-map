/**
 * Optional portraits for characters.
 *
 * Put a file named after the character in src/assets/characters/ (for example `keikain-runa.webp`)
 * and it is used on the Characters tab and the person page. Characters without a file show
 * their initials. See src/assets/characters/README.md for naming and sizes.
 */
const files = import.meta.glob<string>('../assets/characters/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** File name (without its extension) to image URL. */
const IMAGES = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  IMAGES.set(path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, ''), url);
}

/** File name a character's portrait must have: the name in lower case, words joined by hyphens. */
export function personSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** URL of the character's portrait, or undefined if there is none. */
export function characterImage(name: string): string | undefined {
  return IMAGES.get(personSlug(name));
}

/** File names that match no character; reported by the data check during development. */
export function unmatchedPortraits(names: readonly string[]): string[] {
  const known = new Set(names.map(personSlug));
  return [...IMAGES.keys()].filter((slug) => !known.has(slug));
}
