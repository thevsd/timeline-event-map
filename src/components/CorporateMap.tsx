import { useMemo, useState, type KeyboardEvent } from 'react';
import { CORP_COLUMNS, CORP_EDGE_LABEL, corpNodes, type CorpEdgeKind, type CorpNode } from '../data/corporate';
import { ALL_EDGES, changesAt, edgeActive, nodeStatus, stepEvent, stepOrder, type MapEdge } from '../lib/corporate';

// Grid geometry, in SVG units. Nodes sit at (column, row) from the data.
const NODE_W = 148;
const NODE_H = 42;
const COL_W = 184;
const ROW_H = 68;
const PAD_X = 16;
const TOP = 36;
const ROWS = Math.max(...corpNodes.map((n) => n.row)) + 1;
// The extra 30 on the right leaves room for the loops of same-column edges in the last column.
const WIDTH = PAD_X * 2 + CORP_COLUMNS.length * COL_W - (COL_W - NODE_W) + 30;
const HEIGHT = TOP + ROWS * ROW_H;

const LEGEND: (CorpEdgeKind | 'merged')[] = ['owns', 'stake', 'option', 'finance', 'part', 'pressure', 'family', 'merged'];

const nodeX = (n: CorpNode) => PAD_X + n.col * COL_W;
const nodeY = (n: CorpNode) => TOP + n.row * ROW_H;
const NODE_BY_ID = new Map(corpNodes.map((n) => [n.id, n]));

/** Break a name into at most two lines that fit a node. */
function wrap(name: string, max = 20): string[] {
  if (name.length <= max) return [name];
  const words = name.split(' ');
  let first = words.shift()!;
  while (words.length > 1 && `${first} ${words[0]}`.length <= max) first = `${first} ${words.shift()}`;
  return [first, words.join(' ')];
}

/**
 * Path between two nodes and the point for its label: out of the facing sides when they are in
 * different columns, or looping round the right-hand side when they share one.
 */
function edgeGeometry(edge: MapEdge): { d: string; lx: number; ly: number } | null {
  const a = NODE_BY_ID.get(edge.from);
  const b = NODE_BY_ID.get(edge.to);
  if (!a || !b) return null;
  const ay = nodeY(a) + NODE_H / 2;
  const by = nodeY(b) + NODE_H / 2;
  let p: [number, number][];
  if (a.col === b.col) {
    const x = nodeX(a) + NODE_W;
    p = [[x, ay], [x + 26, ay], [x + 26, by], [x, by]];
  } else {
    const right = b.col > a.col;
    const x1 = nodeX(a) + (right ? NODE_W : 0);
    const x2 = nodeX(b) + (right ? 0 : NODE_W);
    const bend = Math.max(18, Math.abs(x2 - x1) * 0.42) * (right ? 1 : -1);
    p = [[x1, ay], [x1 + bend, ay], [x2 - bend, by], [x2, by]];
  }
  return {
    d: `M${p[0][0]} ${p[0][1]}C${p[1][0]} ${p[1][1]} ${p[2][0]} ${p[2][1]} ${p[3][0]} ${p[3][1]}`,
    // Midpoint of the cubic.
    lx: (p[0][0] + 3 * p[1][0] + 3 * p[2][0] + p[3][0]) / 8,
    ly: (p[0][1] + 3 * p[1][1] + 3 * p[2][1] + p[3][1]) / 8,
  };
}

const EDGE_GEOMETRY = ALL_EDGES.map(edgeGeometry);

interface CorporateMapProps {
  /** Step of the story to show; see lib/corporate.ts. */
  step: number;
  selectedId: string | null;
  onSelect(id: string): void;
}

/**
 * The corporate map: Runa's group, the original Keika companies and the rival groups, drawn as
 * a fixed grid of nodes with edges for ownership, funding and pressure.
 *
 * Every node and edge is always in the DOM and only changes class, so stepping through the
 * story fades things in and out instead of redrawing.
 */
