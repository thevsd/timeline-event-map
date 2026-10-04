import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { imageToDataUrl } from '../../store/images';
import { matchesAll, planQuery, prepare } from '../../lib/text';
import { formatDate, parseDate } from '../../lib/time';
import { HUES, type Hue, type LabelledItem, type Section } from '../../model/schema';

/**
 * Building blocks of the editing forms: a labelled field, a chip picker, a picture field,
 * a colour picker and the editor for a page's sections.
 */

interface FieldProps {
  label: string;
  /** Shown under the control: what the field is for, or what is wrong with it. */
  hint?: ReactNode;
  error?: boolean;
  /** For a control made of several inputs: rendered as a labelled group instead of a <label>. */
  group?: boolean;
  children: ReactNode;
}

/** A label above a control, with an optional hint below. */
export function Field({ label, hint, error, group, children }: FieldProps) {
  const className = error ? 'field has-error' : 'field';
  const body = (
    <>
      <span className="flabel">{label}</span>
      {children}
      {hint && <span className="fhint">{hint}</span>}
    </>
  );
  return group ? (
    <div className={className} role="group" aria-label={label}>
      {body}
    </div>
  ) : (
    <label className={className}>{body}</label>
  );
}

/** A date typed as YYYY, YYYY-MM or YYYY-MM-DD, with what it was understood as shown underneath. */
export function DateField({ label, value, onChange, optionalHint }: { label: string; value: string; onChange(value: string): void; optionalHint?: string }) {
  const parsed = value.trim() ? parseDate(value) : null;
  const bad = value.trim() !== '' && !parsed;
  return (
    <Field label={label} error={bad} hint={bad ? 'Write it as YYYY, YYYY-MM or YYYY-MM-DD.' : parsed ? formatDate(parsed) : optionalHint}>
      <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={value} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/** One of the palette's colours, picked from a row of swatches. */
export function HueField({ value, onChange }: { value: Hue; onChange(hue: Hue): void }) {
  return (
    <div className="hues" role="radiogroup" aria-label="Colour">
      {HUES.map((hue) => (
        <button
          key={hue}
          type="button"
          role="radio"
          aria-checked={hue === value}
          aria-label={hue}
          title={hue}
          className={`swatch-btn hue-${hue}`}
          onClick={() => onChange(hue)}
        />
      ))}
    </div>
  );
}

export interface Choice {
  value: string;
  label: string;
  /** Second line in the suggestion list, e.g. a date. */
  note?: string;
}

interface PickListProps {
  /** Selected values, in order. */
  values: readonly string[];
  /** Everything that can be picked. */
  choices: readonly Choice[];
  onChange(values: string[]): void;
  placeholder: string;
  /** Offer to create what was typed when nothing matches it exactly. The new item is added by the caller. */
  onCreate?(text: string): void;
  /** What a new item is called in "Add … as a new person". */
  createLabel?: string;
}

/**
 * A multi-select shown as chips: type to filter the choices, Enter or click to add, × or
 * Backspace to remove. With `onCreate`, text that matches nothing can be turned into a new item.
 */
export function PickList({ values, choices, onChange, placeholder, onCreate, createLabel }: PickListProps) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const labelOf = new Map(choices.map((choice) => [choice.value, choice.label]));

  const available = choices.filter((choice) => !values.includes(choice.value));
  const prepared = available.map((choice) => prepare(`${choice.label} ${choice.note ?? ''}`));
  const tokens = planQuery(text, prepared);
  const matches = available.filter((_, i) => matchesAll(tokens, prepared[i])).slice(0, 8);
  const typed = text.trim();
  const exact = choices.some((choice) => choice.label.toLowerCase() === typed.toLowerCase());
  const canCreate = onCreate != null && typed !== '' && !exact;
  const rows = matches.length + (canCreate ? 1 : 0);

  const add = (value: string) => {
    onChange([...values, value]);
    setText('');
    setActive(0);
  };
  const choose = (row: number) => {
    if (row < matches.length) add(matches[row].value);
    else if (canCreate) {
      onCreate(typed);
      setText('');
    }
  };
  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      setOpen(true);
      if (rows) setActive((current) => (current + (ev.key === 'ArrowDown' ? 1 : rows - 1)) % rows);
    } else if (ev.key === 'Enter' && !ev.ctrlKey && !ev.metaKey) {
      // Enter picks a suggestion; it must not submit the form around it.
      ev.preventDefault();
      if (open && rows) choose(Math.min(active, rows - 1));
    } else if (ev.key === 'Backspace' && !text && values.length) {
      onChange(values.slice(0, -1));
    } else if (ev.key === 'Escape' && open) {
      ev.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="picklist">
      {values.map((value) => (
        <span key={value} className="pchip">
          {labelOf.get(value) ?? value}
          <button type="button" aria-label={`Remove ${labelOf.get(value) ?? value}`} onClick={() => onChange(values.filter((other) => other !== value))}>
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        role="combobox"
        aria-expanded={open && rows > 0}
        aria-controls={listId}
        placeholder={placeholder}
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open && rows > 0 && (
        // Pressing a row must not take focus from the input, or the list would close before the click lands.
        <div id={listId} className="psuggest" role="listbox" onMouseDown={(ev: { preventDefault(): void }) => ev.preventDefault()}>
          {matches.map((choice, row) => (
            <div
              key={choice.value}
              role="option"
              aria-selected={row === active}
              className={row === active ? 'prow is-active' : 'prow'}
              onMouseEnter={() => setActive(row)}
              onClick={() => choose(row)}
            >
              {choice.label}
              {choice.note && <small>{choice.note}</small>}
            </div>
          ))}
          {canCreate && (
            <div
              role="option"
              aria-selected={active === matches.length}
              className={active === matches.length ? 'prow pnew is-active' : 'prow pnew'}
              onMouseEnter={() => setActive(matches.length)}
              onClick={() => choose(matches.length)}
            >
              Add “{typed}” as a new {createLabel ?? 'item'}…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ImageFieldProps {
  value: string | undefined;
  onChange(value: string | undefined): void;
  /** Longest side the stored picture may have. */
  maxSide: number;
  /** Shape of the preview. */
  shape: 'wide' | 'portrait';
}

/** A picture: choose a file (it is scaled down and stored in the timeline), replace it, or remove it. */
export function ImageField({ value, onChange, maxSide, shape }: ImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState('');
  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(await imageToDataUrl(file, maxSide));
      setProblem('');
    } catch {
      setProblem('That file could not be read as a picture.');
    }
  };
  return (
    <div className={`imagefield ${shape}`}>
      {value && <img src={value} alt="" />}
      <div className="imageactions">
        <button type="button" className="textbtn" onClick={() => input.current?.click()}>
          {value ? 'Replace picture' : 'Choose a picture'}
        </button>
        {value && (
          <button type="button" className="textbtn" onClick={() => onChange(undefined)}>
            Remove
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {problem && <span className="fhint bad">{problem}</span>}
    </div>
  );
}

/** A section while it is being edited: its list is one entry per line. */
export interface SectionDraft {
  title: string;
  text: string;
  lines: string;
  /** Labelled entries are kept as they are; the form edits plain lines only. */
  labelled: LabelledItem[];
}

export function toSectionDrafts(sections: readonly Section[] | undefined): SectionDraft[] {
  return (sections ?? []).map((section) => ({
    title: section.title,
    text: section.text ?? '',
    lines: (section.items ?? []).filter((item): item is string => typeof item === 'string').join('\n'),
    labelled: (section.items ?? []).filter((item): item is LabelledItem => typeof item !== 'string'),
  }));
}

export function fromSectionDrafts(drafts: readonly SectionDraft[]): Section[] {
  return drafts.flatMap((draft): Section[] => {
    const items = [...draft.lines.split('\n').map((line) => line.trim()).filter(Boolean), ...draft.labelled];
    const text = draft.text.trim();
    if (!text && !items.length) return [];
    return [{ title: draft.title.trim() || 'Notes', ...(text ? { text } : {}), ...(items.length ? { items } : {}) }];
  });
}

/** Editor for the titled blocks of a page. Each block has a heading, a paragraph and a list, one entry per line. */
export function SectionsField({ value, onChange, suggestions }: { value: SectionDraft[]; onChange(value: SectionDraft[]): void; suggestions: string }) {
  const update = (index: number, patch: Partial<SectionDraft>) => onChange(value.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  return (
    <div className="sections">
      {value.map((draft, index) => (
        <div key={index} className="sectionbox">
          <div className="sectionhead">
            <input
              type="text"
              aria-label="Section heading"
              placeholder={`Heading, e.g. ${suggestions}`}
              value={draft.title}
              onChange={(e) => update(index, { title: e.target.value })}
            />
            <button type="button" className="iconbtn" aria-label="Remove this section" title="Remove section" onClick={() => onChange(value.filter((_, i) => i !== index))}>
              ×
            </button>
          </div>
          <textarea aria-label="Paragraph" placeholder="A paragraph (optional)" rows={2} value={draft.text} onChange={(e) => update(index, { text: e.target.value })} />
          <textarea aria-label="List" placeholder="A list: one point per line (optional)" rows={3} value={draft.lines} onChange={(e) => update(index, { lines: e.target.value })} />
          {draft.labelled.length > 0 && (
            <span className="fhint">
              {draft.labelled.length} labelled entr{draft.labelled.length === 1 ? 'y is' : 'ies are'} kept as imported; edit them in the JSON file.
            </span>
          )}
        </div>
      ))}
      <button type="button" className="textbtn" onClick={() => onChange([...value, { title: '', text: '', lines: '', labelled: [] }])}>
        + Add a section
      </button>
    </div>
  );
}
