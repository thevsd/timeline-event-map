import { useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { demoDoc, sampleDoc } from '../../data';
import { DocError, type ParseResult } from '../../model/parse';
import type { TimelineDoc } from '../../model/schema';
import { exportJson, readFile } from '../../store/export';
import { AI_PROMPT, excerptOf } from './guide';

interface HomeProps {
  /** The timeline being edited in this browser, if there is one. */
  draft: TimelineDoc | null;
  onOpenDemo(): void;
  onOpenDraft(): void;
  onDiscardDraft(): void;
  /** Start an empty timeline with this title. */
  onCreate(title: string): void;
  /** Open an imported file. `warnings` lists what the loader repaired. */
  onImport(result: ParseResult): void;
}

const FEATURES: { title: string; text: string }[] = [
  { title: 'A timeline that zooms', text: 'From decades down to single days. Cards grow from a title to an illustrated summary as room allows, and fold into “+N more” where it does not.' },
  { title: 'Connections', text: 'Select an event and lines run to the events it leads to and comes from.' },
  { title: 'Threads', text: 'Follow one storyline: its events joined by a numbered path, everything else out of the way.' },
  { title: 'People', text: 'Everyone gets a page with a portrait and every event they appear in. Narrow the timeline to one person.' },
  { title: 'Glossary', text: 'Define a term once. It is underlined wherever the text mentions it, with the definition on hover.' },
  { title: 'A second lane', text: 'A smaller timeline above the main one, for a parallel sequence: real history beside a story, releases beside development.' },
  { title: 'Reading progress', text: 'Split the timeline into parts and readers can hide whatever lies beyond the part they have reached.' },
  { title: 'Search', text: 'One box for events, people, threads and terms. It forgives accents and typos, and ranks titles first.' },
  { title: 'One file, no server', text: 'Export the finished timeline as a single web page that opens anywhere, or as JSON to keep working on.' },
];

const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

/** What a document holds, in a line. */
function summaryOf(doc: TimelineDoc): string {
  return [plural(doc.events.length, 'event'), plural(doc.people.length, 'person', 'people'), plural(doc.threads.length, 'thread'), plural(doc.glossary.length, 'term')].join(' · ');
}

/**
 * The home page: what the app does, the demo, and the three ways to start a timeline of one's
 * own (from nothing, from a file, or from JSON an AI model wrote).
 */
export function Home({ draft, onOpenDemo, onOpenDraft, onDiscardDraft, onCreate, onImport }: HomeProps) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const excerpt = useMemo(() => excerptOf(demoDoc), []);

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      onImport(await readFile(file));
      setProblem('');
    } catch (error) {
      setProblem(error instanceof DocError ? error.message : 'That file could not be read.');
    }
  };
  const onDrop = (ev: DragEvent) => {
    ev.preventDefault();
    setDragging(false);
    void importFile(ev.dataTransfer.files[0]);
  };
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setProblem('The prompt could not be copied. Select it below and copy it by hand.');
    }
  };

  return (
    <main
      className={dragging ? 'home is-dragging' : 'home'}
      onDragOver={(ev: DragEvent) => {
        ev.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <header className="hero-head">
        <span className="moon big" aria-hidden="true" />
        <div>
          <h1>Timeline Event Map</h1>
          <p>
            Lay out a story, a project or a stretch of history on a timeline you can zoom, filter and follow. There is no account and no server:
            a timeline is one file, and it stays yours.
          </p>
        </div>
      </header>

      <section className="starts" aria-label="Start">
        <article className="start demo">
          <span className="kicker">Demo</span>
          <h2>{demoDoc.title}</h2>
          <p>
            The light novel’s first five volumes, mapped event by event against the real financial history they rewrite. Every feature below is in
            use here.
          </p>
          <span className="meta">{summaryOf(demoDoc)}</span>
          <button type="button" className="textbtn primary" id="open-demo" onClick={onOpenDemo}>
            Explore the demo
          </button>
        </article>

        <article className="start">
          <span className="kicker">Start from nothing</span>
          <h2>New timeline</h2>
          <p>Name it, then add events, people and terms as you go. Your work is kept in this browser until you export it.</p>
          <form
            className="newform"
            onSubmit={(ev: FormEvent) => {
              ev.preventDefault();
              onCreate(title);
            }}
          >
            <input id="new-title" type="text" placeholder="Title of your timeline" aria-label="Title of your timeline" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button type="submit" className="textbtn primary" id="create">
              Create
            </button>
          </form>
        </article>

        <article className="start">
          <span className="kicker">Start from a file</span>
          <h2>Import</h2>
          <p>Open a .json timeline, or a web page exported from here. Drop the file anywhere on this page, or choose it.</p>
          <button type="button" className="textbtn primary" id="import" onClick={() => picker.current?.click()}>
            Choose a file
          </button>
          <input
            ref={picker}
            id="import-file"
            type="file"
            accept=".json,.html,application/json,text/html"
            hidden
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </article>

        {draft && (
          <article className="start draft">
            <span className="kicker">Your draft</span>
            <h2>{draft.title}</h2>
            <p>Kept in this browser. Export it from the Share menu to have a file.</p>
            <span className="meta">{summaryOf(draft)}</span>
            <div className="startactions">
              <button type="button" className="textbtn primary" id="open-draft" onClick={onOpenDraft}>
                Continue
              </button>
              <button type="button" className="textbtn danger" id="discard-draft" onClick={onDiscardDraft}>
                Discard
              </button>
            </div>
          </article>
        )}
      </section>
      {problem && (
        <p className="homeproblem" role="alert">
          {problem}
        </p>
      )}

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="sectiontitle">
          What a timeline can do
        </h2>
        <div className="features">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="feature">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="ai-title" className="aiguide">
        <div>
          <h2 id="ai-title" className="sectiontitle">
            Let an AI model draft it
          </h2>
          <ol>
            <li>Copy the prompt and add your subject to it, along with any notes or source text you have.</li>
            <li>Give it to the model of your choice and save its reply as a .json file.</li>
            <li>Import the file here. The loader repairs small mistakes and tells you what it changed.</li>
            <li>Check and correct the result in the app, then export it.</li>
          </ol>
          <div className="startactions">
            <button type="button" className="textbtn primary" id="copy-prompt" onClick={() => void copyPrompt()}>
              {copied ? 'Prompt copied' : 'Copy the prompt'}
            </button>
            <button type="button" className="textbtn" id="download-sample" onClick={() => exportJson(sampleDoc())}>
              Download the full sample (.json)
            </button>
          </div>
          <p className="fine">
            The full sample is the demo as a file: {summaryOf(demoDoc)}, without its pictures. Shortcuts once a timeline is open: <kbd>Ctrl</kbd>+
            <kbd>Insert</kbd> adds to the current tab, <kbd>Ctrl</kbd>+<kbd>&gt;</kbd> starts thread mode, <kbd>Ctrl</kbd>+<kbd>K</kbd> searches.
          </p>
        </div>
        <div className="sample">
          <span className="kicker">A cut-down sample: {demoDoc.title}</span>
          <pre tabIndex={0}>{excerpt}</pre>
        </div>
      </section>

      <details className="promptbox">
        <summary>Read the prompt and the file format</summary>
        <pre tabIndex={0}>{AI_PROMPT}</pre>
      </details>
    </main>
  );
}
