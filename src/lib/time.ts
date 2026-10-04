/** Date helpers. The timeline works in integer day numbers (days since the Unix epoch, UTC). */

const DAY_MS = 86_400_000;

/** ISO date (YYYY-MM-DD) to day number. */
export function toDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Day number of a calendar date; `month` is zero-based and may overflow into the next year. */
export function dayOf(year: number, month: number, day = 1): number {
  return Math.round(Date.UTC(year, month, day) / DAY_MS);
}

export function dateOf(day: number): Date {
  return new Date(day * DAY_MS);
}

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Start of the to-scale axis. Backstory events sit before it, not to scale. */
export const DOMAIN_START = toDay('1994-01-01');
export const DOMAIN_END = toDay('2009-01-01');
/** The frame scene every event counts down to: 15 September 2008. */
export const CRASH_DAY = toDay('2008-09-15');
/** Stretch not yet mapped (Vols. 6 onward); drawn hatched. */
export const GAP_START = toDay('2003-05-20');
export const GAP_END = toDay('2008-08-20');
