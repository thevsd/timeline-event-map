import { CORP_NODE_BY_ID, EVENT_ORDER } from '../../data';
import { useWorld } from '../../context';
import { CORP_COLUMNS, CORP_EDGE_LABEL, type CorpKind, type CorpNode } from '../../data/corporate';
import { edgesAt, endingOf, nodeStatus, stepOrder } from '../../lib/corporate';
import { Prose } from '../Prose';
import { EventLink, Section, type OpenPage } from './parts';

const KIND_LABEL: Record<CorpKind, string> = {
  person: 'People',
  fund: 'Fund',
  company: 'Company',
  project: 'Project',
  state: 'Public money',
  outside: 'Outside Runa’s group',
};

/** An entry on the corporate map: what it is, its ties at the current step, and its history. */
export function CompanyPage({ node, step, onOpen }: { node: CorpNode; step: number; onOpen: OpenPage }) {
  const world = useWorld();
  const order = stepOrder(step);
  const status = nodeStatus(node, order);
  const ties = edgesAt(order).filter((e) => e.from === node.id || e.to === node.id);

  // Appearance and ending are history too, when the data ties them to an event.
  const history: [string, string][] = [...(node.history ?? [])];
  if (node.since && !history.some(([id]) => id === node.since)) history.unshift([node.since, 'Enters the story.']);
  // An ending the reader has not reached stays out of the list.
  if (node.until && world.eventById.has(node.until) && !history.some(([id]) => id === node.until)) {
    history.push([node.until, `${endingOf(node)}.`]);
  }
  history.sort((a, b) => (EVENT_ORDER.get(a[0]) ?? 0) - (EVENT_ORDER.get(b[0]) ?? 0));

  return (
    <div className="pbody page">
      <div className="tags">
        <span className="tag">{KIND_LABEL[node.kind]}</span>
        <span className="tag">{CORP_COLUMNS[node.col]}</span>
        <span className={`tag st-${status}`}>
          {status === 'active' ? 'Active at this step' : status === 'ended' ? endingOf(node) : 'Not yet in the story'}
        </span>
      </div>
      <h2 id="ptitle">{node.name}</h2>
      <p className="lede">
        <Prose text={node.note} />
      </p>
      {node.real && (
        <Section title="Real-world counterpart">
          <p>{node.real}</p>
        </Section>
      )}

      {ties.length > 0 && (
        <Section title="Ties at this step">
          <div className="links">
            {ties.map((e) => {
              const outward = e.from === node.id;
              const other = CORP_NODE_BY_ID.get(outward ? e.to : e.from);
              if (!other) return null;
              return (
                <button
                  key={`${e.from}-${e.to}-${e.kind}`}
                  type="button"
                  className="link"
                  onClick={() => onOpen({ kind: 'company', id: other.id })}
                >
                  <span className={`ek ek-${e.kind}`} aria-hidden="true" />
                  <span className="lbody">
                    <span className="lt">
                      {outward ? '→' : '←'} {other.name}
                    </span>
                    <span className="ln">
                      {CORP_EDGE_LABEL[e.kind]}
                      {e.label ? ` · ${e.label}` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {history.length > 0 && (
        <Section title="History">
          <div className="links">
            {history.map(([id, text]) => (
              <EventLink key={id + text} id={id} onOpen={onOpen} note={text} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
