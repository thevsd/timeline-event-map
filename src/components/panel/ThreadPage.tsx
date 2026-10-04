import type { Thread } from '../../data/threads';
import { Prose } from '../Prose';
import { EventLinks, FilterToggle, Section, type OpenPage } from './parts';

interface ThreadPageProps {
  thread: Thread;
  /** The timeline is currently narrowed to this thread. */
  filtered: boolean;
  onFilter(id: string | null): void;
  onOpen: OpenPage;
}

/** A storyline across volumes: what it argues, and its events in order. */
export function ThreadPage({ thread, filtered, onFilter, onOpen }: ThreadPageProps) {
  return (
    <div className="pbody page">
      <div className="tags">
        <span className="tag">Thread</span>
        <span className="tag">{thread.events.length} events</span>
      </div>
      <h2 id="ptitle">{thread.name}</h2>
      <p className="lede">
        <Prose text={thread.summary} />
      </p>
      <FilterToggle active={filtered} label="Follow this thread on the timeline" onToggle={() => onFilter(filtered ? null : thread.id)} />
      <Section title="In order">
        <EventLinks ids={thread.events} onOpen={onOpen} numbered />
      </Section>
    </div>
  );
}
