import type { FormEvent, ReactNode } from 'react';
import type { TimelineDoc } from '../../model/schema';
import type { PanelPage } from '../../types';
import type { Dialog } from './dialogs';

/** What every editing form is given by the shell. */
export interface FormProps {
  /**
   * Store a changed document as one undoable step. With `then`, the form closes and that page
   * opens in its place; with null it just closes; left out, the form stays open (a quick add).
   */
  onCommit(next: TimelineDoc, then?: PanelPage | null): void;
  /** Close the form without saving. */
  onCancel(): void;
  /** Tell the shell the form now holds unsaved input, so it asks before discarding it. */
  onTouch(): void;
  /** Open a pop-up over the form. */
  ask(dialog: Dialog): void;
}

interface FormShellProps {
  /** Heading: what is being added or changed. */
  title: string;
  /** Label of the save button. */
  save: string;
  /** First problem that prevents saving; shown beside the buttons. */
  problem?: string;
  onSave(): void;
  onCancel(): void;
  /** Present when the thing being edited already exists. */
  onDelete?(): void;
  children: ReactNode;
}

/** The frame shared by the forms: heading, fields, and a foot with Save and Cancel. Ctrl+Enter submits it (see Workspace). */
export function FormShell({ title, save, problem, onSave, onCancel, onDelete, children }: FormShellProps) {
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!problem) onSave();
  };
  return (
    <form className="pbody page form" onSubmit={submit}>
      <h2 id="ptitle">{title}</h2>
      {children}
      <div className="formfoot">
        {problem && <span className="fhint bad">{problem}</span>}
        {onDelete && (
          <button type="button" className="textbtn danger" onClick={onDelete}>
            Delete
          </button>
        )}
        <button type="button" className="textbtn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="textbtn primary" disabled={!!problem} title="Save (Ctrl+Enter)">
          {save}
        </button>
      </div>
    </form>
  );
}

/** Drop keys that carry nothing, so the document stays lean. */
export function compact<T extends object>(record: T): T {
  const out = { ...record };
  for (const key of Object.keys(out) as (keyof T)[]) {
    const value = out[key];
    if (value === undefined || value === '' || value === false || (Array.isArray(value) && value.length === 0)) delete out[key];
  }
  return out;
}
