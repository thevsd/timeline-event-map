import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useWorld } from '../context';
import { search, type Fragment } from '../lib/search';
import { LAST_VOLUME } from '../lib/spoilers';
import type { PanelPage } from '../types';

const KIND_LABEL: Record<PanelPage['kind'], string> = {
  event: 'Event',
  person: 'Person',
  thread: 'Thread',
  company: 'Company',
  real: 'Real history',
  term: 'Glossary',
};

function Marked({ parts }: { parts: Fragment[] }) {
  return <>{parts.map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : part.text))}</>;
}

interface SearchBoxProps {
  /** Open the page of the chosen result. */
  onPick(page: PanelPage): void;
  /** Narrow the timeline to the events that match this text. */
  onFilter(query: string): void;
}

/**
 * Search across events, people, threads, companies, real history and the glossary.
 *
 * Results appear as you type, best first. Up and Down move through them and Enter opens one; the
 * last row narrows the timeline to every matching event instead. Ctrl+K (Cmd+K) or "/" focuses the box.
 */
export function SearchBox({ onPick, onFilter }: SearchBoxProps) {
  const world = useWorld();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const outcome = useMemo(() => search(world, text), [world, text]);
  const { results, eventIds } = outcome;
  // The row after the results narrows the timeline; it is there whenever an event matches.
  const filterRow = eventIds.length > 0 ? results.length : -1;
  const rows = results.length + (filterRow >= 0 ? 1 : 0);
  const showing = open && text.trim() !== '';

  // Focus from anywhere: Ctrl+K or Cmd+K, or "/" outside a text field.
  useEffect(() => {
    const onKeyDown = (ev: globalThis.KeyboardEvent) => {
      const typing = ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement || ev.target instanceof HTMLTextAreaElement;
      const shortcut = (ev.key.toLowerCase() === 'k' && (ev.ctrlKey || ev.metaKey)) || (ev.key === '/' && !typing);
      if (!shortcut) return;
      ev.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // The list hangs from the box's left edge unless that would run it off the window.
  const [alignRight, setAlignRight] = useState(false);
  useLayoutEffect(() => {
    if (!showing || !input.current || !list.current) return;
    setAlignRight(input.current.getBoundingClientRect().left + list.current.offsetWidth > window.innerWidth - 12);
  }, [showing]);

  // Keep the highlighted row in view.
  useEffect(() => {
    list.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const reset = () => {
    setText('');
    setOpen(false);
    input.current?.blur();
  };
  const choose = (row: number) => {
    if (row === filterRow) onFilter(text.trim());
    else if (results[row]) onPick(results[row].page);
    else return;
    reset();
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    switch (ev.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        ev.preventDefault();
        setOpen(true);
        if (rows) setActive((current) => (current + (ev.key === 'ArrowDown' ? 1 : rows - 1)) % rows);
        break;
      case 'Enter':
        ev.preventDefault();
        if (showing) choose(active);
        break;
      case 'Escape':
        // First press clears the text; with nothing typed it leaves the box.
        if (text) setText('');
        else input.current?.blur();
        break;
    }
  };

  return (
    <div className="searchbox">
      <input
        ref={input}
        id="search"
        className="search"
        type="search"
        role="combobox"
        aria-expanded={showing}
        aria-controls="results"
        aria-activedescendant={showing && rows ? `result-${active}` : undefined}
        aria-label="Search events, people, companies and terms"
        placeholder="Search everything"
        title="Search everything (Ctrl+K)"
        autoComplete="off"
        spellCheck={false}
        value={text}
        onChange={(ev) => {
          setText(ev.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showing && (
        // Pressing a row must not take focus from the box, or the list would close before the click lands.
        <div id="results" className={alignRight ? 'results right' : 'results'} role="listbox" aria-label="Search results" ref={list} onMouseDown={(ev: MouseEvent) => ev.preventDefault()}>
          {results.map((result, row) => (
            <div
              key={`${result.page.kind}:${result.page.kind === 'person' ? result.page.name : result.page.id}`}
              id={`result-${row}`}
              role="option"
              aria-selected={row === active}
              className={`result k-${result.page.kind}${row === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(row)}
              onClick={() => choose(row)}
            >
              <span className="rkind">{KIND_LABEL[result.page.kind]}</span>
              <span className="rbody">
                <span className="rtitle">
                  <Marked parts={result.title} />
                </span>
                <span className="rsub">{result.subtitle}</span>
                {result.snippet && (
                  <span className="rsnip">
                    <Marked parts={result.snippet} />
                  </span>
                )}
              </span>
            </div>
          ))}
          {outcome.total > results.length && <div className="rmore">{outcome.total - results.length} more matches. Add a word to narrow them.</div>}
          {filterRow >= 0 && (
            <div
              id={`result-${filterRow}`}
              role="option"
              aria-selected={filterRow === active}
              className={`result rfilter${filterRow === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(filterRow)}
              onClick={() => choose(filterRow)}
            >
              Show the {eventIds.length} matching event{eventIds.length === 1 ? '' : 's'} on the timeline
            </div>
          )}
          {rows === 0 && (
            <div className="rnone">
              Nothing matches “{text.trim()}”.
              {world.max < LAST_VOLUME ? ' Later volumes are hidden by ‘Read up to’.' : ' Check the spelling, or try fewer words.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
