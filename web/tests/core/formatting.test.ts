import { currencyNamed } from '@core/currencies';
import { amountInput, clockTime, dayShort, euro, euroPrecise, fieldDate, money, monthWithYear, percent, rangeTitle, rate, relativeDay, truncate } from '@core/formatting';
import { chooseLanguage } from '@core/i18n';
import { beforeEach, describe, expect, it } from 'vitest';

import { NOW } from '../support/fixtures';

describe('amounts', () => {
    it('rounds euros half away from zero with thousands separators', () => {
        expect(euro(1234.5)).toBe('€1,235');
        expect(euro(-2.5)).toBe('€-3');
        expect(euro(0)).toBe('€0');
    });

    it('keeps cents when asked to', () => {
        expect(euroPrecise(1234.5)).toBe('€1,234.50');
    });

    it('prints an amount in its own currency without a sign', () => {
        expect(money(48.9, currencyNamed('USD'))).toBe('$48.90');
        expect(money(-12, currencyNamed('CHF'))).toBe('CHF12.00');
        expect(money(5000, currencyNamed('KRW'))).toBe('₩5,000.00');
    });

    it('prints rates to five significant digits', () => {
        expect(rate(0.869032)).toBe('0.86903');
        expect(rate(0.000644721)).toBe('0.00064472');
        expect(rate(1)).toBe('1.0000');
    });

    it('prefills whole amounts without decimals', () => {
        expect(amountInput(400)).toBe('400');
        expect(amountInput(12.5)).toBe('12.50');
    });

    it('prints a percentage', () => {
        expect(percent(0.584)).toBe('58%');
    });
});

describe('dates', () => {
    it('names days relative to today', () => {
        expect(relativeDay(new Date(2026, 8, 27, 9), NOW)).toBe('Today');
        expect(relativeDay(new Date(2026, 8, 26, 9), NOW)).toBe('Yesterday');
        expect(relativeDay(new Date(2026, 8, 25, 9), NOW)).toBe('Fri 25 Sep');
    });

    it('prints the operation date field like the app', () => {
        expect(fieldDate(new Date(2026, 8, 27, 9, 5), NOW)).toBe('Today, 27 Sep at 09:05');
        expect(fieldDate(new Date(2026, 8, 26, 21, 40), NOW)).toBe('Yesterday, 26 Sep at 21:40');
        expect(fieldDate(new Date(2026, 8, 3), NOW)).toBe('Thu 3 Sep at 00:00');
    });

    it('prints the time of day on a 24-hour clock', () => {
        expect(clockTime(new Date(2026, 8, 27, 9, 5))).toBe('09:05');
        expect(clockTime(new Date(2026, 8, 27, 18, 0, 59))).toBe('18:00');
    });

    it('prints months and short days', () => {
        expect(monthWithYear(NOW)).toBe('September 2026');
        expect(dayShort(NOW)).toBe('27 Sep');
    });

    it('names a date filter, with the year only for another year', () => {
        expect(rangeTitle({ start: new Date(2026, 8, 5), end: new Date(2026, 8, 5) }, NOW)).toBe('5 Sep');
        expect(rangeTitle({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 27) }, NOW)).toBe('1 Sep → 27 Sep');
        expect(rangeTitle({ start: new Date(2025, 11, 20), end: new Date(2026, 0, 4) }, NOW)).toBe('20 Dec 2025 → 4 Jan');
    });
});

describe('in French', () => {
    beforeEach(() => {
        chooseLanguage('fr');
    });

    it('writes amounts with a decimal comma, spaced thousands and the symbol last', () => {
        expect(euro(1234.5)).toBe('1\u00a0235\u00a0€');
        expect(euroPrecise(1234.5)).toBe('1\u00a0234,50\u00a0€');
        expect(money(48.9, currencyNamed('USD'))).toBe('48,90\u00a0$');
        expect(money(5000, currencyNamed('KRW'))).toBe('5\u00a0000,00\u00a0₩');
    });

    it('writes rates and percentages the French way', () => {
        expect(rate(0.869032)).toBe('0,86903');
        expect(percent(0.584)).toBe('58\u00a0%');
    });

    it('names days and months in French, like the app', () => {
        expect(relativeDay(new Date(2026, 8, 27, 9), NOW)).toBe('Aujourd’hui');
        expect(relativeDay(new Date(2026, 8, 26, 9), NOW)).toBe('Hier');
        expect(relativeDay(new Date(2026, 8, 25, 9), NOW)).toBe('ven. 25 sept.');
        expect(fieldDate(new Date(2026, 8, 27, 9, 5), NOW)).toBe('Aujourd’hui, 27 sept. à 09:05');
        expect(fieldDate(new Date(2026, 8, 3, 18, 30), NOW)).toBe('jeu. 3 sept. à 18:30');
        expect(clockTime(new Date(2026, 8, 27, 18, 30))).toBe('18:30');
        expect(monthWithYear(NOW)).toBe('Septembre 2026');
        expect(dayShort(new Date(2026, 6, 4))).toBe('4 juil.');
    });

    it('names a date filter in French', () => {
        expect(rangeTitle({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 27) }, NOW)).toBe('1 sept. → 27 sept.');
    });
});

describe('truncate', () => {
    it('cuts long text with an ellipsis and leaves short text alone', () => {
        expect(truncate('Whole Foods', 20)).toBe('Whole Foods');
        expect(truncate('Whole Foods Market', 10)).toBe('Whole Foo…');
    });
});
