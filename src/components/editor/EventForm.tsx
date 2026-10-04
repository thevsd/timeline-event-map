import { useState } from 'react';
import { MOTIF_NAMES } from '../../art/motifs';
import { useWorld } from '../../context';
import { splitTerms } from '../../lib/glossary';
import { parseDate } from '../../lib/time';
import { newId, removeEvent, saveCategory, saveEvent, savePerson, saveTerm, saveThread, setEventThreads } from '../../model/edit';
import type { EventDoc, Tag, ThreadDoc } from '../../model/schema';
import { EVENT_IMAGE_SIDE } from '../../store/images';
import { DateField, Field, ImageField, PickList, SectionsField, fromSectionDrafts, toSectionDrafts } from './fields';
import { FormShell, compact, type FormProps } from './form';

/** Value of the "new…" entry in a select. */
const NEW = '\u0000new';

/**
 * Add or change an event. People, threads, categories and glossary terms that do not exist yet
 * can be added from here in a pop-up, without losing what has been typed.
 */
export function EventForm({ id, onCommit, onCancel, onTouch, ask }: FormProps & { id?: string }) {
  const world = useWorld();
  const { doc } = world;
  const existing = id ? doc.events.find((ev) => ev.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState(existing?.category ?? doc.categories[0].id);
  const [date, setDate] = useState(existing?.date ?? '');
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const [summary, setSummary] = useState(existing?.summary ?? '');
  const [image, setImage] = useState(existing?.image);
  const [people, setPeople] = useState<string[]>(existing?.people ?? []);
  const [threads, setThreads] = useState<string[]>(() => (id ? doc.threads.filter((t) => t.events.includes(id)).map((t) => t.id) : []));
  const [links, setLinks] = useState<string[]>(existing?.links ?? []);
  const [sections, setSections] = useState(() => toSectionDrafts(existing?.sections));
  // Details that most events leave alone.
  const [when, setWhen] = useState(existing?.when ?? '');
  const [dateNote, setDateNote] = useState(existing?.dateNote ?? '');
  const [source, setSource] = useState(existing?.source ?? '');
  const [part, setPart] = useState(existing?.part ? String(existing.part) : '');
  const [figure, setFigure] = useState(existing?.figure ?? '');
  const [motif, setMotif] = useState(existing?.motif ?? '');
  const [featured, setFeatured] = useState(existing?.featured === true);
  const [tags, setTags] = useState((existing?.tags ?? []).map((tag) => tag.label).join('\n'));

  /** Wrap a setter so that using it marks the form as holding unsaved input. */
  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    onTouch();
  };

  const start = date.trim() ? parseDate(date) : null;
  const end = endDate.trim() ? parseDate(endDate) : null;
  const problem = !title.trim()
    ? 'Give the event a title.'
    : date.trim() && !start
      ? 'The date is not valid.'
      : endDate.trim() && (!end || !start || end.day <= start.day)
        ? 'The end date must be a valid date after the start.'
        : undefined;

  // Glossary terms the text mentions, found as it is typed.
  const prose = [summary, ...sections.flatMap((section) => [section.text, section.lines])].join('\n');
  const mentioned = [...new Set(splitTerms(prose, world).flatMap((part) => (part.term ? [part.term] : [])))];

  const save = () => {
    const eventId = existing?.id ?? newId(title, doc.events);
    // A tag keeps its colour if it had one.
    const colours = new Map((existing?.tags ?? []).map((tag) => [tag.label, tag.color]));
    const event: EventDoc = compact({
      ...existing,
      id: eventId,
      title: title.trim(),
      category,
      date: date.trim(),
      endDate: date.trim() ? endDate.trim() : '',
      summary: summary.trim(),
      image,
      people,
      links,
      sections: fromSectionDrafts(sections),
      when: when.trim(),
      dateNote: dateNote.trim(),
      source: source.trim(),
      part: part ? Number(part) : undefined,
      figure: figure.trim(),
      motif,
      featured,
      tags: tags.split('\n').map((label) => label.trim()).filter(Boolean).map((label): Tag => compact({ label, color: colours.get(label) })),
    });
    // The summary is kept even when empty: cards expect one.
    event.summary = summary.trim();
    onCommit(setEventThreads(saveEvent(doc, event), eventId, threads), { kind: 'event', id: eventId });
  };

  return (
    <FormShell
      title={existing ? 'Edit event' : 'New event'}
      save={existing ? 'Save event' : 'Add event'}
      problem={problem}
      onSave={save}
      onCancel={onCancel}
      onDelete={
        existing &&
        (() =>
          ask({
            type: 'confirm',
            title: 'Delete this event?',
            message: `“${existing.title}” will be removed from the timeline, its threads and every link to it. Undo brings it back.`,
            confirm: 'Delete event',
            danger: true,
            onConfirm: () => onCommit(removeEvent(doc, existing.id), null),
          }))
      }
    >
      <Field label="Title">
        <input type="text" value={title} autoFocus={!existing} onChange={(e) => edit(setTitle)(e.target.value)} />
      </Field>

      <div className="frow">
        <DateField label="Date" value={date} onChange={edit(setDate)} optionalHint="Leave empty for an undated event." />
        <DateField label="End date" value={endDate} onChange={edit(setEndDate)} optionalHint="Only for an event that lasts." />
      </div>

      <Field label="Category">
        <select
          value={category}
          onChange={(e) => {
            if (e.target.value !== NEW) return edit(setCategory)(e.target.value);
            ask({
              type: 'category',
              name: '',
              onDone: (created) => {
                onCommit(saveCategory(doc, created));
                edit(setCategory)(created.id);
              },
            });
          }}
        >
          {doc.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NEW}>New category…</option>
        </select>
      </Field>

      <Field label="Summary" hint="One or two sentences. Shown on the card and in the hover preview.">
        <textarea rows={3} value={summary} onChange={(e) => edit(setSummary)(e.target.value)} />
      </Field>

      <Field label="Picture" group hint="Optional. Without one the card shows a pictogram.">
        <ImageField value={image} onChange={edit(setImage)} maxSide={EVENT_IMAGE_SIDE} shape="wide" />
      </Field>

      <Field label="People" group>
        <PickList
          values={people}
          choices={doc.people.map((p) => ({ value: p.name, label: p.name, note: p.role }))}
          onChange={edit(setPeople)}
          placeholder="Type a name"
          createLabel="person"
          onCreate={(name) =>
            ask({
              type: 'person',
              name,
              onDone: (person) => {
                onCommit(savePerson(doc, person));
                edit(setPeople)([...people, person.name]);
              },
            })
          }
        />
      </Field>

      <Field label="Threads" group hint="Storylines this event belongs to.">
        <PickList
          values={threads}
          choices={doc.threads.map((t) => ({ value: t.id, label: t.name }))}
          onChange={edit(setThreads)}
          placeholder="Type a thread’s name"
          createLabel="thread"
          onCreate={(name) =>
            ask({
              type: 'thread',
              name,
              summary: '',
              count: 1,
              onDone: (threadName, threadSummary) => {
                const thread: ThreadDoc = { id: newId(threadName, doc.threads), name: threadName, events: [], ...(threadSummary ? { summary: threadSummary } : {}) };
                onCommit(saveThread(doc, thread));
                edit(setThreads)([...threads, thread.id]);
              },
            })
          }
        />
      </Field>

      <Field label="Connected events" group hint="Lines are drawn to these when the event is selected.">
        <PickList
          values={links}
          choices={world.events.filter((ev) => ev.id !== id).map((ev) => ({ value: ev.id, label: ev.title, note: ev.when }))}
          onChange={edit(setLinks)}
          placeholder="Type an event’s title"
        />
      </Field>

      <Field label="Sections" group hint="The body of the event’s page: any number of headed blocks.">
        <SectionsField value={sections} onChange={edit(setSections)} suggestions="What happens" />
      </Field>

      <Field label="Glossary" group hint="Terms are underlined wherever the text mentions them.">
        <div className="chips">
          {mentioned.map((termId) => (
            <span key={termId} className="pill term-pill static">
              {world.termById.get(termId)?.term}
            </span>
          ))}
          <button
            type="button"
            className="pill add"
            onClick={() => ask({ type: 'term', term: '', onDone: (term) => onCommit(saveTerm(doc, term)) })}
          >
            + Add a term
          </button>
        </div>
      </Field>

      <details className="more" open={Boolean(when || dateNote || source || part || figure || motif || featured || tags)}>
        <summary>More details</summary>
        <div className="frow">
          <Field label="Date as shown" hint="Overrides the written-out date, e.g. “c. spring 1997”.">
            <input type="text" value={when} onChange={(e) => edit(setWhen)(e.target.value)} />
          </Field>
          <Field label="Note under the date" hint="E.g. how the date was worked out.">
            <input type="text" value={dateNote} onChange={(e) => edit(setDateNote)(e.target.value)} />
          </Field>
        </div>
        <div className="frow">
          {doc.parts.length > 0 && (
            <Field label="Part">
              <select value={part} onChange={(e) => edit(setPart)(e.target.value)}>
                <option value="">None</option>
                {doc.parts.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Source" hint="Where it happens, e.g. “Ch. 2”.">
            <input type="text" value={source} onChange={(e) => edit(setSource)(e.target.value)} />
          </Field>
        </div>
        <div className="frow">
          <Field label="Pictogram">
            <select value={motif} onChange={(e) => edit(setMotif)(e.target.value)}>
              <option value="">Default</option>
              {MOTIF_NAMES.filter((name) => name !== 'event').map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Key figure" hint="Shown on the picture, e.g. “¥800bn”.">
            <input type="text" value={figure} onChange={(e) => edit(setFigure)(e.target.value)} />
          </Field>
        </div>
        <Field label="Tags" hint="One per line. Shown as chips at the top of the event’s page.">
          <textarea rows={2} value={tags} onChange={(e) => edit(setTags)(e.target.value)} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={featured} onChange={(e) => edit(setFeatured)(e.target.checked)} />
          Featured: give it an illustrated card whenever there is room
        </label>
      </details>
    </FormShell>
  );
}
