import type { Maybe } from 'models';
import { EURO } from 'modules/budget/budget-currencies';
import { dayKey } from 'modules/budget/budget-dates';
import type { BudgetDocument } from 'modules/budget/budget-models';
import type { ExchangeRates } from 'modules/budget/budget-rates';
import type { Change } from 'modules/budget/budget-store';

/**
 * @constant WINDOW_DAYS
 * @description How far back to look. Only recent operations can still be waiting on their day's rate.
 */
const WINDOW_DAYS = 7;

/**
 * @constant EPSILON
 * @description The smallest rate difference worth rewriting an operation for.
 */
const EPSILON = 1e-9;

/**
 * @function repriceRecent
 * @description Prices recent foreign operations again at the rate published for their own day. One logged before the
 * day's publication (around 16:00 CET) was priced at the previous day's rate; the app corrects it the same way.
 *
 * @param {BudgetDocument} document The budget.
 * @param {ExchangeRates} rates The rates.
 * @param {Date} now The current date.
 *
 * @returns {Promise<Maybe<Change>>} The correction to apply, or null when every rate is already right.
 */
export async function repriceRecent(document: BudgetDocument, rates: ExchangeRates, now: Date = new Date()): Promise<Maybe<Change>> {
    const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - WINDOW_DAYS);
    const candidates = document.operations.filter((operation) => operation.date >= horizon && operation.currencyCode !== EURO.code);

    await Promise.all([...new Set(candidates.map((operation) => dayKey(operation.date)))].map(async (day) => await rates.load(day)));

    const corrections = new Map<string, { rate: number; currencyCode: string; day: string }>();

    for (const operation of candidates) {
        const day = dayKey(operation.date);
        const published = rates.rate(operation.currencyCode, day);

        if (published !== null && Math.abs(published - operation.rateToEuro) > EPSILON) {
            corrections.set(operation.id, { rate: published, currencyCode: operation.currencyCode, day });
        }
    }

    if (corrections.size === 0) {
        return null;
    }

    return (current) => ({
        ...current,
        operations: current.operations.map((operation) => {
            const correction = corrections.get(operation.id);
            const stillApplies = correction !== undefined && correction.currencyCode === operation.currencyCode && correction.day === dayKey(operation.date);

            return stillApplies ? { ...operation, rateToEuro: correction.rate, updatedAt: new Date() } : operation;
        })
    });
}
