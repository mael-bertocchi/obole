import type { BudgetDocument, RateSnapshot, StoredState } from 'modules/budget/budget-models';
import { RateSnapshotSchema, StoredStateSchema } from 'modules/budget/budget-models';
import { fetchWithAuthentication } from 'utils/request';

/**
 * @function getState
 * @description Reads the whole budget and its revision
 *
 * @returns {Promise<StoredState>} The budget, as the server holds it
 */
async function getState(): Promise<StoredState> {
    return await fetchWithAuthentication('/v1/budget/state', { method: 'GET' }, StoredStateSchema);
}

/**
 * @function putState
 * @description Stores the whole budget on top of the revision it was edited from. Rejects with a conflict when the
 * server has moved past it.
 *
 * @param {BudgetDocument} document The budget to store
 * @param {number} revision The revision it was edited from
 * @returns {Promise<StoredState>} The budget, as the server now holds it
 */
async function putState(document: BudgetDocument, revision: number): Promise<StoredState> {
    return await fetchWithAuthentication('/v1/budget/state', { method: 'PUT', body: JSON.stringify({ ...document, revision }) }, StoredStateSchema);
}

/**
 * @function getRates
 * @description Reads the latest reference rates, in euros per unit
 *
 * @returns {Promise<RateSnapshot>} The rates
 */
async function getRates(): Promise<RateSnapshot> {
    return await fetchWithAuthentication('/v1/budget/rates', { method: 'GET' }, RateSnapshotSchema);
}

/**
 * @function getRatesOn
 * @description Reads the reference rates of one day, in euros per unit
 *
 * @param {string} day The day, as `YYYY-MM-DD`
 * @returns {Promise<RateSnapshot>} The rates
 */
async function getRatesOn(day: string): Promise<RateSnapshot> {
    return await fetchWithAuthentication(`/v1/budget/rates/${day}`, { method: 'GET' }, RateSnapshotSchema);
}

export default {
    getState,
    putState,
    getRates,
    getRatesOn
};
