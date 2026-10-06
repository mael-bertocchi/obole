import { dayKey, dayRange, isFutureDay, isInRange, monthKey, parseDay, parseDayKey, parseMonthKey, shiftMonth } from '@core/dates';
import { describe, expect, it } from 'vitest';

import { NOW } from '../support/fixtures';

describe('parseDay', () => {
    it('reads today and yesterday', () => {
        expect(dayKey(parseDay('Today', NOW) ?? new Date(0))).toBe('2026-09-27');
        expect(dayKey(parseDay('yesterday', NOW) ?? new Date(0))).toBe('2026-09-26');
    });

    it('reads ISO and written days', () => {
        expect(dayKey(parseDay('2026-09-25', NOW) ?? new Date(0))).toBe('2026-09-25');
        expect(dayKey(parseDay('25/09/2026', NOW) ?? new Date(0))).toBe('2026-09-25');
        expect(dayKey(parseDay('25.09.26', NOW) ?? new Date(0))).toBe('2026-09-25');
    });

    it('puts a day without a year in the most recent past occurrence', () => {
        expect(dayKey(parseDay('25/09', NOW) ?? new Date(0))).toBe('2026-09-25');
        expect(dayKey(parseDay('28/12', NOW) ?? new Date(0))).toBe('2025-12-28');
    });

    it('refuses what names no real day', () => {
        expect(parseDay('31/06/2026', NOW)).toBeNull();
        expect(parseDay('next tuesday', NOW)).toBeNull();
    });
});

describe('months', () => {
    it('keys and parses months', () => {
        expect(monthKey(NOW)).toBe('2026-09');
        expect(parseMonthKey('2026-09')?.getMonth()).toBe(8);
        expect(parseMonthKey('2026-13')).toBeNull();
    });

    it('steps across years', () => {
        expect(monthKey(shiftMonth(new Date(2026, 0, 15), -1))).toBe('2025-12');
    });

    it('spots a future day', () => {
        expect(isFutureDay(new Date(2026, 8, 28), NOW)).toBe(true);
        expect(isFutureDay(new Date(2026, 8, 27, 23, 59), NOW)).toBe(false);
    });
});

describe('day ranges', () => {
    it('reads day keys back and refuses what names no real day', () => {
        expect(dayKey(parseDayKey('2026-09-25') ?? new Date(0))).toBe('2026-09-25');
        expect(parseDayKey('2026-06-31')).toBeNull();
        expect(parseDayKey('25/09/2026')).toBeNull();
        expect(parseDayKey('')).toBeNull();
    });

    it('orders its ends, at midnight', () => {
        const range = dayRange(new Date(2026, 8, 27, 18), new Date(2026, 8, 3, 9));

        expect(dayKey(range.start)).toBe('2026-09-03');
        expect(dayKey(range.end)).toBe('2026-09-27');
        expect(range.end.getHours()).toBe(0);
    });

    it('takes in every hour of both ends and nothing beyond', () => {
        const range = dayRange(new Date(2026, 8, 3), new Date(2026, 8, 27));

        expect(isInRange(new Date(2026, 8, 3, 0, 0), range)).toBe(true);
        expect(isInRange(new Date(2026, 8, 27, 23, 59), range)).toBe(true);
        expect(isInRange(new Date(2026, 8, 2, 23, 59), range)).toBe(false);
        expect(isInRange(new Date(2026, 8, 28, 0, 0), range)).toBe(false);
    });
});
