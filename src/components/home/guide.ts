import type { TimelineDoc } from '../../model/schema';

/**
 * A prompt to hand to an AI model, with the file format spelled out. The loader forgives a
 * good deal (see model/parse.ts), so the description sticks to what matters.
 */
export const AI_PROMPT = `Create a timeline as one JSON object in the "timeline-event-map" format described below. Reply with the JSON only, no commentary.

Subject: <say what the timeline should cover, and how detailed it should be>

FORMAT
{
  "format": "timeline-event-map",
  "version": 1,
  "title": "…",
  "subtitle": "…",                          // optional, one line
  "parts": ["Vol. 1", "Vol. 2"],            // optional: ordered volumes, seasons or acts
  "categories": [                           // every event has one
    { "id": "politics", "name": "Politics", "color": "orange", "glyph": "P" }
  ],
  "groups": [ { "id": "family", "name": "The family", "color": "pink" } ],   // optional: groups of people
  "events": [
    {
      "id": "bank-takeover",                // unique, lower-case words joined by hyphens
      "title": "…",
      "date": "1997-11-17",                 // YYYY, YYYY-MM or YYYY-MM-DD; leave out for undated background
      "endDate": "1997-12-02",              // optional: for an event that lasts
      "category": "politics",               // a category id
      "summary": "One or two sentences.",
      "part": 1,                            // optional: 1-based index into "parts"
      "source": "Ch. 2",                    // optional
      "featured": true,                     // optional: only for the most important events
      "figure": "¥800bn",                   // optional: one key number
      "tags": ["Real history"],             // optional
      "people": ["Full Name"],              // optional: names, spelled the same everywhere
      "links": ["another-event-id"],        // optional: ids of connected events
      "sections": [                         // optional: the body of the event's page
        { "title": "What happens", "items": ["A point.", "Another point."] },
        { "title": "Background", "text": "A paragraph." }
      ]
    }
  ],
  "people": [ { "name": "Full Name", "role": "One line", "group": "family", "bio": "…", "sex": "f" } ],
  "threads": [ { "id": "the-takeover", "name": "The takeover", "summary": "…", "events": ["bank-takeover", "…"] } ],
  "glossary": [ { "id": "convoy-system", "term": "Convoy system", "aliases": ["convoy"], "definition": "…" } ],
  "lane": {                                 // optional: a second, smaller timeline shown above the main one
    "title": "Real history",
    "kinds": [ { "id": "preserved", "name": "Preserved", "color": "green" } ],
    "items": [ { "id": "r-1", "date": "1997-11", "title": "…", "text": "…", "note": "…", "kind": "preserved", "events": ["bank-takeover"] } ]
  }
}

RULES
- Colours: blue, orange, green, yellow, pink, indigo, teal, red, brown, gray.
- Use 3 to 7 categories. Give every event exactly one.
- Every id in "links", in a thread's "events" and in a lane item's "events" must be the id of an event in the file.
- Dates: use the precision you actually know. Do not invent days.
- Keep summaries to one or two sentences; put detail in "sections".
- Glossary terms are underlined automatically wherever an event's text mentions them, so define the terms a newcomer would not know.
- Output valid JSON: double quotes, no comments, no trailing commas.`;

/** A cut-down copy of a document, small enough to read: a couple of each kind of entry. */
export function excerptOf(doc: TimelineDoc): string {
  const events = doc.events.filter((ev) => ev.date && ev.people?.length && ev.links?.length).slice(4, 6);
  const names = new Set(events.flatMap((ev) => ev.people ?? []));
  const sample = {
    format: doc.format,
    version: doc.version,
    title: doc.title,
    subtitle: doc.subtitle,
    parts: doc.parts,
    categories: doc.categories.slice(0, 2),
    groups: doc.groups.slice(0, 1),
    events: events.map(({ image: _image, ...ev }) => ({ ...ev, sections: ev.sections?.slice(0, 1).map((s) => ({ ...s, items: s.items?.slice(0, 2) })) })),
    people: doc.people.filter((p) => names.has(p.name)).slice(0, 1).map(({ image: _image, imageCredit: _credit, ...p }) => p),
    threads: doc.threads.slice(0, 1).map((t) => ({ ...t, events: t.events.slice(0, 3) })),
    glossary: doc.glossary.slice(0, 1),
    lane: doc.lane && { ...doc.lane, kinds: doc.lane.kinds.slice(0, 2), items: doc.lane.items.slice(0, 1) },
  };
  return JSON.stringify(sample, null, 2);
}
