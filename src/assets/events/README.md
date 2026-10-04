# Event images

Drop an image here to replace an event's pictogram.

- **Name** the file after the event id: `kaitaku.webp`, `sept11.jpg`. Ids are the `id` fields in `src/data/events/*.ts`.
- **Formats:** webp, avif, jpg, png, gif, svg.
- **Size:** about 800 × 320 px, landscape. The image is cropped to fill (`object-fit: cover`), so keep the subject near the centre.
- **Weight:** aim for under 60 KB each. The release build inlines every image into the single HTML file, so 126 large images would make it very heavy.

Events without a file keep their pictogram. A file whose name matches no event is reported in the browser console while running `npm run dev`.

Only add images you have the right to publish: this folder is committed to the repository.
