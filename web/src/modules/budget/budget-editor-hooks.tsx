import type { Maybe } from 'models';
import { BudgetEditorContext } from 'modules/budget/budget-editor-context';
import type { BudgetEditorContextProps } from 'modules/budget/budget-models';
import { useContext } from 'react';

/**
 * @function useBudgetEditorContext
 * @description A custom hook to open the operation sheet
 *
 * @returns {BudgetEditorContextProps} What the sheet is open on, and how to open and close it
 */
export function useBudgetEditorContext(): BudgetEditorContextProps {
    const context: Maybe<BudgetEditorContextProps> = useContext(BudgetEditorContext);

    if (!context) {
        throw new Error('The budget editor context must be used within the budget editor provider');
    }
    return context;
}
