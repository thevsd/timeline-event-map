import type { CorpEdge, CorpNode } from './corporate';
import type { Person } from './people';
import type { RealEventRecord } from './realHistory';
import type { Thread } from './threads';
import type { EventRecord } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks the TypeScript types cannot express: unique ids, date formats, and that every
 * cross-reference (links, threads, people, counterparts, map steps) points at something real.
 * Returns a list of problems; empty means the data is sound.
 */
export function validateData(
  records: readonly EventRecord[],
  threads: readonly Thread[],
  people: readonly Person[],
  realHistory: readonly RealEventRecord[],
  corpNodes: readonly CorpNode[],
  corpEdges: readonly CorpEdge[],
): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();

  for (const r of records) {
    if (ids.has(r.id)) problems.push(`${r.id}: duplicate id`);
    ids.add(r.id);
    if (r.backstoryOrder == null && !r.date) problems.push(`${r.id}: needs a date or a backstoryOrder`);
    if (r.date && !ISO_DATE.test(r.date)) problems.push(`${r.id}: date must be YYYY-MM-DD`);
    if (r.endDate && (!r.date || !ISO_DATE.test(r.endDate) || r.endDate <= r.date)) {
      problems.push(`${r.id}: endDate must be a YYYY-MM-DD date after date`);
    }
  }
  const checkEvent = (owner: string, id: string | undefined) => {
    if (id != null && !ids.has(id)) problems.push(`${owner}: unknown event "${id}"`);
  };

  const names = new Set(people.map((p) => p.name));
  if (names.size !== people.length) problems.push('people: duplicate name');
  for (const r of records) {
    for (const id of r.links ?? []) checkEvent(r.id, id);
    for (const name of r.people ?? []) {
      if (!names.has(name)) problems.push(`${r.id}: no profile for "${name}"`);
    }
  }

  for (const t of threads) {
    for (const id of t.events) checkEvent(`thread ${t.id}`, id);
  }

  for (const r of realHistory) {
    if (!ISO_DATE.test(r.date)) problems.push(`${r.id}: date must be YYYY-MM-DD`);
    for (const id of r.counterparts ?? []) checkEvent(r.id, id);
  }

  const nodeIds = new Set(corpNodes.map((n) => n.id));
  if (nodeIds.size !== corpNodes.length) problems.push('corporate: duplicate node id');
  const cells = new Set<string>();
  for (const n of corpNodes) {
    const cell = `${n.col},${n.row}`;
    if (cells.has(cell)) problems.push(`corporate ${n.id}: grid cell ${cell} is taken`);
    cells.add(cell);
    checkEvent(`corporate ${n.id}`, n.since);
    checkEvent(`corporate ${n.id}`, n.until);
    for (const [id] of n.history ?? []) checkEvent(`corporate ${n.id}`, id);
    if (n.into && !nodeIds.has(n.into)) problems.push(`corporate ${n.id}: unknown node "${n.into}"`);
  }
  for (const e of corpEdges) {
    const name = `corporate ${e.from} -> ${e.to}`;
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) problems.push(`${name}: unknown node`);
    checkEvent(name, e.since);
    checkEvent(name, e.until);
  }
  return problems;
}
