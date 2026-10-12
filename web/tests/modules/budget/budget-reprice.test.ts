import type { BudgetServer } from 'modules/budget/budget-models';
import { ExchangeRates } from 'modules/budget/budget-rates';
import { repriceRecent } from 'modules/budget/budget-reprice';
import { describe, expect, it, vi } from 'vitest';

import { document, NOW, operation } from '../../support/fixtures';

describe('repriceRecent', () => {
    const server: BudgetServer = {
        getState: vi.fn(() => Promise.reject(new Error('Not used'))),
        putState: vi.fn(() => Promise.reject(new Error('Not used'))),
        getRates: vi.fn(() => Promise.reject(new Error('Not used'))),
        getRatesOn: vi.fn((day: string) => Promise.resolve({ quoteDate: day, fetchedAt: NOW, rates: { USD: 0.9 } }))
    };
    const rates = new ExchangeRates(server);

    it('prices a recent foreign operation at its own day rate, markup included', async () => {
        const stale = operation({ id: 'A', date: new Date(2026, 8, 25, 12), amount: 10, currencyCode: 'USD', rateToEuro: 0.85 });
        const budget = document([stale, operation({ id: 'OLD', date: new Date(2026, 7, 1), currencyCode: 'USD', rateToEuro: 0.5 })]);
        const correction = await repriceRecent(budget, rates, NOW);
        const corrected = correction?.(budget);

        expect(corrected?.operations.find((entry) => entry.id === 'A')?.rateToEuro).toBeCloseTo(0.909);
        expect(corrected?.operations.find((entry) => entry.id === 'OLD')?.rateToEuro).toBe(0.5);
    });

    it('leaves an operation alone once its currency changed in the meantime', async () => {
        const stale = operation({ id: 'A', date: new Date(2026, 8, 25, 12), currencyCode: 'USD', rateToEuro: 0.85 });
        const correction = await repriceRecent(document([stale]), rates, NOW);
        const edited = document([{ ...stale, currencyCode: 'EUR', rateToEuro: 1 }]);

        expect(correction?.(edited).operations[0]?.rateToEuro).toBe(1);
    });

    it('has nothing to do when every rate is right', async () => {
        const right = operation({ id: 'A', date: new Date(2026, 8, 25, 12), currencyCode: 'USD', rateToEuro: 0.909 });

        expect(await repriceRecent(document([right]), rates, NOW)).toBeNull();
    });
});
