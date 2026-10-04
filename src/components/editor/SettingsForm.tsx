import { useState } from 'react';
import { useWorld } from '../../context';
import { nextHue } from '../../model/edit';
import { slug, uniqueId } from '../../model/parse';
import type { CategoryDoc, GroupDoc, Hue, LaneKind, TimelineDoc } from '../../model/schema';
import { Field, HueField } from './fields';
import { FormShell, compact, type FormProps } from './form';

/** A name with a colour while it is being edited: a category, a group, or a kind of lane entry. */
interface Row {
  /** Empty for a row added in this form; it gets its id on save. */
  id: string;
  name: string;
  color: Hue;
  glyph: string;
}

const toRows = (entries: readonly { id: string; name: string; color?: Hue; glyph?: string }[]): Row[] =>
  entries.map((entry) => ({ id: entry.id, name: entry.name, color: entry.color ?? 'gray', glyph: entry.glyph ?? '' }));

/** Give new rows an id and drop the unnamed ones. */
function fromRows(rows: readonly Row[]): Row[] {
  const taken = new Set(rows.map((row) => row.id).filter(Boolean));
  return rows.filter((row) => row.name.trim()).map((row) => ({ ...row, name: row.name.trim(), id: row.id || uniqueId(slug(row.name), taken) }));
}

interface RowsFieldProps {
  rows: Row[];
  onChange(rows: Row[]): void;
  /** Whether rows carry a glyph (categories do). */
  glyph?: boolean;
  /** Fewest rows that must remain. */
  least?: number;
  add: string;
}

function RowsField({ rows, onChange, glyph, least = 0, add }: RowsFieldProps) {
  const update = (index: number, patch: Partial<Row>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="rows">
      {rows.map((row, index) => (
        <div key={index} className={`rowbox hue-${row.color}`}>
          <div className="rowhead">
            <i className="dot" aria-hidden="true" />
            <input type="text" aria-label="Name" placeholder="Name" value={row.name} onChange={(e) => update(index, { name: e.target.value })} />
            {glyph && (
              <input
                type="text"
                className="glyphinput"
                aria-label="Mark"
                title="One or two characters shown beside the colour"
                placeholder={row.name.slice(0, 1).toUpperCase() || 'A'}
                maxLength={2}
                value={row.glyph}
                onChange={(e) => update(index, { glyph: e.target.value })}
              />
            )}
            <button
              type="button"
              className="iconbtn"
              aria-label={`Remove ${row.name || 'this row'}`}
              title="Remove"
              disabled={rows.length <= least}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
          <HueField value={row.color} onChange={(color) => update(index, { color })} />
        </div>
      ))}
      <button type="button" className="textbtn" onClick={() => onChange([...rows, { id: '', name: '', color: nextHue(rows.map((row) => row.color)), glyph: '' }])}>
        + {add}
      </button>
    </div>
  );
}

