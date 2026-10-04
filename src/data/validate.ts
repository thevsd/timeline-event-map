import type { EventRecord } from './types';

/**
 * Checks the TypeScript types cannot express: unique ids, date format and order,
 * link targets, and that every event has either a date or a backstory position.
 * Returns a list of problems; empty means the data is sound.
 */
export function validateEvents(records: readonly EventRecord[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;

  for (const r of records) {
    if (ids.has(r.id)) problems.push(`${r.id}: duplicate id`);
    ids.add(r.id);
    if (r.backstoryOrder == null && !r.date) problems.push(`${r.id}: needs a date or a backstoryOrder`);
    if (r.date && !isoDate.test(r.date)) problems.push(`${r.id}: date must be YYYY-MM-DD`);
    if (r.endDate && (!r.date || !isoDate.test(r.endDate) || r.endDate <= r.date)) {
      problems.push(`${r.id}: endDate must be a YYYY-MM-DD date after date`);
    }
  }
  for (const r of records) {
    for (const id of r.links ?? []) {
      if (!ids.has(id)) problems.push(`${r.id}: link to unknown event "${id}"`);
    }
  }
  return problems;
}
