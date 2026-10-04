/** App-level types shared by the shell and its components. */

/** Which main view is showing. The corporate map exists for the Modern Villainess demo only. */
export type View = 'timeline' | 'cast' | 'glossary' | 'map';

/** Something to create or change, edited in the side panel. A missing id or name means "new". */
export type FormTarget =
  | { type: 'event'; id?: string }
  | { type: 'person'; name?: string }
  | { type: 'term'; id?: string }
  | { type: 'thread'; id: string }
  | { type: 'laneItem'; id?: string }
  | { type: 'settings' };

/** What the side panel shows. The shell keeps a stack of these so pages can link to each other and go back. */
export type PanelPage =
  | { kind: 'event'; id: string }
  | { kind: 'person'; name: string }
  | { kind: 'thread'; id: string }
  | { kind: 'lane'; id: string }
  | { kind: 'company'; id: string }
  | { kind: 'term'; id: string }
  | { kind: 'form'; form: FormTarget };

/** A page that shows something, as opposed to a form. */
export type ViewPage = Exclude<PanelPage, { kind: 'form' }>;

/** How a page is opened: replacing the whole stack, on top of it, or in place of the current page. */
export type OpenMode = 'reset' | 'push' | 'replace';

/** Stable key of a page, for lists and for telling two pages apart. */
export function pageKey(page: PanelPage): string {
  switch (page.kind) {
    case 'person': return `person:${page.name}`;
    case 'form': {
      const { form } = page;
      const subject = form.type === 'person' ? form.name : form.type === 'settings' ? '' : form.id;
      return `form:${form.type}:${subject ?? ''}`;
    }
    default: return `${page.kind}:${page.id}`;
  }
}
