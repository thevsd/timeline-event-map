import { useState } from 'react';
import { useWorld } from '../../context';
import { removePerson, saveGroup, savePerson } from '../../model/edit';
import type { PersonDoc } from '../../model/schema';
import { PORTRAIT_SIDE } from '../../store/images';
import { Field, ImageField, SectionsField, fromSectionDrafts, toSectionDrafts } from './fields';
import { FormShell, compact, type FormProps } from './form';

const NEW = '\u0000new';

/** Add or change a person. Renaming one carries the new name into every event that names them. */
export function PersonForm({ name: original, onCommit, onCancel, onTouch, ask }: FormProps & { name?: string }) {
  const { doc } = useWorld();
  const existing = original ? doc.people.find((p) => p.name === original) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [role, setRole] = useState(existing?.role ?? '');
  const [group, setGroup] = useState(existing?.group ?? '');
  const [sex, setSex] = useState<string>(existing?.sex ?? '');
  const [part, setPart] = useState(existing?.part ? String(existing.part) : '');
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [image, setImage] = useState(existing?.image);
  const [credit, setCredit] = useState(existing?.imageCredit ?? '');
  const [sections, setSections] = useState(() => toSectionDrafts(existing?.sections));

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    onTouch();
  };

  const taken = doc.people.some((p) => p.name === name.trim() && p.name !== existing?.name);
  const problem = !name.trim() ? 'Give the person a name.' : taken ? 'Someone with this name already exists.' : undefined;

  const save = () => {
    const person: PersonDoc = compact({
      ...existing,
      name: name.trim(),
      role: role.trim(),
      group,
      sex: sex === 'm' || sex === 'f' ? sex : undefined,
      part: part ? Number(part) : undefined,
      bio: bio.trim(),
      image,
      imageCredit: image ? credit.trim() : '',
      sections: fromSectionDrafts(sections),
    });
    onCommit(savePerson(doc, person, existing?.name), { kind: 'person', name: person.name });
  };

  return (
    <FormShell
      title={existing ? 'Edit person' : 'New person'}
      save={existing ? 'Save person' : 'Add person'}
      problem={problem}
      onSave={save}
      onCancel={onCancel}
      onDelete={
        existing &&
        (() =>
          ask({
            type: 'confirm',
            title: 'Delete this person?',
            message: `“${existing.name}” will be removed, along with their name on every event. Undo brings them back.`,
            confirm: 'Delete person',
            danger: true,
            onConfirm: () => onCommit(removePerson(doc, existing.name), null),
          }))
      }
    >
      <Field label="Name">
        <input type="text" value={name} autoFocus={!existing} onChange={(e) => edit(setName)(e.target.value)} />
      </Field>
      <Field label="Role" hint="One line: who they are.">
        <input type="text" value={role} onChange={(e) => edit(setRole)(e.target.value)} />
      </Field>
      <div className="frow">
        <Field label="Group">
          <select
            value={group}
            onChange={(e) => {
              if (e.target.value !== NEW) return edit(setGroup)(e.target.value);
              ask({
                type: 'group',
                name: '',
                onDone: (created) => {
                  onCommit(saveGroup(doc, created));
                  edit(setGroup)(created.id);
                },
              });
            }}
          >
            <option value="">None</option>
            {doc.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value={NEW}>New group…</option>
          </select>
        </Field>
        {doc.parts.length > 0 && (
          <Field label="First appears in">
            <select value={part} onChange={(e) => edit(setPart)(e.target.value)}>
              <option value="">Their first event</option>
              {doc.parts.map((partName, index) => (
                <option key={partName} value={index + 1}>
                  {partName}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <Field label="About them">
        <textarea rows={5} value={bio} onChange={(e) => edit(setBio)(e.target.value)} />
      </Field>
      <Field label="Portrait" group>
        <ImageField value={image} onChange={edit(setImage)} maxSide={PORTRAIT_SIDE} shape="portrait" />
      </Field>
      <div className="frow">
        <Field label="Without a portrait, show">
          <select value={sex} onChange={(e) => edit(setSex)(e.target.value)}>
            <option value="">Their initials</option>
            <option value="m">A male figure</option>
            <option value="f">A female figure</option>
          </select>
        </Field>
        {image && (
          <Field label="Portrait credit">
            <input type="text" value={credit} onChange={(e) => edit(setCredit)(e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Sections" group hint="Further headed blocks on their page.">
        <SectionsField value={sections} onChange={edit(setSections)} suggestions="Background" />
      </Field>
    </FormShell>
  );
}
