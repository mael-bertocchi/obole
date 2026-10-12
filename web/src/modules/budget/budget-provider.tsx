import type { Maybe } from 'models';
import { BudgetContext } from 'modules/budget/budget-context';
import type { BudgetProviderProps, BudgetServices } from 'modules/budget/budget-models';
import { ExchangeRates } from 'modules/budget/budget-rates';
import budgetService from 'modules/budget/budget-service';
import { BudgetStore } from 'modules/budget/budget-store';
import type { JSX } from 'react';
import { IDENTITY_SESSION_ENDED_EVENT } from 'utils/request';

/**
 * @var shared
 * @description The one budget the app and its tile on the home page share, built the first time either shows
 */
let shared: Maybe<BudgetServices> = null;

/**
 * @function sharedServices
 * @description The shared budget and rates, built on first use. The budget is forgotten once the session is over.
 *
 * @returns {BudgetServices} The services
 */
function sharedServices(): BudgetServices {
    if (shared === null) {
        const services: BudgetServices = { store: new BudgetStore(budgetService), rates: new ExchangeRates(budgetService) };

        window.addEventListener(IDENTITY_SESSION_ENDED_EVENT, () => services.store.reset());
        shared = services;
    }

    return shared;
}

/**
 * @function BudgetProvider
 * @description A context provider sharing the budget and the rates with the budget's pages, or its tile
 *
 * @param {BudgetProviderProps} props The provider props
 * @returns {JSX.Element} The budget provider component
 */
export function BudgetProvider(props: BudgetProviderProps): JSX.Element {
    return (
        <BudgetContext.Provider value={sharedServices()}>
            {props.children}
        </BudgetContext.Provider>
    );
}
