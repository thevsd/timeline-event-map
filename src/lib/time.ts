/** Date helpers. The timeline works in integer day numbers (days since the Unix epoch, UTC). */

const DAY_MS = 86_400_000;

/** Day number of a calendar date; `month` is zero-based and may overflow into the next year. */
export function dayOf(year: number, month: number, day = 1): number {
  // setUTCFullYear, unlike Date.UTC, takes years below 100 as written.
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return Math.round(date.getTime() / DAY_MS);
}

export function dateOf(day: number): Date {
  return new Date(day * DAY_MS);
}

export const yearOf = (day: number) => dateOf(day).getUTCFullYear();

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** How much of a date was given: `1997`, `1997-11` or `1997-11-17`. */
export type Precision = 'year' | 'month' | 'day';

export interface ParsedDate {
  /** Day number. A date given to the month or year sits mid-period, so it reads as "some time in". */
  day: number;
  precision: Precision;
  year: number;
  /** Zero-based; 0 when only the year was given. */
  month: number;
  dayOfMonth: number;
}

const DATE = /^(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/;

/** Read a date written as YYYY, YYYY-MM or YYYY-MM-DD. A leading minus marks years BC. Null if malformed. */
export function parseDate(text: string): ParsedDate | null {
  const match = DATE.exec(text.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) - 1 : 0;
  const dayOfMonth = match[3] ? Number(match[3]) : 1;
  if (month < 0 || month > 11 || dayOfMonth < 1 || dayOfMonth > 31) return null;
  if (match[3]) return { day: dayOf(year, month, dayOfMonth), precision: 'day', year, month, dayOfMonth };
  if (match[2]) return { day: dayOf(year, month, 15), precision: 'month', year, month, dayOfMonth: 15 };
  return { day: dayOf(year, 6, 1), precision: 'year', year, month: 0, dayOfMonth: 1 };
}

/** A year as displayed: years below 1 as BC, and the first millennium marked AD so "64" is not mistaken for a count. */
export const yearLabel = (year: number) => (year < 1 ? `${-year || 1} BC` : year < 1000 ? `AD ${year}` : String(year));

/** A parsed date as displayed, to the precision it was given: "17 November 1997", "Nov 1997", "1997". */
export function formatDate(date: ParsedDate, short = false): string {
  const months = short ? MONTHS_SHORT : MONTHS_LONG;
  const year = yearLabel(date.year);
  if (date.precision === 'year') return year;
  if (date.precision === 'month') return `${months[date.month]} ${year}`;
  return `${date.dayOfMonth} ${months[date.month]} ${year}`;
}

/** A day number as an ISO date (YYYY-MM-DD). */
export function toIso(day: number): string {
  const date = dateOf(day);
  const year = date.getUTCFullYear();
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${year < 0 ? '-' : ''}${pad(Math.abs(year), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
