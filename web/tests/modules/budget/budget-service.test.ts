import budgetService from 'modules/budget/budget-service';
import { fetchWithAuthentication } from 'utils/request';
import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/request', () => ({ fetchWithAuthentication: vi.fn(() => Promise.resolve({})) }));

describe('budgetService', () => {
    it('sends the budget’s requests under its own path, through the portal’s session', async () => {
        const document = { categories: [], operations: [], budget: { monthlyLimit: 3000 }, budgetHistory: {} };

        await budgetService.getState();
        await budgetService.putState(document, 4);
        await budgetService.getRates();
        await budgetService.getRatesOn('2026-10-12');

        const calls = vi.mocked(fetchWithAuthentication).mock.calls;

        expect(calls.map(([path, init]) => [path, init.method])).toEqual([
            ['/v1/budget/state', 'GET'],
            ['/v1/budget/state', 'PUT'],
            ['/v1/budget/rates', 'GET'],
            ['/v1/budget/rates/2026-10-12', 'GET']
        ]);
        const body = calls[1]?.[1].body;

        expect(typeof body === 'string' ? JSON.parse(body) : null).toEqual({ ...document, revision: 4 });
    });
});