export function CorporateMap({ step, selectedId, onSelect }: CorporateMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const order = stepOrder(step);
  const changeId = stepEvent(step)?.id ?? null;
  // A selected node that has not entered the story yet has nothing to focus on.
  const selected = selectedId ? NODE_BY_ID.get(selectedId) : undefined;
  const focusId = hoveredId ?? (selected && nodeStatus(selected, order) !== 'future' ? selected.id : null);

  const active = useMemo(() => ALL_EDGES.map((e) => edgeActive(e, order)), [order]);
  /** Nodes tied to the focused one, including itself. */
  const near = useMemo(() => {
    const ids = new Set<string>();
    if (!focusId) return ids;
    ids.add(focusId);
    ALL_EDGES.forEach((e, i) => {
      if (!active[i]) return;
      if (e.from === focusId) ids.add(e.to);
      if (e.to === focusId) ids.add(e.from);
    });
    return ids;
  }, [focusId, active]);

  const onKey = (ev: KeyboardEvent, id: string) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    onSelect(id);
  };

  return (
    <section id="map" className="mapstage" aria-label="Corporate map">
      <div className="mapscroll">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMin meet" role="group" aria-label="Who owns, funds or pressures whom">
          <defs>
            {LEGEND.map((kind) => (
              <marker key={kind} id={`arrow-${kind}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path className={`ah ek-${kind}`} d="M0 0.5 8 4 0 7.5z" />
              </marker>
            ))}
          </defs>

          {CORP_COLUMNS.map((title, col) => (
            <g key={title}>
              <rect className="colbg" x={PAD_X + col * COL_W - 8} y={6} width={NODE_W + 16} height={HEIGHT - 12} rx={12} />
              <text className="coltitle" x={PAD_X + col * COL_W} y={24}>
                {title}
              </text>
            </g>
          ))}

          <g className={focusId ? 'edges focused' : 'edges'}>
            {ALL_EDGES.map((edge, i) => {
              const geometry = EDGE_GEOMETRY[i];
              if (!geometry) return null;
              const hot = focusId != null && (edge.from === focusId || edge.to === focusId);
              // New at this step: the edge starts here, or it is the trail of a merger that happens here.
              const fresh = changeId != null && edge.since === changeId;
              const state = `${active[i] ? ' on' : ''}${hot ? ' hot' : ''}${fresh ? ' fresh' : ''}`;
              return (
                <path
                  key={`${edge.from}-${edge.to}-${edge.kind}`}
                  className={`ce ek-${edge.kind}${state}`}
                  d={geometry.d}
                  markerEnd={`url(#arrow-${edge.kind})`}
                />
              );
            })}
          </g>

          <g className={focusId ? 'nodes focused' : 'nodes'}>
            {corpNodes.map((node) => {
              const status = nodeStatus(node, order);
              const lines = wrap(node.name);
              const state =
                (node.id === selectedId ? ' sel' : '') +
                (near.has(node.id) ? ' near' : '') +
                (changeId && changesAt(node, changeId) ? ' fresh' : '');
              return (
                <g
                  key={node.id}
                  className={`cn k-${node.kind} st-${status}${state}`}
                  data-id={node.id}
                  transform={`translate(${nodeX(node)} ${nodeY(node)})`}
                  role="button"
                  tabIndex={status === 'future' ? -1 : 0}
                  aria-label={`${node.name}${status === 'ended' ? ', no longer active' : ''}`}
                  aria-hidden={status === 'future'}
                  onClick={() => onSelect(node.id)}
                  onKeyDown={(ev: KeyboardEvent) => onKey(ev, node.id)}
                  onPointerEnter={() => setHoveredId(node.id)}
                  onPointerLeave={() => setHoveredId(null)}
                >
                  <rect width={NODE_W} height={NODE_H} rx={node.kind === 'person' ? NODE_H / 2 : 9} />
                  {lines.map((line, i) => (
                    <text key={line} x={NODE_W / 2} y={NODE_H / 2 + (i - (lines.length - 1) / 2) * 14}>
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </g>

          {/* Edge labels sit above the nodes, and show only for the focused node or for edges new at this step. */}
          <g className={focusId ? 'elabels focused' : 'elabels'}>
            {ALL_EDGES.map((edge, i) => {
              const geometry = EDGE_GEOMETRY[i];
              if (!geometry || !edge.label || !active[i]) return null;
              const hot = focusId != null && (edge.from === focusId || edge.to === focusId);
              const fresh = changeId != null && edge.since === changeId;
              if (!hot && !fresh) return null;
              return (
                <text key={`${edge.from}-${edge.to}-${edge.kind}`} className={hot ? 'el hot' : 'el'} x={geometry.lx} y={geometry.ly - 5}>
                  {edge.label}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="maplegend" aria-label="Legend">
        {LEGEND.map((kind) => (
          <span key={kind}>
            <i className={`ek ek-${kind}`} aria-hidden="true" />
            {CORP_EDGE_LABEL[kind]}
          </span>
        ))}
        <span>
          <i className="swatch ended" aria-hidden="true" />
          Merged or wound up
        </span>
        <span>
          <i className="swatch fresh" aria-hidden="true" />
          Changes at this step
        </span>
      </div>
    </section>
  );
}
