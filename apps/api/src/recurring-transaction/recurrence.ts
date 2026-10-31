import { RecurrenceFrequency } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;
// Turkey has used a fixed UTC+3 offset since 2016; generated transactions are dated 09:00 local.
const OCCURRENCE_TIME_UTC_HOURS = 6;

/** Calendar dates are represented as UTC midnight, matching Prisma's @db.Date values. */
export function calendarDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function istanbulToday(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return calendarDate(get('year'), get('month'), get('day'));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Returns occurrence `index` of a schedule, keeping the anchor day and clamping to month end. */
export function occurrenceDate(start: Date, frequency: RecurrenceFrequency, index: number): Date {
  if (frequency === RecurrenceFrequency.WEEKLY) return addDays(start, index * 7);

  const months = frequency === RecurrenceFrequency.MONTHLY ? index : index * 12;
  const totalMonths = start.getUTCMonth() + months;
  const year = start.getUTCFullYear() + Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)));
}

/** The smallest index whose occurrence falls on or after `date`. */
export function firstIndexOnOrAfter(
  start: Date,
  frequency: RecurrenceFrequency,
  date: Date,
): number {
  if (date <= start) return 0;

  const elapsedDays = (date.getTime() - start.getTime()) / DAY_MS;
  const estimate =
    frequency === RecurrenceFrequency.WEEKLY
      ? Math.floor(elapsedDays / 7)
      : Math.floor(elapsedDays / (frequency === RecurrenceFrequency.MONTHLY ? 31 : 366));
  let index = Math.max(0, estimate);
  while (occurrenceDate(start, frequency, index) < date) index += 1;
  return index;
}

export function occurredAtFor(date: Date): Date {
  return new Date(date.getTime() + OCCURRENCE_TIME_UTC_HOURS * 60 * 60 * 1000);
}
