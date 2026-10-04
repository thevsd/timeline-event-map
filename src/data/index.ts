import { characterImage, unmatchedPortraits } from '../art/characterImages';
import { eventImage, unmatchedImages } from '../art/eventImages';
import { parseDoc } from '../model/parse';
import { FORMAT, VERSION, type Hue, type TimelineDoc } from '../model/schema';
import { BASIS_LABEL, CATEGORIES, CONFIDENCE_LABEL, HISTORY_LABEL } from './categories';
import { backstory } from './events/backstory';
import { volume1 } from './events/volume1';
import { volume2 } from './events/volume2';
import { volume3 } from './events/volume3';
import { volume4 } from './events/volume4';
import { volume5 } from './events/volume5';
import { glossary } from './glossary';
import { PERSON_GROUP_LABEL, people, type PersonGroup } from './people';
import { TREATMENT_LABEL, realHistory, type Treatment } from './realHistory';
import { threads } from './threads';
import type { CategoryId, Confidence, EventRecord, HistoryStatus } from './types';

/**
 * The demo: Modern Villainess, English Vols. 1–5.
 *
 * Its content is authored as typed records in this folder. This module turns them into the
 * app's document format, the same one an imported JSON file uses, so the demo exercises exactly
 * what a user's own timeline does.
 */

const CATEGORY_HUE: Record<CategoryId, Hue> = {
  finance: 'blue', politics: 'orange', deals: 'green', world: 'yellow', personal: 'pink', shadow: 'indigo',
};
const GROUP_HUE: Record<PersonGroup, Hue> = {
  family: 'pink', circle: 'green', school: 'yellow', politics: 'orange', intelligence: 'indigo', other: 'gray',
};
const HISTORY_HUE: Record<HistoryStatus, Hue | undefined> = { real: 'green', altered: 'brown', fiction: 'indigo', story: undefined };
const CONFIDENCE_HUE: Record<Confidence, Hue> = { strong: 'green', plausible: 'brown', speculative: 'indigo' };
const TREATMENT_HUE: Record<Treatment, Hue> = {
  preserved: 'green', altered: 'brown', prevented: 'indigo', moved: 'brown', ahead: 'gray',
};

const records: EventRecord[] = [...backstory, ...volume1, ...volume2, ...volume3, ...volume4, ...volume5];

const source = {
  format: FORMAT,
  version: VERSION,
  title: 'Modern Villainess',
  subtitle: 'Event map of English Vols. 1–5, counting down to 15 September 2008',
  parts: ['Vol. 1', 'Vol. 2', 'Vol. 3', 'Vol. 4', 'Vol. 5'],
  undated: { label: 'Before the story', note: '1944 – 1990 · not to scale' },
  countdown: { event: 'crash2008', label: 'the crash of 15 September 2008', jump: 'The crash, 2008' },
  gaps: [{ from: '2003-05-20', to: '2008-08-20', label: 'Summer 2003 to summer 2008', note: 'Volumes 6 onward are not mapped yet' }],
  categories: CATEGORIES.map((c) => ({ ...c, color: CATEGORY_HUE[c.id] })),
  groups: (Object.keys(PERSON_GROUP_LABEL) as PersonGroup[]).map((id) => ({ id, name: PERSON_GROUP_LABEL[id], color: GROUP_HUE[id] })),
  events: records.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    endDate: r.endDate,
    order: r.backstoryOrder,
    when: r.when,
    dateNote: BASIS_LABEL[r.basis],
    part: r.volume,
    source: r.chapter,
    category: r.category,
    summary: r.brief,
    image: eventImage(r.id),
    motif: r.motif,
    figure: r.figure,
    featured: r.marquee,
    tags: [{ label: HISTORY_LABEL[r.history].label, color: HISTORY_HUE[r.history] }],
    sections: [
      { title: 'What happens', items: r.what },
      { title: 'Revelations', items: r.reveals },
      { title: 'Real-world history', text: r.realWorld },
      {
        title: 'Reading',
        items: r.readings?.map((reading) => ({
          label: CONFIDENCE_LABEL[reading.confidence].label,
          color: CONFIDENCE_HUE[reading.confidence],
          text: reading.text,
        })),
      },
    ],
    people: r.people,
    links: r.links,
  })),
  people: people.map((p) => ({
    name: p.name,
    group: p.group,
    role: p.role,
    bio: p.bio,
    image: characterImage(p.name),
    imageCredit: p.art,
    sex: p.sex,
    part: p.intro,
    sections: p.real ? [{ title: 'Real-world counterpart', text: p.real }] : [],
  })),
  threads,
  glossary: glossary.map((t) => ({
    id: t.id,
    term: t.term,
    aliases: t.aliases,
    origin: t.origin,
    definition: t.definition,
    part: t.volume,
    tags: [...(t.volume != null ? ['The novel’s own term'] : []), ...(t.general ? ['General reference'] : [])],
  })),
  lane: {
    title: 'Real history',
    textLabel: 'What really happened',
    noteLabel: 'In the novel',
    kinds: (Object.keys(TREATMENT_LABEL) as Treatment[]).map((id) => ({ id, name: TREATMENT_LABEL[id], color: TREATMENT_HUE[id] })),
    items: realHistory.map((r) => ({
      id: r.id,
      // An entry known only to the month is dated to the month.
      date: r.precision === 'month' ? r.date.slice(0, 7) : r.date,
      title: r.title,
      text: r.real,
      note: r.novel,
      kind: r.treatment,
      events: r.counterparts,
      major: r.major,
    })),
  },
};

// Through the same loader as an imported file: it fills defaults and checks every reference.
const parsed = parseDoc(source);
if (import.meta.env.DEV) {
  const problems = [
    ...parsed.warnings,
    ...unmatchedImages(new Set(parsed.doc.events.map((ev) => ev.id))).map((file) => `assets/events/${file}: no event with this id.`),
    ...unmatchedPortraits(people.map((p) => p.name)).map((file) => `assets/characters/${file}: no character with this name.`),
  ];
  if (problems.length) console.error('Demo data problems:\n  ' + problems.join('\n  '));
}

/** The Modern Villainess demo as a document. */
export const demoDoc: TimelineDoc = parsed.doc;

/** The demo without its pictures: the sample file offered for download, which must not carry the books' artwork. */
export function sampleDoc(): TimelineDoc {
  return {
    ...demoDoc,
    events: demoDoc.events.map(({ image: _image, ...ev }) => ev),
    people: demoDoc.people.map(({ image: _image, imageCredit: _credit, ...p }) => p),
  };
}
