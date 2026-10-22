# timeline-event-map

A timeline event map webapp. Build a timeline in the browser or import one as JSON, then export it as a single web page. The app runs without a server; an optional account server in `server/` adds sign-in.

It ships with a demo: the storyline of *Modern Villainess* (English Vols. 1–7), mapped against the real financial history it rewrites.

## Features

- **Home page:** open the demo, start a new timeline, import a file, or, when signed in, open one from `My timelines`. It also carries a prompt for an AI model and a sample file. `← Home` in the toolbar returns to it, as does the browser's Back button.
- **Pictograms:** every event gets a picture from a library of 161 pictograms, in a colour, theme and scene of your choice; a picture from the web can take its place.
- **Timeline:** zoom from decades down to days; cards grow from a title to an illustrated summary as space allows. Where even titles do not fit, the rest fold into a `+N more` badge; click it to zoom in. Events without a date sit in an undated zone before the axis.
- **Connections:** selecting an event draws lines to the events it links to (solid) and from the events that link to it (dashed).
- **Threads:** pick a storyline to show only its events, joined by a numbered path.
- **People:** the cast in groups, each with a page listing their events; the timeline can be narrowed to one person.
- **Glossary:** its own tab; terms are also underlined in the side panel, with the definition on hover.
- **Second lane:** one smaller timeline above the cards for a parallel sequence (the demo's real history), each entry tied to the events it relates to.
- **Reading progress:** a timeline split into parts (volumes, seasons, acts) can hide everything beyond the part a reader has reached. Kept in the browser, never part of a link.
- **Search:** one box for events, people, threads, lane entries and terms (`Ctrl+K` or `/`). Every word must match; accents and case are ignored and near misses are forgiven.
- **Editing:** forms in the side panel for events, people, terms, threads, lane entries and the timeline's settings, with undo and redo.
- **Import and export:** JSON in and out, with or without the stored pictures; export to one self-contained HTML page. The Share menu shows what each file will weigh.
- **Links:** the address bar always holds a link to the current view, selection and filters.
- **Corporate map:** who owns, funds or pressures whom. Part of the demo only.
- **Theme:** light or dark, following the system setting.
- **Accounts:** sign up with a username and password (no email), with a recovery code shown once in place of a reset email. The home page shows `Sign in` only when the account server answers.
- **Saving:** `Save` (or `Ctrl+S`) keeps the timeline in the account. Saving the demo or an exported page makes a copy of your own and asks for its name, which becomes the timeline's title. A line under the title says where it stands: `Saved to your account`, `Unsaved changes` or `Sign in to save`. `My timelines` on the home page lists them newest first; each row's `…` menu renames, pins, exports or deletes it. Pinned timelines always show; with more than three, the rest fold into a closed `More timelines` section, or, when nothing is pinned, the whole list folds under its `My timelines (N)` heading. Nothing is kept in the browser: leaving with unsaved changes asks first (save, sign in, download a copy, or leave), and closing the tab gets the browser's own warning.

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

Export to HTML works wherever the built app runs: a hosted site, `npm run preview`, or `dist/index.html` opened from disk. The dev server serves the app as loose modules, which cannot be packed into one file, so there the menu item explains this and JSON export is the way out.

### Account server

Optional: without it the app works as before and hides `Sign in`. It is ASP.NET Core 8 with Identity, Postgres and cookie sessions, in `server/`. Requires the [.NET 8 SDK](https://dotnet.microsoft.com/download) and a running Postgres.

```
cd server
dotnet user-secrets set "ConnectionStrings:Db" "Host=localhost;Database=timeline;Username=postgres;Password=…"
dotnet user-secrets set "Altcha:Key" "<64 random bytes, base64>"
dotnet run         # http://localhost:5137; applies migrations on start
```

`npm run dev` forwards `/api` to it, so the page and the API share one address and the session cookie works.

- **Captcha:** sign-up, sign-in and reset each need a solved [ALTCHA](https://altcha.org) proof of work, issued and checked by the server itself. `Altcha:Key` signs the challenges; every replica needs the same one.
- **Throttling:** per IP, never per account, so no one can lock someone else out. Sign-up allows 5 an hour; sign-in and reset share 10 attempts per 15 minutes, then a timeout that grows (1, 2, 15, 30 minutes). The numbers are constants in `server/LoginThrottle.cs`. The counters live in memory: a restart resets them.
- **Passwords:** 10 characters or more, refused if on `server/common-passwords.txt`. No composition rules.
- **Trying it:** `bash server/smoke.sh` runs the whole flow against a running server (and uses up this IP's sign-in budget). `server/auth.http` sends requests by hand; `server/solve-altcha.sh` prints a solved captcha for it.
- **Schema changes:** `dotnet tool restore`, then `dotnet ef migrations add <Name>` in `server/`.

## Hosting

The build is one static file. Put `dist/index.html` on any static host; there is nothing to configure. To offer accounts, serve the page and the account server from one address, with `/api` routed to the server.

- **Export needs nothing from the host.** A visitor's exported page is a copy of the hosted page with their timeline embedded. It is made from the page's own source, fetched again, so nothing a browser extension added to the open page ends up in the file. Scripts from other origins (an analytics beacon the host injects) are left out.
- **An exported page is the whole app.** It opens offline, can be edited and exported again, and can itself be hosted. Expect about 0.7 MB plus the timeline's own data and [portraits](#pictures).
- **Timelines stay with the visitor or their account.** Nothing is kept in the browser between visits, so a shared computer shows no one else's work. A visitor without an account exports a file; with the account server, saved timelines live in its Postgres, only ever served to their owner.
- **Build without the portraits** (see below): deploy from a clean clone, or let the host build from the repository.

## How a timeline is stored

A timeline is one JSON document (`src/model/schema.ts`). Everything else derives from it:

```
document ──parse──▶ checked document ──worldOf(progress)──▶ world ──▶ engine and components
```

- **`model/parse.ts`** accepts loose input. Only `title` and `events` are needed; missing categories, people and ids are created, and anything it cannot use is dropped with a warning rather than failing the import.
- **`model/world.ts`** resolves the document for a reader at a given part: dates to day numbers, ids to records, later parts removed.
- **`model/edit.ts`** holds the edits as pure functions that return a new document, which is what makes undo and redo simple.

Where a timeline comes from:

| Origin | Source | Edits |
|---|---|---|
| Demo | built from `src/data/` | kept until left; `Save` stores a copy in the account |
| Account | the `Timelines` table of the account server (`server/Timelines.cs`), one row per timeline, up to 10 MB | stored on `Save` |
| New or imported | nowhere yet | kept until left; `Save` stores it in the account |
| Exported page | embedded in the page itself | kept until left; `Save` stores a copy where an account server answers |

Unsaved edits live only in the open tab. Leaving them asks first; see [Features](#features).

### Document format

```jsonc
{
  "format": "timeline-event-map",
  "version": 1,
  "title": "…",
  "parts": ["Vol. 1", "Vol. 2"],        // optional; enables jump buttons and reading progress
  "categories": [{ "id": "politics", "name": "Politics", "color": "orange", "glyph": "P" }],
  "groups": [{ "id": "family", "name": "The family", "color": "pink" }],
  "events": [{
    "id": "bank-takeover", "title": "…", "date": "1997-11-17", "category": "politics",
    "summary": "…", "part": 1, "people": ["Full Name"], "links": ["another-event-id"],
    "motif": "bank",
    "sections": [{ "title": "What happens", "items": ["…"] }]
  }],
  "people": [{ "name": "Full Name", "role": "…", "group": "family", "bio": "…" }],
  "threads": [{ "id": "the-takeover", "name": "The takeover", "events": ["bank-takeover"] }],
  "glossary": [{ "id": "convoy-system", "term": "Convoy system", "definition": "…" }],
  "lane": {
    "title": "Real history",
    "kinds": [{ "id": "preserved", "name": "Preserved", "color": "green" }],
    "items": [{ "id": "r-1", "date": "1997-11", "title": "…", "kind": "preserved", "events": ["bank-takeover"] }]
  }
}
```

- **Dates** are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; a leading minus is BC. An event without a date is undated.
- **Colours** are `blue`, `orange`, `green`, `yellow`, `pink`, `indigo`, `teal`, `red`, `brown`, `gray`.
- **Pictures:** an event names a pictogram (`motif`) and may link a picture (`image`, an `https:` URL); a person's `image` is a `data:` or `https:` URL. See [Pictures](#pictures).
- The full field reference is `src/model/schema.ts`. The home page offers the demo as a sample file and a prompt that describes the format to an AI model.

### Spoiler markers

Reading progress hides whole events, people and terms by their `part`. Where a text that belongs to an earlier part mentions something from a later one, mark it: everything after `{p3}`, up to the next marker, is shown only to a reader who has reached part 3, and `{p1}` returns to text anyone may see. `{v3}` is accepted as another spelling.

```
"bio": "Died by apparent suicide.{p2} Volume 2 reveals who pushed him to it."
```

Markers work in the long texts: sections, roles and bios, thread summaries, lane texts and definitions. Titles, summaries and dates cannot carry them.

## Editing in the app

`Edit` in the toolbar switches editing on. Each tab then has an add button, and every page in the side panel has an `Edit` button. The shortcuts that change the timeline switch editing on themselves.

| Shortcut | Action |
|---|---|
| `Ctrl+Insert` | add an event, person or term, depending on the tab |
| `Ctrl+>` | thread mode: click cards in order, then save and name the thread |
| `Ctrl+Enter` | save the open form |
| `Ctrl+S` | save the timeline to the account |
| `Ctrl+Z`, `Ctrl+Shift+Z` | undo, redo |
| `Ctrl+K` or `/` | search |
| `←` `→` | previous or next event while one is open; otherwise pan |
| `+` `-` | zoom the timeline |
| `Esc` | leave thread mode, or close the side panel |

A name typed into a form that does not exist yet (a person, a category, a group, a term, a thread) can be created on the spot from a small dialog.

## Pictures

### Events: pictograms

An event's picture is a pictogram. The Picture field of the event form is one row showing the current choice; clicked, it opens a searchable library of 161 pictograms in nine groups, with a live preview, and three ways to paint the one chosen:

| Option | Values | Default |
|---|---|---|
| Colour | any of the ten colours | the colour of the event's category |
| Theme | `gradient`, `night`, `paper`, `solid` | `gradient` |
| Scene | `petals` (a pale moon and drifting petals), `stars`, `clouds`, `plain` | `petals` |

In a file:

```jsonc
"motif": "bank",
"art": { "color": "red", "theme": "night", "scene": "stars" }
```

A web address in `image` shows that picture in the pictogram's place. It adds nothing to the file but needs a connection; when it cannot be loaded, the pictogram shows.

Events take no uploaded pictures, so a timeline's size does not grow with its events: the whole library adds about 70 KB to the app. A file from an earlier version that stores a picture in an event (a `data:` URL) still shows it, and the form offers to remove it.

**Adding a pictogram:** add an entry to the group file it belongs to in `src/art/library/`. A pictogram is SVG on a 320×160 field, centred on (160, 85), using the shape classes that `.art` styles in `app.css` (`a` main shape, `b` and `c` lighter ones, `d` details, `s`/`sd`/`t` strokes). Colours come from CSS, so one drawing serves every colour and theme. Names are what files refer to: never rename one.

### People: portraits

A portrait is stored or linked (`src/store/images.ts`, `ImageField` in `components/editor/fields.tsx`):

- **Stored.** A chosen file is scaled to 480 px on its longest side and compressed as WebP until it is under 50 KB, stepping the quality down and then the size. It is kept in the document as a `data:` URL, at about a third more than the picture itself (base64).
- **Linked.** A pasted web address is kept as it is; a portrait that cannot be loaded gives way to the placeholder.

`Export data without pictures` in the Share menu leaves stored portraits out: the text alone is what an AI model can take.

## Structure

```
src/
  App.tsx        shell: home page or one open timeline; who is signed in; opening saved timelines
  Workspace.tsx  the timeline screen: tabs, filters, side panel, editing, shortcuts
  model/       the document: schema, loader, per-reader world, edits, event filter
  store/       import and export, picture limits, account and timeline calls to the server
  data/        the Modern Villainess demo, authored as typed records
    events/      event records, one file per volume
    index.ts     converts the records into a document
    corporate.ts nodes and edges of the corporate map (demo only)
  art/         the pictogram library (library/, one file per group), the picture generator, and the lookup for the demo's image files
  assets/events/      optional images for demo events
  assets/characters/  demo portraits (kept out of git, see below)
  assets/placeholders/  male.svg and female.svg, shown for people without a portrait
  engine/      the timeline itself: zoom model, card layout, canvas drawing, input (no framework)
  components/  toolbar, search box, rails, side panel and its pages
    editor/      forms, form fields and dialogs
    home/        home page, the AI prompt, the sign-in dialog and My timelines
    panel/       side-panel pages
  hooks/       useTimeline (mounts the engine), useDocument (document with undo and redo)
  lib/         dates, URL state, text matching, search, glossary matching, spoiler markers
  styles/      app.css (colour tokens, light and dark themes)
server/        the account server (ASP.NET Core): Program.cs setup, Auth.cs and Timelines.cs endpoints, LoginThrottle.cs, AppDb.cs and Migrations/
```

## Editing the demo

The demo is authored in `src/data/` and checked by the loader; problems are listed in the browser console while `npm run dev` is running.

- **Event:** append a record to the matching file in `src/data/events/`. Field reference: `src/data/types.ts`.
- **Image for an event:** put a file named after the event id in `src/assets/events/`. See the README in that folder.
- **Thread, person, glossary term, real-history entry:** `threads.ts`, `people.ts`, `glossary.ts`, `realHistory.ts`.
- **Portrait:** put a file named after the character in `src/assets/characters/`. See the README in that folder.
- **Corporate map:** `corporate.ts`. `since` and `until` are event ids, so the map's steps follow the timeline.

### Portraits and exported pages

The current portraits are cropped from the published books, so the folder's images are listed in `.gitignore` and stay on this computer.

An exported page is a copy of the built app, demo included. A build made on a computer that has the portraits therefore carries them inside every page it exports. Build from a clean clone before sharing an exported page.

## Links

State is kept in the URL hash, for example `#t=demo&z=2.3&d=1997-11-17&e=kaitaku&thread=accounting`:

| Key | Meaning |
|---|---|
| `t` | which timeline: `demo`, the id of one saved to the account (opens only for its owner), or `new` for an unsaved one (a reload goes home). A link without it opens the demo; an empty address opens the home page |
| `z`, `d` | zoom (pixels per day) and the date at the centre |
| `e` | selected event id |
| `p` | side-panel page: `person:Name`, `thread:id`, `lane:id`, `term:id`, `co:id` |
| `hide`, `q`, `who`, `thread` | filters: hidden categories, text, person, thread |
| `lane=0` | second lane hidden |
| `view` | tab: `cast`, `glossary`, or `map` with `step` (demo) |

Older links still work: a bare `#kaitaku`, `p=real:id` and `cat=`. A link to something beyond the viewer's reading progress opens without it.
