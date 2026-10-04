import type { MotifName } from '../art/motifs';

export type CategoryId = 'finance' | 'politics' | 'deals' | 'world' | 'personal' | 'shadow';

/** How an event's date was derived. */
export type DateBasis =
  | 'text' // given in the novel
  | 'real' // placed on the date of its real-world counterpart
  | 'estimate'; // estimated from the chapter's time span

/** Relation to real history. `story` is a character scene with no historical counterpart. */
export type HistoryStatus = 'real' | 'altered' | 'fiction' | 'story';

export type Confidence = 'strong' | 'plausible' | 'speculative';

/** An interpretive reading, labelled with how well the text supports it. */
export interface Reading {
  confidence: Confidence;
  text: string;
}

/** A Modern Villainess event as authored in `data/events/*`. `data/index.ts` turns these into the app's document format. */
export interface EventRecord {
  /** Unique key; also the deep-link hash and the illustration seed. */
  id: string;
  title: string;
  /** ISO start date. Omitted on backstory events. */
  date?: string;
  /** ISO end date, for events that span a period. */
  endDate?: string;
  /** Position in the backstory zone (1, 2, ...). Set instead of `date`. */
  backstoryOrder?: number;
  /** Date as displayed; approximate dates start with "c.". */
  when: string;
  basis: DateBasis;
  volume: number;
  chapter: string;
  category: CategoryId;
  motif: MotifName;
  /** Key figure shown on the illustration, e.g. "¥800bn". */
  figure?: string;
  history: HistoryStatus;
  /** Placed first by the layout, so it gets an illustrated card when space allows. */
  marquee?: boolean;
  /** One or two sentences for cards and the hover preview. */
  brief: string;
  /**
   * The long text fields below may carry spoiler markers (see lib/spoilers.ts) where a line
   * draws on a later volume. Titles, briefs and dates may not: the timeline draws them as they are.
   */
  what?: string[];
  reveals?: string[];
  realWorld?: string;
  readings?: Reading[];
  people?: string[];
  /** Ids of connected events. */
  links?: string[];
}
