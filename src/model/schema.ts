/**
 * The timeline document: everything a timeline is, as one JSON value.
 *
 * This is the format the app imports, exports and embeds in an exported page. The loader
 * (model/parse.ts) accepts looser input than these types and fills in what is missing, so a
 * hand-written or AI-written file needs only `title` and `events` to work.
 */

export const FORMAT = 'timeline-event-map';
export const VERSION = 1;

/** Colours an author can pick. Each has a light and a dark value in app.css (`--hue-*`). */
export const HUES = ['blue', 'orange', 'green', 'yellow', 'pink', 'indigo', 'teal', 'red', 'brown', 'gray'] as const;
export type Hue = (typeof HUES)[number];

/** A short label shown as a chip, optionally coloured. */
export interface Tag {
  label: string;
  color?: Hue;
}

/** A list entry that carries a label, e.g. how well a reading is supported. */
export interface LabelledItem {
  label: string;
  text: string;
  color?: Hue;
}

/** A titled block of an event or person page: a paragraph, a bullet list, or both. */
export interface Section {
  title: string;
  text?: string;
  items?: (string | LabelledItem)[];
}

export interface CategoryDoc {
  id: string;
  name: string;
  color: Hue;
  /** One or two characters shown beside the colour, so identity never rests on colour alone. Defaults to the name's initial. */
  glyph?: string;
}

/** A group of people, e.g. a family or a faction. */
export interface GroupDoc {
  id: string;
  name: string;
  color?: Hue;
}

export interface EventDoc {
  /** Unique key; also used in links and deep links. */
  id: string;
  title: string;
  /** YYYY, YYYY-MM or YYYY-MM-DD. Omitted: the event sits in the undated zone before the axis. */
  date?: string;
  /** End of an event that spans a period. */
  endDate?: string;
  /** Position among the undated events; lower comes first. */
  order?: number;
  /** Date as displayed. Defaults to the date written out. */
  when?: string;
  /** A remark under the date, e.g. how it was worked out. */
  dateNote?: string;
  /** 1-based index into the document's `parts`. */
  part?: number;
  /** Where in the source it happens, e.g. "Ch. 2". */
  source?: string;
  /** A category id. */
  category: string;
  /** One or two sentences for the card and the hover preview. */
  summary: string;
  /** Picture: a data: or https: URL. */
  image?: string;
  /** Pictogram shown when there is no image (see art/motifs.ts). */
  motif?: string;
  /** A key figure overlaid on the picture, e.g. "¥800bn". */
  figure?: string;
  /** Placed first by the layout, so it gets an illustrated card when space allows. */
  featured?: boolean;
  tags?: Tag[];
  /** May carry spoiler markers (see lib/spoilers.ts), as may person bios and the other long texts. */
  sections?: Section[];
  /** Names of the people involved. */
  people?: string[];
  /** Ids of connected events. */
  links?: string[];
}

export interface PersonDoc {
  /** Unique; events refer to people by name. */
  name: string;
  /** A group id. */
  group?: string;
  /** One line: who they are. */
  role?: string;
  bio?: string;
  /** Portrait: a data: or https: URL. */
  image?: string;
  imageCredit?: string;
  /** Picks the placeholder shown without a portrait; omitted shows initials. */
  sex?: 'm' | 'f';
  /** Part in which they first appear; hidden from readers who are not there yet. */
  part?: number;
  sections?: Section[];
}

/** A storyline: events joined by a numbered path. */
export interface ThreadDoc {
  id: string;
  name: string;
  summary?: string;
  /** Event ids; shown in chronological order whatever the order here. */
  events: string[];
}

export interface TermDoc {
  id: string;
  term: string;
  /** Other spellings to match in text. */
  aliases?: string[];
  /** The term in its original language, or what an abbreviation stands for. */
  origin?: string;
  definition: string;
  /** Part that introduces the term; hidden until then. */
  part?: number;
  tags?: string[];
}

/** A kind of lane entry, with its colour: "Preserved", "Altered" and so on. */
export interface LaneKind {
  id: string;
  name: string;
  color: Hue;
}

export interface LaneItemDoc {
  id: string;
  /** YYYY, YYYY-MM or YYYY-MM-DD. */
  date: string;
  title: string;
  /** Main text of the entry. */
  text?: string;
  /** Second text, e.g. how the story treats it. */
  note?: string;
  /** A kind id. */
  kind?: string;
  /** Ids of the main-timeline events it relates to. */
  events?: string[];
  /** Shows its label before its neighbours when space is short. */
  major?: boolean;
}

/** The second, smaller timeline above the cards. A document has at most one. */
export interface LaneDoc {
  title: string;
  /** Headings of the entry page's two texts. */
  textLabel?: string;
  noteLabel?: string;
  kinds: LaneKind[];
  items: LaneItemDoc[];
}

/** A stretch of the axis to hatch out, with a caption: time the timeline does not cover. */
export interface GapDoc {
  from: string;
  to: string;
  label?: string;
  note?: string;
}

export interface TimelineDoc {
  format: typeof FORMAT;
  version: typeof VERSION;
  title: string;
  subtitle?: string;
  /** Ordered parts of the source (volumes, seasons, acts). Enables jump buttons and the reading-progress guard. */
  parts: string[];
  /** Caption of the zone that holds undated events. */
  undated?: { label?: string; note?: string };
  /** An event the others count down to. `label` completes "N days before …"; `jump` names its jump button. */
  countdown?: { event: string; label: string; jump?: string };
  gaps: GapDoc[];
  categories: CategoryDoc[];
  groups: GroupDoc[];
  events: EventDoc[];
  people: PersonDoc[];
  threads: ThreadDoc[];
  glossary: TermDoc[];
  lane?: LaneDoc;
}
