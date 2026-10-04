import { CORP_NODE_BY_ID, CORP_STEPS, EVENT_BY_ID, EVENT_ORDER } from '../data';
import { corpEdges, corpNodes, type CorpEdge, type CorpEdgeKind, type CorpNode } from '../data/corporate';
import type { TimelineEvent } from '../data/types';

/**
 * State of the corporate map at a step.
 *
 * Step 0 is the map before any change; step k is the map after the k-th change event
 * (`CORP_STEPS[k - 1]`). Everything is compared by story order, the position of an event in `EVENTS`.
 */

/** Not yet in the story, present, or merged / sold / wound up. */
export type NodeStatus = 'future' | 'active' | 'ended';

export interface MapEdge extends Omit<CorpEdge, 'kind'> {
  kind: CorpEdgeKind | 'merged';
}

/** The event a step applies; null for step 0. */
export function stepEvent(step: number): TimelineEvent | null {
  return step > 0 ? (EVENT_BY_ID.get(CORP_STEPS[step - 1]) ?? null) : null;
}

/** Story order reached at a step; -1 before the first change. */
export function stepOrder(step: number): number {
  return step > 0 ? (EVENT_ORDER.get(CORP_STEPS[step - 1]) ?? -1) : -1;
}

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
