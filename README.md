# timeline-event-map
A timeline event map webapp, specifically made for Modern Villainesss's intricate storyline

## Features

- **Timeline:** zoom from quarters down to days; cards grow from a title to an illustrated summary as space allows. Where even titles do not fit, the rest fold into a `+N more` badge; click it to zoom in.
- **Connections:** selecting an event draws lines to the events it links to (solid) and from the events that link to it (dashed).
- **Threads:** pick a storyline to show only its events, joined by a numbered path.
- **People:** every name opens a profile with that person's events; the timeline can be narrowed to one person.
- **Real history:** a lane above the cards marks the real-world events the novel preserves, alters, prevents or moves, each tied to the scene that answers it.
- **Corporate map:** who owns, funds or pressures whom, stepped through in story order.
- **Links:** the address bar always holds a link to the current view, selection and filters (`Copy link`).

## Development

Requires [Node.js](https://nodejs.org) (current LTS).

```
npm install        # once
npm run dev        # dev server with hot reload
npm run typecheck  # TypeScript only
npm run build      # type-check, then build dist/index.html (one self-contained file)
npm run release    # build, then copy the page to Output/Modern_Villainess_Timeline.html
```

`Output/` is the published copy and changes only through `npm run release`.

## Structure

```
src/
  data/        the content
    events/      event records, one file per volume
    threads.ts   storylines across volumes
    people.ts    character profiles
    realHistory.ts  real-world events for the history lane
    corporate.ts    nodes and edges of the corporate map
    index.ts     loads, sorts and cross-references all of the above
    validate.ts  checks ids and references (runs in `npm run dev`; problems go to the browser console)
  art/         pictogram illustrations, and the lookup for real images
  assets/events/  optional real images, one per event
  engine/      the timeline itself: zoom model, card layout, canvas drawing, input (no framework)
  components/  React shell: toolbar, filters, side panel and its pages, hover preview, corporate map
  hooks/       useTimeline: mounts the engine inside React
  lib/         dates, URL state, corporate-map state
  styles/      app.css (colour tokens, light and dark themes)
```

## Editing the content

Everything below is checked while `npm run dev` is running; mistakes are listed in the browser console.

- **Event:** append a record to the matching file in `src/data/events/`. Field reference: `src/data/types.ts`.
- **Image for an event:** put a file named after the event id in `src/assets/events/`, e.g. `kaitaku.webp`. See the README in that folder for sizes.
- **Thread:** add an entry to `src/data/threads.ts` with the ids of its events; order does not matter.
- **Person:** add a profile to `src/data/people.ts`. The name must match the spelling used in the events' `people` lists.
- **Real-history entry:** add a record to `src/data/realHistory.ts` and list the events that answer it in `counterparts`.
- **Corporate map:** add nodes and edges to `src/data/corporate.ts`. `since` and `until` are event ids, so the map's steps follow the timeline.

## Links

State is kept in the URL hash, for example `#z=2.3&d=1997-11-17&e=kaitaku&thread=accounting`:

| Key | Meaning |
|---|---|
| `z`, `d` | zoom (pixels per day) and the date at the centre |
| `e` | selected event id |
| `p` | side-panel page: `person:Name`, `thread:id`, `real:id`, `co:id` |
| `cat`, `q`, `who`, `thread` | filters: categories, search text, person, thread |
| `lane=0` | real-history lane hidden |
| `view=map`, `step` | corporate map and its step |

A bare `#kaitaku` still opens that event.
