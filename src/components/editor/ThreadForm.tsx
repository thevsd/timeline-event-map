import { useState } from 'react';
import { useWorld } from '../../context';
import { removeThread, saveThread } from '../../model/edit';
import type { ThreadDoc } from '../../model/schema';
import { Field, PickList } from './fields';
import { FormShell, type FormProps } from './form';

interface ThreadFormProps extends FormProps {
  id: string;
  /** Leave the form and pick this thread's events by clicking cards on the timeline. */
  onPickOnTimeline(thread: ThreadDoc): void;
}

/** Change a thread: its name, what it is about, and its events. New threads are made in thread mode. */
export function ThreadForm({ id, onCommit, onCancel, onTouch, ask, onPickOnTimeline }: ThreadFormProps) {
  const world = useWorld();
  const { doc } = world;
  const existing = doc.threads.find((t) => t.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [summary, setSummary] = useState(existing?.summary ?? '');
  const [events, setEvents] = useState<string[]>(existing?.events ?? []);

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    onTouch();
  };
  if (!existing) return null;

  const current = (): ThreadDoc => ({ id, name: name.trim() || existing.name, events, ...(summary.trim() ? { summary: summary.trim() } : {}) });

  return (
    <FormShell
      title="Edit thread"
      save="Save thread"
      problem={!name.trim() ? 'Give the thread a name.' : undefined}
      onSave={() => onCommit(saveThread(doc, current()), { kind: 'thread', id })}
      onCancel={onCancel}
      onDelete={() =>
        ask({
          type: 'confirm',
          title: 'Delete this thread?',
          message: `“${existing.name}” will be removed. Its events stay. Undo brings it back.`,
          confirm: 'Delete thread',
          danger: true,
          onConfirm: () => onCommit(removeThread(doc, id), null),
        })
      }
    >
      <Field label="Name">
        <input type="text" value={name} onChange={(e) => edit(setName)(e.target.value)} />
      </Field>
      <Field label="What it is about">
        <textarea rows={4} value={summary} onChange={(e) => edit(setSummary)(e.target.value)} />
      </Field>
      <Field label="Events" group hint="Shown in date order, whatever the order here.">
        <PickList
          values={events}
          choices={world.events.map((ev) => ({ value: ev.id, label: ev.title, note: ev.when }))}
          onChange={edit(setEvents)}
          placeholder="Type an event’s title"
        />
        <button type="button" className="textbtn" onClick={() => onPickOnTimeline(current())}>
          Pick them on the timeline instead
        </button>
      </Field>
    </FormShell>
  );
}
