import type { AssistantOperationDraft, Proposal } from 'modules/assistant/assistant-models';
import { EURO } from 'modules/budget/budget-currencies';
import { dayKey, isFutureDay, parseDayKey, withTimeOf } from 'modules/budget/budget-dates';
import type { BudgetServices, Operation } from 'modules/budget/budget-models';
import { deleteOperation, toOperation, upsertOperation } from 'modules/budget/budget-operations';
import { t } from 'modules/language/language-service';
import type { WatchlistStore } from 'modules/watchlist/watchlist-store';
import { UserError } from 'utils/errors';

/**
 * @interface ProposalServices
 * @description What carrying out a suggestion goes through: the same budget and watchlist the apps use, so a confirmed
 * suggestion is an ordinary edit, synced and undoable like one made by hand.
 */
export interface ProposalServices {
    budget: BudgetServices; /*!< The budget and the rates */
    watchlist: WatchlistStore; /*!< The watchlist */
}

/**
 * @function dayOf
 * @description The moment an operation dated on a day is logged at: that day, at the time it is now. A day to come is
 * refused, as in the editor.
 *
 * @param {string} day The day, as `YYYY-MM-DD`
 * @returns {Date} The moment
 */
function dayOf(day: string): Date {
    const parsed = parseDayKey(day);
    const now = new Date();

    if (parsed === null || isFutureDay(parsed, now)) {
        throw new UserError(t('assistant.invalidDate'));
    }

    return withTimeOf(parsed, now);
}

/**
 * @function rateOn
 * @description The rate a currency had on a day, bank markup included, loading that day's rates if need be.
 *
 * @param {BudgetServices} budget The budget and the rates
 * @param {string} code The currency
 * @param {string} day The day, as `YYYY-MM-DD`
 * @returns {Promise<number>} Euros per unit
 */
async function rateOn(budget: BudgetServices, code: string, day: string): Promise<number> {
    if (code === EURO.code) {
        return 1;
    }

    await budget.rates.load(day);

    const rate = budget.rates.rate(code, day);

    if (rate === null) {
        throw new UserError(budget.rates.failure(day) ?? t('assistant.rateMissing', { code }));
    }

    return rate;
}

/**
 * @function operationFrom
 * @description The operation a suggested draft describes, priced at its day's rate.
 *
 * @param {BudgetServices} budget The budget and the rates
 * @param {AssistantOperationDraft} draft The draft
 * @param {string} id The operation's id
 * @param {boolean} isRecurring Whether it repeats every month
 * @returns {Promise<Operation>} The operation
 */
async function operationFrom(budget: BudgetServices, draft: AssistantOperationDraft, id: string, isRecurring: boolean): Promise<Operation> {
    const rate = await rateOn(budget, draft.currencyCode, draft.date);

    return toOperation({
        name: draft.name,
        description: draft.description ?? '',
        amount: draft.amount,
        currencyCode: draft.currencyCode,
        categoryId: draft.categoryId,
        date: dayOf(draft.date),
        location: draft.location ?? '',
        isOnline: draft.isOnline ?? false,
        isRecurring
    }, rate, id);
}

/**
 * @function draftOf
 * @description An existing operation, as a draft a suggested change applies to.
 *
 * @param {Operation} operation The operation
 * @returns {AssistantOperationDraft} Its draft
 */
function draftOf(operation: Operation): AssistantOperationDraft {
    return {
        date: dayKey(operation.date),
        name: operation.name,
        description: operation.description,
        categoryId: operation.categoryId,
        location: operation.location,
        amount: operation.amount,
        currencyCode: operation.currencyCode,
        isOnline: operation.isOnline
    };
}

/**
 * @function applyProposal
 * @description Carries out a suggestion the owner confirmed, as the apps would: an operation logged, changed or moved to
 * the trash goes through the budget's own sync, a rating or a new title through the watchlist.
 *
 * @param {ProposalServices} services The budget and the watchlist
 * @param {Proposal} proposal The suggestion
 * @returns {Promise<void>} Resolves once it is carried out; rejects with a message for the owner
 */
export async function applyProposal(services: ProposalServices, proposal: Proposal): Promise<void> {
    const { store } = services.budget;

    switch (proposal.kind) {
        case 'createOperation': {
            const operation = await operationFrom(services.budget, proposal.draft, proposal.id.toUpperCase(), false);

            store.apply((document) => upsertOperation(document, operation));
            return;
        }
        case 'updateOperation': {
            await store.refresh();

            const existing = store.getSnapshot().document?.operations.find((candidate) => candidate.id === proposal.operation.id);

            if (existing === undefined) {
                throw new UserError(t('operation.deletedElsewhere'));
            }

            const changed = await operationFrom(services.budget, { ...draftOf(existing), ...proposal.changes }, existing.id, existing.isRecurring);
            const operation = { ...changed, date: proposal.changes.date === undefined ? existing.date : changed.date };

            store.apply((document) => {
                if (!document.operations.some((candidate) => candidate.id === operation.id)) {
                    throw new UserError(t('operation.deletedElsewhere'));
                }

                return upsertOperation(document, operation);
            });
            return;
        }
        case 'deleteOperation':
            store.apply((document) => deleteOperation(document, proposal.operation.id));
            return;
        case 'rateTitle':
            await services.watchlist.update(proposal.entryId, { watchedAt: dayOf(proposal.watchedAt), rating: proposal.rating, comment: proposal.comment });
            return;
        case 'addTitle':
            await services.watchlist.add({ mediaType: proposal.mediaType, tmdbId: proposal.tmdbId });
            return;
    }
}
