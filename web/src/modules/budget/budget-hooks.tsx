import type { Maybe } from 'models';
import { BudgetContext } from 'modules/budget/budget-context';
import type { BudgetDocument, BudgetServices } from 'modules/budget/budget-models';
import type { ExchangeRates } from 'modules/budget/budget-rates';
import { repriceRecent } from 'modules/budget/budget-reprice';
import type { BudgetSnapshot } from 'modules/budget/budget-store';
import { useContext, useEffect, useSyncExternalStore } from 'react';

/**
 * @constant CATCH_UP_EVERY
 * @description How often an open budget reads the server again, to show what the app wrote in the meantime
 */
const CATCH_UP_EVERY = 60 * 1000;

/**
 * @function useBudgetContext
 * @description A custom hook to access the budget context
 *
 * @returns {BudgetServices} The budget and the rates
 */
export function useBudgetContext(): BudgetServices {
    const context: Maybe<BudgetServices> = useContext(BudgetContext);

    if (!context) {
        throw new Error('The budget context must be used within the budget provider');
    }
    return context;
}

/**
 * @function useBudget
 * @description The budget as the page renders it, with where it stands with the server.
 */
export function useBudget(): BudgetSnapshot {
    const { store } = useBudgetContext();

    return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * @function useDocument
 * @description The budget itself. Only used under the budget's shell, which waits for the first read before rendering a page.
 */
export function useDocument(): BudgetDocument {
    const { document } = useBudget();

    if (document === null) {
        throw new Error('useDocument must be used once the budget is loaded');
    }

    return document;
}

/**
 * @function useRates
 * @description The exchange rates, re-rendering whenever new ones arrive.
 */
export function useRates(): ExchangeRates {
    const { rates } = useBudgetContext();

    useSyncExternalStore(rates.subscribe, rates.getVersion);

    return rates;
}

/**
 * @function useCatchUp
 * @description Keeps an open budget in step with the server: it reads the budget when it opens, when the page comes
 * back into view, when the connection returns and every minute while visible: the web version of the app reconciling
 * when it becomes active. The first read also re-prices recent foreign operations, as the app does.
 *
 * @param {BudgetServices} services The budget and the rates
 */
export function useCatchUp(services: BudgetServices): void {
    useEffect(() => {
        const { store, rates } = services;
        let hasRepriced = false;

        /**
         * @function catchUp
         * @description Reads the budget again, and re-prices recent foreign operations on the first read
         */
        const catchUp = async (): Promise<void> => {
            await store.refresh();

            const current = store.getSnapshot().document;

            if (!hasRepriced && current !== null) {
                hasRepriced = true;

                const correction = await repriceRecent(current, rates);

                if (correction !== null) {
                    store.apply(correction);
                }
            }
        };

        /**
         * @function whenVisible
         * @description Catches up, unless the page is hidden
         */
        const whenVisible = (): void => {
            if (window.document.visibilityState === 'visible') {
                void catchUp();
            }
        };

        /**
         * @function warnBeforeLeaving
         * @description Asks before closing the page while some edits haven't reached the server
         */
        const warnBeforeLeaving = (event: BeforeUnloadEvent): void => {
            if (store.getSnapshot().hasPendingChanges) {
                event.preventDefault();
            }
        };

        void catchUp();
        void rates.refreshLatest();

        const interval = window.setInterval(whenVisible, CATCH_UP_EVERY);

        window.addEventListener('focus', whenVisible);
        window.addEventListener('online', whenVisible);
        window.addEventListener('beforeunload', warnBeforeLeaving);
        window.document.addEventListener('visibilitychange', whenVisible);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', whenVisible);
            window.removeEventListener('online', whenVisible);
            window.removeEventListener('beforeunload', warnBeforeLeaving);
            window.document.removeEventListener('visibilitychange', whenVisible);
        };
    }, [services]);
}
