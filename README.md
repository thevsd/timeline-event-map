# timeline-event-map

A zoomable timeline and event viewer for the storyline of *Modern Villainess: It's Not Easy Building a Corporate Empire Before the Crash* (Tofuro Futsukaichi). It covers English Volumes 1–5: from Runa's infancy to spring 2003, plus the 15 September 2008 frame scene. Full spoilers, gated by the reader's progress (see **Reading progress** below).

The app is a single self-contained HTML page: open it in a browser, no server needed.

## Features

- **Timeline:** zoom from quarters down to days; cards grow from a title to an illustrated summary as space allows. Where even titles do not fit, the rest fold into a `+N more` badge; click it to zoom in.
- **Connections:** selecting an event draws lines to the events it links to (solid) and from the events that link to it (dashed).
- **Threads:** pick a storyline to show only its events, joined by a numbered path.
- **People:** every name opens a profile with that person's events; the timeline can be narrowed to one person.
- **Real history:** a lane above the cards marks the real-world events the novel preserves, alters, prevents or moves, each tied to the scene that answers it.
- **Corporate map:** who owns, funds or pressures whom, stepped through in story order.
- **Characters:** the cast in groups, with a portrait where one exists and a male or female placeholder otherwise; each card opens that person's page.
- **Search:** one box for events, people, threads, companies, real history and the glossary (`Ctrl+K` or `/`). Every word must match; accents and case are ignored, a word found nowhere as typed is matched against near misses, and titles outrank body text. The last row narrows the timeline to the matching events.
- **Glossary:** terms of Japanese finance and politics are underlined in the side panel; hover for the definition, click for the page listing where the term comes up.
- **Reading progress:** `Read up to` hides everything from later volumes: events, characters, threads, map steps, real-history entries and the sentences that give later volumes away. The setting is kept in the browser and is never part of a link.
- **Links:** the address bar always holds a link to the current view, selection and filters (`Copy link`).
- **Theme:** light or dark, following the system setting.

### Keyboard

| Key | Action |
|---|---|
| `Ctrl+K` / `/` | search |
| `←` `→` | previous / next event while one is open; step the corporate map; otherwise pan |
| `+` `-` | zoom the timeline |
| `Esc` | close the side panel |

## Development

Requires [Node.js](https://nodejs.org) (current LTS).

```
npm install        # once
npm run dev        # dev server with hot reload
npm run typecheck  # TypeScript only
npm run build      # type-check, then build dist/index.html (one self-contained file)
npm run release    # build, then copy the page to Output/Modern_Villainess_Timeline.html
```

`Output/` is the published copy and changes only through `npm run release`; the script creates the folder if it is missing.

## Structure

```
Modern_Villainess_Context.md  the knowledge base behind the data: world, cast, real-world mappings, threads, open questions
EventMap/      chapter-by-chapter event maps, one per volume; the source the event records are written from
Legacy/        the earlier plain-JavaScript version (before the move to React), kept for reference
scripts/       release.mjs: copies the build to Output/
src/
  data/        the content
    events/      event records, one file per volume
    threads.ts   storylines across volumes
    people.ts    character profiles
    realHistory.ts  real-world events for the history lane
    corporate.ts    nodes and edges of the corporate map
    glossary.ts  terms and definitions
    index.ts     loads, sorts and cross-references all of the above
    world.ts     the data as a reader at a given volume may see it; components read from this
    validate.ts  checks ids, references and spoiler markers (runs in `npm run dev`; problems go to the browser console)
  art/         pictogram illustrations, and the lookup for real images
  assets/events/  optional real images, one per event
  assets/characters/  character portraits (kept out of git, see below)
  assets/placeholders/  male.svg and female.svg, shown for characters without a portrait
  engine/      the timeline itself: zoom model, card layout, canvas drawing, input (no framework)
  components/  React shell: toolbar, search box, filters, side panel and its pages, hover preview, corporate map, character list
  hooks/       useTimeline: mounts the engine inside React
  lib/         dates, URL state, corporate-map state, text matching, search, glossary matching, spoiler markers
  styles/      app.css (colour tokens, light and dark themes)
```

## Editing the content

Everything below is checked while `npm run dev` is running; mistakes are listed in the browser console.

- **Event:** append a record to the matching file in `src/data/events/`. Field reference: `src/data/types.ts`.
- **Image for an event:** put a file named after the event id in `src/assets/events/`, e.g. `kaitaku.webp`. See the README in that folder for sizes.
- **Thread:** add an entry to `src/data/threads.ts` with the ids of its events; order does not matter.
- **Person:** add a profile to `src/data/people.ts`. The name must match the spelling used in the events' `people` lists; `sex` picks the placeholder; `intro` is the volume they first appear in.
- **Portrait:** put a file named after the character in `src/assets/characters/`, e.g. `keikain-runa.webp`. See the README in that folder. The current portraits are cropped from the published books, so the folder's images are listed in `.gitignore` and stay on this computer.
- **Real-history entry:** add a record to `src/data/realHistory.ts` and list the events that answer it in `counterparts`.
- **Corporate map:** add nodes and edges to `src/data/corporate.ts`. `since` and `until` are event ids, so the map's steps follow the timeline.
- **Glossary term:** add an entry to `src/data/glossary.ts`. List other spellings in `aliases`; a term the novel invents takes the `volume` that introduces it.

### Spoiler markers

Reading progress hides whole events by their `volume`. Where a text that belongs to an earlier volume mentions something from a later one, mark it: everything after `{v3}`, up to the next marker, is shown only to a reader who has reached Volume 3, and `{v1}` returns to text anyone may see.

```
bio: 'Died by apparent suicide.{v2} Volume 2 reveals who pushed him to it.'
role: 'Duke; uncle{v2}, guardian{v3} and then adoptive father'
```

Markers work in the long text fields: an event's `what`, `reveals`, `realWorld` and `readings`; a person's `role` and `bio`; a thread's `summary`; a real-history entry's `novel`; a company's `note`; a term's `definition`. Titles, briefs and dates cannot carry them, so keep those safe for the volume they belong to.

## Links

State is kept in the URL hash, for example `#z=2.3&d=1997-11-17&e=kaitaku&thread=accounting`:

| Key | Meaning |
|---|---|
| `z`, `d` | zoom (pixels per day) and the date at the centre |
| `e` | selected event id |
| `p` | side-panel page: `person:Name`, `thread:id`, `real:id`, `co:id`, `term:id` |
| `cat`, `q`, `who`, `thread` | filters: categories, text, person, thread |
| `lane=0` | real-history lane hidden |
| `view=map`, `step` | corporate map and its step |
| `view=cast` | Characters tab |

A bare `#kaitaku` still opens that event. A link to something beyond the viewer's reading progress opens without it.
