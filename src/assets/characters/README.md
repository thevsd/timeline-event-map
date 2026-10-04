# Character portraits

Drop an image here to give a character a portrait on the Characters tab and on their page.

- **Name** the file after the character, in lower case with hyphens: `keikain-runa.webp`, `professor-kanbe.jpg`. The name must match a profile in `src/data/people.ts`.
- **Formats:** webp, avif, jpg, png.
- **Size:** about 400 × 500 px, portrait. The image is cropped to fill from the top (`object-fit: cover`), so keep the face in the upper half.
- **Weight:** aim for under 40 KB each; the release build inlines every image into the single HTML file.

Characters without a file show the male or female placeholder from `src/assets/placeholders/`, chosen by the `sex` field of their profile. A file that matches no character is reported in the browser console while running `npm run dev`.

Portraits cropped from the published books are the publisher's artwork. They are fine for a copy you keep to yourself; do not publish them. For that reason this folder's images are listed in `.gitignore`.
