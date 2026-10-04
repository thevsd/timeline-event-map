/** App-level types shared by the shell and its components. */

/** Which main view is showing: the timeline, the corporate map, or the character list. */
export type View = 'timeline' | 'map' | 'cast';

/** What the side panel shows. The shell keeps a stack of these so pages can link to each other and go back. */
export type PanelPage =
  | { kind: 'event'; id: string }
  | { kind: 'person'; name: string }
  | { kind: 'thread'; id: string }
  | { kind: 'real'; id: string }
  | { kind: 'company'; id: string }
  | { kind: 'term'; id: string };

/** How a page is opened: replacing the whole stack, on top of it, or in place of the current page. */
export type OpenMode = 'reset' | 'push' | 'replace';
