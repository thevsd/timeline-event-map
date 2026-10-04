import { useState } from 'react';
import { useWorld } from '../../context';
import { newId, removeTerm, saveTerm } from '../../model/edit';
import type { TermDoc } from '../../model/schema';
import { Field } from './fields';
import { FormShell, compact, type FormProps } from './form';

const listOf = (text: string, separator: string) => text.split(separator).map((entry) => entry.trim()).filter(Boolean);

/** Add or change a glossary term. */
export function TermForm({ id, onCommit, onCancel, onTouch, ask }: FormProps & { id?: string }) {
  const { doc } = useWorld();
  const existing = id ? doc.glossary.find((t) => t.id === id) : undefined;

  const [term, setTerm] = useState(existing?.term ?? '');
  const [definition, setDefinition] = useState(existing?.definition ?? '');
  const [aliases, setAliases] = useState((existing?.aliases ?? []).join(', '));
  const [origin, setOrigin] = useState(existing?.origin ?? '');
  const [part, setPart] = useState(existing?.part ? String(existing.part) : '');
  const [tags, setTags] = useState((existing?.tags ?? []).join('\n'));

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    onTouch();
  };

  const problem = !term.trim() ? 'Give the term a name.' : !definition.trim() ? 'Write a definition.' : undefined;

  const save = () => {
    const termId = existing?.id ?? newId(term, doc.glossary);
    const saved: TermDoc = compact({
      ...existing,
      id: termId,
      term: term.trim(),
      definition: definition.trim(),
      aliases: listOf(aliases, ','),
      origin: origin.trim(),
      part: part ? Number(part) : undefined,
      tags: listOf(tags, '\n'),
    });
    onCommit(saveTerm(doc, saved), { kind: 'term', id: termId });
  };

  return (
    <FormShell
      title={existing ? 'Edit term' : 'New glossary term'}
      save={existing ? 'Save term' : 'Add term'}
      problem={problem}
      onSave={save}
      onCancel={onCancel}
      onDelete={
        existing &&
        (() =>
          ask({
            type: 'confirm',
            title: 'Delete this term?',
            message: `“${existing.term}” will no longer be underlined or explained. Undo brings it back.`,
            confirm: 'Delete term',
            danger: true,
            onConfirm: () => onCommit(removeTerm(doc, existing.id), null),
          }))
      }
    >
      <Field label="Term">
        <input type="text" value={term} autoFocus={!existing} onChange={(e) => edit(setTerm)(e.target.value)} />
      </Field>
      <Field label="Definition">
        <textarea rows={5} value={definition} onChange={(e) => edit(setDefinition)(e.target.value)} />
      </Field>
      <Field label="Other spellings" hint="Separated by commas. Plurals and translations go here; each is matched in text like the term.">
        <input type="text" value={aliases} onChange={(e) => edit(setAliases)(e.target.value)} />
      </Field>
      <Field label="Origin" hint="The term in its own language, or what an abbreviation stands for.">
        <input type="text" value={origin} onChange={(e) => edit(setOrigin)(e.target.value)} />
      </Field>
      <div className="frow">
        {doc.parts.length > 0 && (
          <Field label="Introduced in" hint="Hidden from readers who are not there yet.">
            <select value={part} onChange={(e) => edit(setPart)(e.target.value)}>
              <option value="">Always shown</option>
              {doc.parts.map((partName, index) => (
                <option key={partName} value={index + 1}>
                  {partName}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Tags" hint="One per line.">
          <textarea rows={2} value={tags} onChange={(e) => edit(setTags)(e.target.value)} />
        </Field>
      </div>
    </FormShell>
  );
}
