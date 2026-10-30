import { compareMonth, projectMonth, referenceMonths } from 'modules/budget/budget-analysis';
import { describe, expect, it } from 'vitest';

import { document, NOW, operation } from '../../support/fixtures';

describe('referenceMonths', () => {
    it('takes the latest past months holding operations, six at most', () => {
        const operations = Array.from({ length: 9 }, (_, index) => operation({ id: `m${index}`, date: new Date(2026, index, 10) }));
        const months = referenceMonths(operations, new Date(2026, 8, 1));

        expect(months.map((month) => month.getMonth())).toEqual([7, 6, 5, 4, 3, 2]);
    });
});

describe('projectMonth', () => {
    it('counts recurring operations once and carries the rest at its pace to the end of the month', () => {
        const operations = [
            operation({ id: 'rent', date: new Date(2026, 8, 1), amount: 900, categoryId: 'rent', isRecurring: true }),
            operation({ id: 'a', date: new Date(2026, 8, 3), amount: 270 }),
            operation({ id: 'b', date: new Date(2026, 8, 20), amount: 270 }),
            operation({ id: 'later', date: new Date(2026, 8, 29), amount: 1000 })
        ];
        const projection = projectMonth(document(operations), NOW);

        expect(projection.spent).toBeCloseTo(1440);
        expect(projection.recurring).toBeCloseTo(900);
        expect(projection.pace).toBeCloseTo(20);
        expect(projection.projected).toBeCloseTo(1500);
        expect(projection.cumulative).toHaveLength(27);
        expect(projection.cumulative[1]).toBeCloseTo(900);
        expect(projection.cumulative[26]).toBeCloseTo(1440);
        expect(projection.usual).toBeNull();
        expect(projection.isEarly).toBe(false);
    });

    it('averages what the past months had spent by each day', () => {
        const operations = [
            operation({ id: 'july', date: new Date(2026, 6, 5), amount: 100 }),
            operation({ id: 'august', date: new Date(2026, 7, 31), amount: 300 })
        ];
        const usual = projectMonth(document(operations), NOW).usual ?? [];

        expect(usual).toHaveLength(30);
        expect(usual[3]).toBeCloseTo(0);
        expect(usual[4]).toBeCloseTo(50);
        expect(usual[29]).toBeCloseTo(50);
    });
});

describe('compareMonth', () => {
    it('measures the month so far against the same day of the past months', () => {
        const operations = [
            operation({ id: 'now', date: new Date(2026, 8, 10), amount: 140, categoryId: 'restaurant' }),
            operation({ id: 'aug', date: new Date(2026, 7, 12), amount: 100, categoryId: 'restaurant' }),
            operation({ id: 'aug-late', date: new Date(2026, 7, 30), amount: 500, categoryId: 'restaurant' }),
            operation({ id: 'jul', date: new Date(2026, 6, 2), amount: 60, categoryId: 'groceries' })
        ];
        const comparison = compareMonth(document(operations), NOW);
        const restaurant = comparison.categories.find((entry) => entry.category.id === 'restaurant');
        const groceries = comparison.categories.find((entry) => entry.category.id === 'groceries');

        expect(comparison.referenceCount).toBe(2);
        expect(comparison.spent).toBeCloseTo(140);
        expect(comparison.usual).toBeCloseTo(80);
        expect(comparison.change).toBeCloseTo(0.75);
        expect(restaurant?.usual).toBeCloseTo(50);
        expect(restaurant?.change).toBeCloseTo(1.8);
        expect(groceries?.change).toBeCloseTo(-1);
        expect(comparison.categories[0]?.category.id).toBe('restaurant');
    });

    it('has nothing to compare against without history', () => {
        const comparison = compareMonth(document([operation({ id: 'a', date: new Date(2026, 8, 2) })]), NOW);

        expect(comparison.referenceCount).toBe(0);
        expect(comparison.change).toBeNull();
        expect(comparison.categories[0]?.change).toBeNull();
    });
});