/** Everything about the timeline as a whole: its title, parts, categories, groups, second lane and captions. */
export function SettingsForm({ onCommit, onCancel, onTouch }: FormProps) {
  const world = useWorld();
  const { doc } = world;

  const [title, setTitle] = useState(doc.title);
  const [subtitle, setSubtitle] = useState(doc.subtitle ?? '');
  const [parts, setParts] = useState(doc.parts.join('\n'));
  const [categories, setCategories] = useState(() => toRows(doc.categories));
  const [groups, setGroups] = useState(() => toRows(doc.groups));
  const [hasLane, setHasLane] = useState(doc.lane != null);
  const [laneTitle, setLaneTitle] = useState(doc.lane?.title ?? '');
  const [textLabel, setTextLabel] = useState(doc.lane?.textLabel ?? '');
  const [noteLabel, setNoteLabel] = useState(doc.lane?.noteLabel ?? '');
  const [kinds, setKinds] = useState(() => toRows(doc.lane?.kinds ?? []));
  const [undatedLabel, setUndatedLabel] = useState(doc.undated?.label ?? '');
  const [undatedNote, setUndatedNote] = useState(doc.undated?.note ?? '');
  const [countdownEvent, setCountdownEvent] = useState(doc.countdown?.event ?? '');
  const [countdownLabel, setCountdownLabel] = useState(doc.countdown?.label ?? '');

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    onTouch();
  };

  const namedCategories = categories.filter((row) => row.name.trim());
  const problem = !title.trim()
    ? 'Give the timeline a title.'
    : !namedCategories.length
      ? 'Keep at least one category.'
      : hasLane && !laneTitle.trim()
        ? 'Give the second lane a title.'
        : undefined;

  const save = () => {
    const partNames = parts.split('\n').map((name) => name.trim()).filter(Boolean);
    const nextCategories = fromRows(categories).map((row): CategoryDoc => compact({ id: row.id, name: row.name, color: row.color, glyph: row.glyph.trim() }));
    const nextGroups = fromRows(groups).map((row): GroupDoc => ({ id: row.id, name: row.name, color: row.color }));
    const nextKinds = fromRows(kinds).map((row): LaneKind => ({ id: row.id, name: row.name, color: row.color }));
    const categoryIds = new Set(nextCategories.map((c) => c.id));
    const groupIds = new Set(nextGroups.map((g) => g.id));
    const kindIds = new Set(nextKinds.map((k) => k.id));
    const target = doc.events.find((ev) => ev.id === countdownEvent && ev.date);
    /** A part number that no longer exists is dropped. */
    const keptPart = (part: number | undefined) => (part != null && part <= partNames.length ? part : undefined);

    const next: TimelineDoc = {
      ...doc,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      parts: partNames,
      categories: nextCategories,
      groups: nextGroups,
      // Events of a removed category move to the first one; people of a removed group lose it.
      events: doc.events.map((ev) => ({ ...ev, category: categoryIds.has(ev.category) ? ev.category : nextCategories[0].id, part: keptPart(ev.part) })),
      people: doc.people.map((p) => ({ ...p, group: p.group && groupIds.has(p.group) ? p.group : undefined, part: keptPart(p.part) })),
      glossary: doc.glossary.map((t) => ({ ...t, part: keptPart(t.part) })),
      lane: hasLane
        ? compact({
            title: laneTitle.trim(),
            textLabel: textLabel.trim(),
            noteLabel: noteLabel.trim(),
            kinds: nextKinds,
            items: (doc.lane?.items ?? []).map((item) => ({ ...item, kind: item.kind && kindIds.has(item.kind) ? item.kind : undefined })),
          })
        : undefined,
      undated: undatedLabel.trim() || undatedNote.trim() ? compact({ label: undatedLabel.trim(), note: undatedNote.trim() }) : undefined,
      countdown: target ? { ...doc.countdown, event: target.id, label: countdownLabel.trim() || target.title } : undefined,
    };
    // `compact` drops empty lists; a lane always has both.
    if (next.lane) next.lane = { ...next.lane, kinds: nextKinds, items: next.lane.items ?? [] };
    onCommit(next, null);
  };

  const dated = world.events.filter((ev) => ev.day != null);

  return (
    <FormShell title="Timeline settings" save="Save settings" problem={problem} onSave={save} onCancel={onCancel}>
      <Field label="Title">
        <input type="text" value={title} onChange={(e) => edit(setTitle)(e.target.value)} />
      </Field>
      <Field label="Subtitle" hint="One line under the title.">
        <input type="text" value={subtitle} onChange={(e) => edit(setSubtitle)(e.target.value)} />
      </Field>

      <Field label="Categories" group hint="Each event has one. They colour the cards and can be switched off in the filter row.">
        <RowsField rows={categories} onChange={edit(setCategories)} glyph least={1} add="Add a category" />
      </Field>

      <Field label="Groups of people" group hint="Sections of the People tab, e.g. a family or a faction.">
        <RowsField rows={groups} onChange={edit(setGroups)} add="Add a group" />
      </Field>

      <Field
        label="Parts"
        hint="One per line, in order: volumes, seasons, acts. Events can then be assigned a part, and readers can hide the parts they have not reached."
      >
        <textarea rows={4} placeholder={'Vol. 1\nVol. 2'} value={parts} onChange={(e) => edit(setParts)(e.target.value)} />
      </Field>

      <Field label="Second lane" group hint="A smaller timeline above the cards, for a parallel sequence: real history beside a story, releases beside development.">
        <label className="check">
          <input type="checkbox" checked={hasLane} onChange={(e) => edit(setHasLane)(e.target.checked)} />
          This timeline has a second lane
        </label>
        {hasLane && (
          <>
            <input type="text" aria-label="Lane title" placeholder="Lane title, e.g. Real history" value={laneTitle} onChange={(e) => edit(setLaneTitle)(e.target.value)} />
            <div className="frow">
              <input type="text" aria-label="Heading of an entry’s main text" placeholder="Heading of the main text (About)" value={textLabel} onChange={(e) => edit(setTextLabel)(e.target.value)} />
              <input type="text" aria-label="Heading of an entry’s second text" placeholder="Heading of the second text (Notes)" value={noteLabel} onChange={(e) => edit(setNoteLabel)(e.target.value)} />
            </div>
            <span className="flabel sub">Kinds of entry</span>
            <RowsField rows={kinds} onChange={edit(setKinds)} add="Add a kind" />
          </>
        )}
        {!hasLane && doc.lane && doc.lane.items.length > 0 && (
          <span className="fhint bad">Saving will remove the lane and its {doc.lane.items.length} entries. Undo brings them back.</span>
        )}
      </Field>

      <details className="more" open={Boolean(undatedLabel || undatedNote || countdownEvent)}>
        <summary>Captions and countdown</summary>
        <div className="frow">
          <Field label="Undated zone title" hint="Events without a date sit in a zone before the axis.">
            <input type="text" placeholder="Undated" value={undatedLabel} onChange={(e) => edit(setUndatedLabel)(e.target.value)} />
          </Field>
          <Field label="Undated zone note">
            <input type="text" placeholder="not to scale" value={undatedNote} onChange={(e) => edit(setUndatedNote)(e.target.value)} />
          </Field>
        </div>
        <Field label="Count down to" hint="Every earlier event then shows how many days remain until this one.">
          <select value={countdownEvent} onChange={(e) => edit(setCountdownEvent)(e.target.value)}>
            <option value="">No countdown</option>
            {dated.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} · {ev.when}
              </option>
            ))}
          </select>
        </Field>
        {countdownEvent && (
          <Field label="How to name it" hint="Completes “N days before …”.">
            <input type="text" placeholder="the launch" value={countdownLabel} onChange={(e) => edit(setCountdownLabel)(e.target.value)} />
          </Field>
        )}
      </details>
    </FormShell>
  );
}
