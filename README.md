# timeline-event-map
A timeline event map webapp, specifically made for Modern Villainesss's intricate storyline

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
  data/        event records (one file per volume), types, labels, validation
  art/         pictogram illustrations
  engine/      the timeline itself: zoom model, card layout, canvas drawing, input (no framework)
  components/  React shell: toolbar, filters, detail panel, hover preview
  hooks/       useTimeline: mounts the engine inside React
  styles/      app.css (colour tokens, light and dark themes)
```

To add an event, append a record to the matching file in `src/data/events/`. Field reference: `src/data/types.ts`.
