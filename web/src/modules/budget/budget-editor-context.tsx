import type { Maybe } from 'models';
import type { BudgetEditorContextProps } from 'modules/budget/budget-models';
import { createContext } from 'react';

/**
 * @constant BudgetEditorContext
 * @description The context letting any page of the budget open the operation sheet
 */
export const BudgetEditorContext = createContext<Maybe<BudgetEditorContextProps>>(null);
