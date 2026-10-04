import { demoDoc } from '../data';
import { corpEdges, corpNodes, type CorpEdge, type CorpEdgeKind, type CorpNode } from '../data/corporate';
import type { TimelineDoc } from '../model/schema';
import { worldOf, type TimelineEvent, type World } from '../model/world';
import { reveal } from './spoilers';

/**
 * The corporate map, a feature of the Modern Villainess demo only.
 *
 * Every change on the map is tied to a demo event, so the map can be stepped through in story
 * order. Step 0 is the map before any change; step k is the map after the k-th change event
 * (`CORP_STEPS[k - 1]`). Everything is compared by story order, the position of an event in the
 * demo's full event list.
 */

/** The map belongs to the demo as shipped; an edited copy may no longer have the events it hangs on. */
export const hasCorporateMap = (doc: TimelineDoc) => doc === demoDoc;

const FULL = worldOf(demoDoc);
const EVENT_ORDER = FULL.eventOrder;
export const CORP_NODE_BY_ID: ReadonlyMap<string, CorpNode> = new Map(corpNodes.map((n) => [n.id, n]));

/** Events at which the map changes, in story order. */
export const CORP_STEPS: readonly string[] = [
  ...new Set(
    [
      ...corpNodes.flatMap((n) => [n.since, n.until, ...(n.history ?? []).map(([id]) => id)]),
      ...corpEdges.flatMap((e) => [e.since, e.until]),
    ].filter((id): id is string => id != null && EVENT_ORDER.has(id)),
  ),
].sort((a, b) => EVENT_ORDER.get(a)! - EVENT_ORDER.get(b)!);

/** Not yet in the story, present, or merged / sold / wound up. */
export type NodeStatus = 'future' | 'active' | 'ended';

export interface MapEdge extends Omit<CorpEdge, 'kind'> {
  kind: CorpEdgeKind | 'merged';
}

/** The map as a reader's progress allows: notes cut at later volumes, later history left out. */
export interface Corporate {
  nodes: readonly CorpNode[];
  nodeById: ReadonlyMap<string, CorpNode>;
  /** Last step the reader may reach. Steps never run back a volume, so the readable ones are a prefix. */
  lastStep: number;
}

const byProgress = new Map<number, Corporate>();

export function corporateOf(world: World): Corporate {
  let corporate = byProgress.get(world.max);
  if (!corporate) {
    const nodes = corpNodes.map((n) => ({
      ...n,
      note: reveal(n.note, world.max),
      history: n.history?.filter(([id]) => world.eventById.has(id)),
    }));
    corporate = {
      nodes,
      nodeById: new Map(nodes.map((n) => [n.id, n])),
      lastStep: CORP_STEPS.filter((id) => world.eventById.has(id)).length,
    };
    byProgress.set(world.max, corporate);
  }
  return corporate;
}

/** The event a step applies; null for step 0. */
export function stepEvent(step: number): TimelineEvent | null {
  return step > 0 ? (FULL.eventById.get(CORP_STEPS[step - 1]) ?? null) : null;
}

/** Story order reached at a step; -1 before the first change. */
export function stepOrder(step: number): number {
  return step > 0 ? (EVENT_ORDER.get(CORP_STEPS[step - 1]) ?? -1) : -1;
}

/** Story order of an event; 0 if unknown. */
export const orderOf = (eventId: string) => EVENT_ORDER.get(eventId) ?? 0;

/** Whether the event has happened by story order `order`. An omitted event counts as "from the start". */
const reached = (eventId: string | undefined, order: number) =>
  eventId == null || (EVENT_ORDER.get(eventId) ?? Infinity) <= order;

export function nodeStatus(node: CorpNode, order: number): NodeStatus {
  if (!reached(node.since, order)) return 'future';
  return node.until != null && reached(node.until, order) ? 'ended' : 'active';
}

/** Every edge the map can show: the authored ones, plus a "merged into" edge for each node that is absorbed. */
export const ALL_EDGES: readonly MapEdge[] = [
  ...corpEdges,
  ...corpNodes.flatMap((n): MapEdge[] => (n.into ? [{ from: n.id, to: n.into, kind: 'merged', since: n.until }] : [])),
];

/** Whether an edge is in force at `order`. Apart from merger trails, both ends must still be active. */
export function edgeActive(edge: MapEdge, order: number): boolean {
  if (!reached(edge.since, order) || (edge.until != null && reached(edge.until, order))) return false;
  if (edge.kind === 'merged') return true;
  const from = CORP_NODE_BY_ID.get(edge.from);
  const to = CORP_NODE_BY_ID.get(edge.to);
  return from != null && to != null && nodeStatus(from, order) === 'active' && nodeStatus(to, order) === 'active';
}

export function edgesAt(order: number): MapEdge[] {
  return ALL_EDGES.filter((e) => edgeActive(e, order));
}

/** Whether a node changes at this event: it appears, ends, or has a history entry. */
export function changesAt(node: CorpNode, eventId: string): boolean {
  return node.since === eventId || node.until === eventId || (node.history ?? []).some(([id]) => id === eventId);
}

/** One line on what became of a node that has ended. */
export function endingOf(node: CorpNode): string {
  const into = node.into ? CORP_NODE_BY_ID.get(node.into) : undefined;
  return into ? `Merged into ${into.name}` : 'No longer active';
}
