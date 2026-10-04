import { useState } from 'react';
import { useWorld } from '../../context';
import { parseDate } from '../../lib/time';
import { newId, removeLaneItem, saveLaneItem } from '../../model/edit';
import type { LaneItemDoc } from '../../model/schema';
import { DateField, Field, PickList } from './fields';
import { FormShell, compact, type FormProps } from './form';

const NEW = '\u0000new';

/** Add or change an entry of the second lane. */
export function LaneItemForm({ id, onCommit, onCancel, onTouch, ask }: FormProps & { id?: string }) {
  const world = useWorld();
  const { doc } = world;
  const lane = doc.lane;
  const existing = id ? lane?.items.find((item) => item.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? '');
  const [kind, setKind] = useState(existing?.kind ?? '');
  const [text, setText] = useState(existing?.text ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [events, setEvents] = useState<string[]>(existing?.events ?? []);
  const [major, setMajor] = useState(existing?.major === true);

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    onTouch();
  };
  if (!lane) return null;

  const problem = !title.trim() ? 'Give the entry a title.' : !parseDate(date) ? 'A lane entry needs a valid date.' : undefined;

  const save = () => {
    const itemId = existing?.id ?? newId(title, lane.items);
    const item: LaneItemDoc = compact({ ...existing, id: itemId, title: title.trim(), date: date.trim(), kind, text: text.trim(), note: note.trim(), events, major });
    onCommit(saveLaneItem(doc, item), { kind: 'lane', id: itemId });
  };

  return (
    <FormShell
      title={existing ? `Edit entry · ${lane.title}` : `New entry · ${lane.title}`}
      save={existing ? 'Save entry' : 'Add entry'}
      problem={problem}
      onSave={save}
      onCancel={onCancel}
      onDelete={
        existing &&
        (() =>
          ask({
            type: 'confirm',
            title: 'Delete this entry?',
            message: `“${existing.title}” will be removed from the lane. Undo brings it back.`,
            confirm: 'Delete entry',
            danger: true,
            onConfirm: () => onCommit(removeLaneItem(doc, existing.id), null),
          }))
      }
    >
      <Field label="Title">
        <input type="text" value={title} autoFocus={!existing} onChange={(e) => edit(setTitle)(e.target.value)} />
      </Field>
      <div className="frow">
        <DateField label="Date" value={date} onChange={edit(setDate)} />
        <Field label="Kind">
          <select
            value={kind}
            onChange={(e) => {
              if (e.target.value !== NEW) return edit(setKind)(e.target.value);
              ask({
                type: 'kind',
                name: '',
                onDone: (created) => {
                  onCommit({ ...doc, lane: { ...lane, kinds: [...lane.kinds, created] } });
                  edit(setKind)(created.id);
                },
              });
            }}
          >
            <option value="">None</option>
            {lane.kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
            <option value={NEW}>New kind…</option>
          </select>
        </Field>
      </div>
      <Field label={lane.textLabel ?? 'About'}>
        <textarea rows={3} value={text} onChange={(e) => edit(setText)(e.target.value)} />
      </Field>
      <Field label={lane.noteLabel ?? 'Notes'}>
        <textarea rows={3} value={note} onChange={(e) => edit(setNote)(e.target.value)} />
      </Field>
      <Field label="Related events" group hint="A dotted line ties the entry to these cards.">
        <PickList
          values={events}
          choices={world.events.map((ev) => ({ value: ev.id, label: ev.title, note: ev.when }))}
          onChange={edit(setEvents)}
          placeholder="Type an event’s title"
        />
      </Field>
      <label className="check">
        <input type="checkbox" checked={major} onChange={(e) => edit(setMajor)(e.target.checked)} />
        Major: keep its label showing when the lane is crowded
      </label>
    </FormShell>
  );
}
