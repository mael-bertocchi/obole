import type { Maybe } from 'models';
import type { BudgetServices } from 'modules/budget/budget-models';
import { createContext } from 'react';

/**
 * @constant BudgetContext
 * @description The context sharing the budget and the rates with the budget's pages and its tile
 */
export const BudgetContext = createContext<Maybe<BudgetServices>>(null);
