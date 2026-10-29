import type { ProposalServices } from 'modules/assistant/assistant-actions';
import { applyProposal } from 'modules/assistant/assistant-actions';
import type { BudgetDocument, StoredState } from 'modules/budget/budget-models';
import { ExchangeRates } from 'modules/budget/budget-rates';
import { BudgetStore } from 'modules/budget/budget-store';
import type { WatchlistServer } from 'modules/watchlist/watchlist-models';
import { WatchlistStore } from 'modules/watchlist/watchlist-store';
import { describe, expect, it, vi } from 'vitest';

import { unusedServer } from '../../support/budget-server';
import { document, operation } from '../../support/fixtures';

/**
 * @interface Harness
 * @description The services a suggestion goes through, over a fake server, and what that server took
 */
interface Harness {
    services: ProposalServices; /*!< The services */
    stored: () => BudgetDocument; /*!< The budget the server holds now */
    updateEntry: ReturnType<typeof vi.fn>; /*!< The watchlist changes it took */
}

/**
 * @function harness
 * @description The budget and the watchlist over a fake server holding the given budget, with a franc worth 1.05 euros
 */
function harness(initial: BudgetDocument): Harness {
    let state: StoredState = { ...initial, revision: 1 };
    const budgetServer = {
        ...unusedServer(),
        getState: vi.fn(() => Promise.resolve(structuredClone(state))),
        createOperation: vi.fn((created: BudgetDocument['operations'][number]) => {
            state = { ...state, operations: [...state.operations, created], revision: state.revision + 1 };
            return Promise.resolve();
        }),
        updateOperation: vi.fn((changed: BudgetDocument['operations'][number]) => {
            state = { ...state, operations: state.operations.map((entry) => (entry.id === changed.id ? changed : entry)), revision: state.revision + 1 };
            return Promise.resolve();
        }),
        deleteOperation: vi.fn((id: string) => {
            state = { ...state, operations: state.operations.filter((entry) => entry.id !== id), revision: state.revision + 1 };
            return Promise.resolve();
        }),
        getRatesOn: vi.fn((day: string) => Promise.resolve({ quoteDate: day, fetchedAt: new Date(), rates: { CHF: 1.05 } }))
    };
    const updateEntry = vi.fn(() => Promise.reject(new Error('Not stubbed')));
    const watchlistServer: WatchlistServer = {
        getEntries: vi.fn(() => Promise.resolve([])),
        addEntry: vi.fn(() => Promise.reject(new Error('Not used'))),
        updateEntry,
        removeEntry: vi.fn(() => Promise.reject(new Error('Not used'))),
        getGenres: vi.fn(() => Promise.resolve([]))
    };

    return {
        services: { budget: { store: new BudgetStore(budgetServer), rates: new ExchangeRates(budgetServer) }, watchlist: new WatchlistStore(watchlistServer) },
        stored: () => state,
        updateEntry
    };
}

/**
 * @function settle
 * @description Lets the store's queued sends run
 */
async function settle(): Promise<void> {
    for (let turn = 0; turn < 30; turn += 1) {
        await Promise.resolve();
    }
}

/**
 * @function yesterday
 * @description Yesterday, as `YYYY-MM-DD`
 */
function yesterday(): string {
    const day = new Date();

    day.setDate(day.getDate() - 1);

    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

describe('applyProposal', () => {
    it('logs a suggested operation through the budget, priced at its day’s rate with the bank’s markup', async () => {
        const { services, stored } = harness(document());

        await services.budget.store.refresh();
        await applyProposal(services, { kind: 'createOperation', id: '0d9e8f7a-6b5c-4d3e-8f1a-2b3c4d5e6f70', draft: { date: yesterday(), name: 'Déjeuner', categoryId: 'restaurant', amount: 12.5, currencyCode: 'CHF', location: 'Genève' } });
        await settle();

        expect(stored().operations).toEqual([expect.objectContaining({ id: '0D9E8F7A-6B5C-4D3E-8F1A-2B3C4D5E6F70', name: 'Déjeuner', location: 'Genève', currencyCode: 'CHF' })]);
        expect(stored().operations[0]?.rateToEuro).toBeCloseTo(1.0605);
    });

    it('refuses a suggested operation dated in the future', async () => {
        const { services } = harness(document());
        const tomorrow = new Date();

        tomorrow.setDate(tomorrow.getDate() + 2);

        const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

        await expect(applyProposal(services, { kind: 'createOperation', id: 'A', draft: { date: day, name: 'Plus tard', categoryId: 'fun', amount: 5, currencyCode: 'EUR' } })).rejects.toThrow();
    });

    it('changes only what the suggestion names, keeping the operation’s time', async () => {
        const logged = operation({ id: 'A', date: new Date(2026, 9, 20, 19, 45), name: 'Monoprix', amount: 40 });
        const { services, stored } = harness(document([logged]));

        await applyProposal(services, { kind: 'updateOperation', operation: { id: 'A', date: logged.date, name: 'Monoprix', categoryId: 'groceries', amount: 40, currencyCode: 'EUR', euroAmount: 40 }, changes: { amount: 42.5 } });
        await settle();

        expect(stored().operations[0]).toMatchObject({ id: 'A', name: 'Monoprix', amount: 42.5, date: logged.date });
    });

    it('moves a suggested deletion through the budget’s sync', async () => {
        const logged = operation({ id: 'A', date: new Date(2026, 9, 20, 19, 45) });
        const { services, stored } = harness(document([logged]));

        await services.budget.store.refresh();
        await applyProposal(services, { kind: 'deleteOperation', operation: { id: 'A', date: logged.date, name: 'Operation', categoryId: 'groceries', amount: 10, currencyCode: 'EUR', euroAmount: 10 } });
        await settle();

        expect(stored().operations).toEqual([]);
    });

    it('rates a title through the watchlist', async () => {
        const { services, updateEntry } = harness(document());

        updateEntry.mockRejectedValueOnce(new Error('Stop here'));

        await expect(applyProposal(services, { kind: 'rateTitle', entryId: 'E', title: 'Dune', rating: 9, comment: 'Superbe.', watchedAt: yesterday() })).rejects.toThrow('Stop here');
        expect(updateEntry).toHaveBeenCalledWith('E', expect.objectContaining({ rating: 9, comment: 'Superbe.' }));
    });
});
