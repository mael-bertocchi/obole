import {
    categorySpends,
    dayGroups,
    daysLeft,
    lastUsedCurrency,
    latestLocation,
    liveBudget,
    monthlyBudgetFor,
    recentLocations,
    sealCompletedMonths,
    summary,
    toDispatch
} from 'modules/budget/budget-math';
import { describe, expect, it } from 'vitest';

import { document, NOW, operation } from '../../support/fixtures';

/**
 * @constant september
 * @description The month most tests measure
 */
const september = new Date(2026, 8, 1);

describe('summary', () => {
    const operations = [
        operation({ id: 'a', date: new Date(2026, 8, 3), amount: 1000 }),
        operation({ id: 'b', date: new Date(2026, 8, 20), amount: 100, currencyCode: 'USD', rateToEuro: 0.9 }),
        operation({ id: 'c', date: new Date(2026, 7, 31), amount: 500 })
    ];

    it('counts the month in euros and spreads what is left over the days left', () => {
        const figures = summary(operations, september, liveBudget(document(operations)), NOW);

        expect(figures.spent).toBeCloseTo(1090);
        expect(figures.left).toBeCloseTo(1910);
        expect(figures.daysLeft).toBe(4);
        expect(figures.perDay).toBeCloseTo(477.5);
    });

    it('allows nothing per day once overspent', () => {
        const figures = summary(operations, september, { monthlyLimit: 1000, categoryLimits: {} }, NOW);

        expect(figures.left).toBeLessThan(0);
        expect(figures.perDay).toBe(0);
        expect(figures.progress).toBe(1);
    });

    it('leaves no days in a past month and every day in a future one', () => {
        expect(daysLeft(new Date(2026, 7, 1), NOW)).toBe(0);
        expect(daysLeft(new Date(2026, 9, 1), NOW)).toBe(31);
    });
});

describe('categories', () => {
    it('flags a category past its limit', () => {
        const operations = [operation({ id: 'a', date: NOW, categoryId: 'coffee', amount: 60 })];
        const coffee = categorySpends(operations, document().categories, september, liveBudget(document(operations))).find((spend) => spend.category.id === 'coffee');

        expect(coffee?.isOverBudget).toBe(true);
        expect(coffee?.progress).toBe(1);
    });

    it('reports what the limits leave of the budget', () => {
        expect(toDispatch(document().categories, liveBudget(document()))).toBe(3000 - 1660);
    });
});

describe('dayGroups', () => {
    it('groups by day, latest first, with day totals', () => {
        const groups = dayGroups([
            operation({ id: 'a', date: new Date(2026, 8, 26, 9), amount: 5 }),
            operation({ id: 'b', date: new Date(2026, 8, 27, 9), amount: 7 }),
            operation({ id: 'c', date: new Date(2026, 8, 26, 18), amount: 3 })
        ]);

        expect(groups.map((group) => group.spent)).toEqual([7, 8]);
        expect(groups[1]?.operations.map((entry) => entry.id)).toEqual(['c', 'a']);
    });
});

describe('sealCompletedMonths', () => {
    it('freezes the live budget onto every finished month without touching sealed ones', () => {
        const sealed = { monthlyLimit: 2000, categoryLimits: {} };
        const budget = document([operation({ id: 'a', date: new Date(2026, 5, 10) })], { budgetHistory: { '2026-07': sealed } });
        const result = sealCompletedMonths(budget, NOW);

        expect(Object.keys(result.budgetHistory).sort()).toEqual(['2026-06', '2026-07', '2026-08']);
        expect(result.budgetHistory['2026-07']).toBe(sealed);
        expect(monthlyBudgetFor(result, new Date(2026, 5, 1)).monthlyLimit).toBe(3000);
    });
});

describe('suggestions', () => {
    const operations = [
        operation({ id: 'a', date: new Date(2026, 8, 20), location: 'Lidl', currencyCode: 'CHF' }),
        operation({ id: 'b', date: new Date(2026, 8, 25), location: 'Netflix', isOnline: true, currencyCode: 'USD' }),
        operation({ id: 'c', date: new Date(2026, 8, 24), location: 'lidl' })
    ];

    it('suggests the latest in-person place', () => {
        expect(latestLocation(operations)).toBe('lidl');
    });

    it('lists each place once, most recent first', () => {
        expect(recentLocations(operations)).toEqual(['Netflix', 'lidl']);
    });

    it('defaults to the currency of the latest operation', () => {
        expect(lastUsedCurrency(operations)).toBe('USD');
        expect(lastUsedCurrency([])).toBe('EUR');
    });
});
