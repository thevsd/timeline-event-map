import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useWorld } from '../../context';
import { newId, nextHue } from '../../model/edit';
import type { CategoryDoc, GroupDoc, Hue, LaneKind, PersonDoc, TermDoc } from '../../model/schema';
import { Field, HueField } from './fields';

/**
 * Pop-ups over the app: the small forms that add a person, a term, a category and so on
 * without leaving the form underneath, and the questions the app asks before it discards work.
 */

interface ModalProps {
  title: string;
  onClose(): void;
  children: ReactNode;
}

/** A dialog centred over a dimmed page. Escape or a click outside closes it. */
export function Modal({ title, onClose, children }: ModalProps) {
  const box = useRef<HTMLDivElement>(null);
  // Start in the first field, so the pop-up can be filled in without reaching for the mouse,
  // and hand the focus back to where it was when the pop-up closes.
  useEffect(() => {
    const before = document.activeElement;
    box.current?.querySelector<HTMLElement>('input, textarea, select, button.primary')?.focus();
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus();
    };
  }, []);
  return (
    <div className="scrim" onPointerDown={(ev: { target: unknown; currentTarget: unknown }) => ev.target === ev.currentTarget && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={box}
        onKeyDown={(ev: KeyboardEvent) => {
          if (ev.key === 'Escape') {
            ev.stopPropagation();
            onClose();
          } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
            // Enter in a text area adds a line; with Ctrl it confirms, as in the forms.
            ev.preventDefault();
            box.current?.querySelector('form')?.requestSubmit();
          }
        }}
      >
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

/** Cancel and confirm buttons at the foot of a dialog. */
function Actions({ confirm, onCancel, danger }: { confirm: string; onCancel(): void; danger?: boolean }) {
  return (
    <div className="mactions">
      <button type="button" className="textbtn" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className={danger ? 'textbtn primary danger' : 'textbtn primary'}>
        {confirm}
      </button>
    </div>
  );
}

const submit = (action: () => void) => (ev: FormEvent) => {
  ev.preventDefault();
  action();
};

/** What the app can ask or offer in a pop-up. Each carries what to do with the answer. */
export type Dialog =
  | { type: 'confirm'; title: string; message: string; confirm: string; danger?: boolean; onConfirm(): void }
  | { type: 'person'; name: string; onDone(person: PersonDoc): void }
  | { type: 'term'; term: string; onDone(term: TermDoc): void }
  | { type: 'category'; name: string; onDone(category: CategoryDoc): void }
  | { type: 'group'; name: string; onDone(group: GroupDoc): void }
  | { type: 'kind'; name: string; onDone(kind: LaneKind): void }
  | { type: 'thread'; name: string; summary: string; count: number; onDone(name: string, summary: string): void }
  | { type: 'message'; title: string; lines: string[] };

/** Renders whichever pop-up is open. */
export function DialogHost({ dialog, onClose }: { dialog: Dialog | null; onClose(): void }) {
  if (!dialog) return null;
  switch (dialog.type) {
    case 'confirm':
      return (
        <Modal title={dialog.title} onClose={onClose}>
          <form
            onSubmit={submit(() => {
              onClose();
              dialog.onConfirm();
            })}
          >
            <p className="mtext">{dialog.message}</p>
            <Actions confirm={dialog.confirm} onCancel={onClose} danger={dialog.danger} />
          </form>
        </Modal>
      );
    case 'message':
      return (
        <Modal title={dialog.title} onClose={onClose}>
          <form onSubmit={submit(onClose)}>
            <ul className="mlist">
              {dialog.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <div className="mactions">
              <button type="submit" className="textbtn primary">
                OK
              </button>
            </div>
          </form>
        </Modal>
      );
    case 'person': return <QuickPerson dialog={dialog} onClose={onClose} />;
    case 'term': return <QuickTerm dialog={dialog} onClose={onClose} />;
    case 'thread': return <ThreadName dialog={dialog} onClose={onClose} />;
    case 'category':
    case 'group':
    case 'kind': return <QuickColoured dialog={dialog} onClose={onClose} />;
  }
}

type Of<T extends Dialog['type']> = Extract<Dialog, { type: T }>;

/** Add a person without leaving the event: a name is enough, the rest can follow on the People tab. */
function QuickPerson({ dialog, onClose }: { dialog: Of<'person'>; onClose(): void }) {
  const world = useWorld();
  const [name, setName] = useState(dialog.name);
  const [role, setRole] = useState('');
  const [group, setGroup] = useState('');
  const [sex, setSex] = useState('');
  const taken = world.doc.people.some((p) => p.name === name.trim());
  const save = () => {
    if (!name.trim() || taken) return;
    onClose();
    dialog.onDone({
      name: name.trim(),
      ...(role.trim() ? { role: role.trim() } : {}),
      ...(group ? { group } : {}),
      ...(sex === 'm' || sex === 'f' ? { sex } : {}),
    });
  };
  return (
    <Modal title="New person" onClose={onClose}>
      <form onSubmit={submit(save)}>
        <Field label="Name" error={taken} hint={taken ? 'Someone with this name already exists.' : undefined}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role" hint="One line: who they are.">
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <div className="frow">
          {world.groups.length > 0 && (
            <Field label="Group">
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">None</option>
                {world.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Placeholder picture">
            <select value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Initials</option>
              <option value="m">Male figure</option>
              <option value="f">Female figure</option>
            </select>
          </Field>
        </div>
        <Actions confirm="Add person" onCancel={onClose} />
      </form>
    </Modal>
  );
}

/** Add a glossary term on the spot. */
function QuickTerm({ dialog, onClose }: { dialog: Of<'term'>; onClose(): void }) {
  const world = useWorld();
  const [term, setTerm] = useState(dialog.term);
  const [definition, setDefinition] = useState('');
  const [aliases, setAliases] = useState('');
  const save = () => {
    if (!term.trim() || !definition.trim()) return;
    const others = aliases.split(',').map((alias) => alias.trim()).filter(Boolean);
    onClose();
    dialog.onDone({
      id: newId(term, world.doc.glossary),
      term: term.trim(),
      definition: definition.trim(),
      ...(others.length ? { aliases: others } : {}),
    });
  };
  return (
    <Modal title="New glossary term" onClose={onClose}>
      <form onSubmit={submit(save)}>
        <Field label="Term">
          <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} />
        </Field>
        <Field label="Definition">
          <textarea rows={3} value={definition} onChange={(e) => setDefinition(e.target.value)} />
        </Field>
        <Field label="Other spellings" hint="Separated by commas. Each is underlined in text, like the term itself.">
          <input type="text" value={aliases} onChange={(e) => setAliases(e.target.value)} />
        </Field>
        <Actions confirm="Add term" onCancel={onClose} />
      </form>
    </Modal>
  );
}

const COLOURED = {
  category: { title: 'New category', confirm: 'Add category' },
  group: { title: 'New group', confirm: 'Add group' },
  kind: { title: 'New kind of lane entry', confirm: 'Add kind' },
} as const;

/** Add something that is a name and a colour: a category, a group of people, or a kind of lane entry. */
function QuickColoured({ dialog, onClose }: { dialog: Of<'category' | 'group' | 'kind'>; onClose(): void }) {
  const world = useWorld();
  const existing: readonly { id: string; color?: Hue }[] =
    dialog.type === 'category' ? world.doc.categories : dialog.type === 'group' ? world.doc.groups : (world.doc.lane?.kinds ?? []);
  const [name, setName] = useState(dialog.name);
  const [color, setColor] = useState<Hue>(() => nextHue(existing.map((entry) => entry.color)));
  const save = () => {
    if (!name.trim()) return;
    onClose();
    const entry = { id: newId(name, existing), name: name.trim(), color };
    // The three shapes are the same; the cast tells TypeScript which callback this is.
    (dialog.onDone as (entry: CategoryDoc) => void)(entry);
  };
  return (
    <Modal title={COLOURED[dialog.type].title} onClose={onClose}>
      <form onSubmit={submit(save)}>
        <Field label="Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Colour" group>
          <HueField value={color} onChange={setColor} />
        </Field>
        <Actions confirm={COLOURED[dialog.type].confirm} onCancel={onClose} />
      </form>
    </Modal>
  );
}

/** Name the thread built in thread mode. */
function ThreadName({ dialog, onClose }: { dialog: Of<'thread'>; onClose(): void }) {
  const [name, setName] = useState(dialog.name);
  const [summary, setSummary] = useState(dialog.summary);
  const save = () => {
    if (!name.trim()) return;
    onClose();
    dialog.onDone(name.trim(), summary.trim());
  };
  return (
    <Modal title={`Save thread · ${dialog.count} event${dialog.count === 1 ? '' : 's'}`} onClose={onClose}>
      <form onSubmit={submit(save)}>
        <Field label="Thread name">
          <input type="text" value={name} placeholder="e.g. The road to the merger" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="What it is about" hint="Optional. Shown at the top of the thread’s page.">
          <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        <Actions confirm="Save thread" onCancel={onClose} />
      </form>
    </Modal>
  );
}
