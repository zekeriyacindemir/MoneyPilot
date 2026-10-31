import { RecurrenceFrequency } from '@prisma/client';
import {
  calendarDate,
  firstIndexOnOrAfter,
  istanbulToday,
  occurredAtFor,
  occurrenceDate,
} from '../src/recurring-transaction/recurrence';

const iso = (date: Date) => date.toISOString().slice(0, 10);

describe('Recurrence schedule', () => {
  it('keeps the anchor day for monthly schedules and clamps to shorter months', () => {
    const start = calendarDate(2026, 1, 31);
    const dates = [0, 1, 2, 3, 12, 13, 25].map((index) =>
      iso(occurrenceDate(start, RecurrenceFrequency.MONTHLY, index)),
    );

    expect(dates).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2027-01-31',
      '2027-02-28',
      '2028-02-29',
    ]);
  });

  it('adds whole weeks and whole years', () => {
    const start = calendarDate(2028, 2, 29);

    expect(iso(occurrenceDate(start, RecurrenceFrequency.WEEKLY, 1))).toBe('2028-03-07');
    expect(iso(occurrenceDate(start, RecurrenceFrequency.YEARLY, 1))).toBe('2029-02-28');
    expect(iso(occurrenceDate(start, RecurrenceFrequency.YEARLY, 4))).toBe('2032-02-29');
  });

  it('finds the first occurrence on or after a date', () => {
    const start = calendarDate(2026, 1, 31);

    expect(firstIndexOnOrAfter(start, RecurrenceFrequency.MONTHLY, calendarDate(2025, 12, 1))).toBe(
      0,
    );
    expect(firstIndexOnOrAfter(start, RecurrenceFrequency.MONTHLY, calendarDate(2026, 2, 28))).toBe(
      1,
    );
    expect(firstIndexOnOrAfter(start, RecurrenceFrequency.MONTHLY, calendarDate(2026, 3, 1))).toBe(
      2,
    );
    expect(firstIndexOnOrAfter(start, RecurrenceFrequency.WEEKLY, calendarDate(2026, 2, 8))).toBe(
      2,
    );

    for (const frequency of Object.values(RecurrenceFrequency)) {
      for (let offset = 0; offset < 800; offset += 13) {
        const target = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000);
        const index = firstIndexOnOrAfter(start, frequency, target);
        expect(occurrenceDate(start, frequency, index) >= target).toBe(true);
        if (index > 0) expect(occurrenceDate(start, frequency, index - 1) < target).toBe(true);
      }
    }
  });

  it('uses the Istanbul calendar day and dates occurrences at 09:00 local time', () => {
    expect(iso(istanbulToday(new Date('2026-10-31T20:59:59.000Z')))).toBe('2026-10-31');
    expect(iso(istanbulToday(new Date('2026-10-31T21:00:00.000Z')))).toBe('2026-11-01');
    expect(occurredAtFor(calendarDate(2026, 11, 1)).toISOString()).toBe('2026-11-01T06:00:00.000Z');
  });
});
