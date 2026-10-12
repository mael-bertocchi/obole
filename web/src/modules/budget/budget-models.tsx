import type { Maybe } from 'models';
import type { ExchangeRates } from 'modules/budget/budget-rates';
import type { BudgetStore } from 'modules/budget/budget-store';
import type { ReactNode } from 'react';
import { z } from 'zod';

/**
 * @constant CategorySchema
 * @description Zod schema for one budget category.
 */
export const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    symbol: z.string(),
    colorHex: z.number().int(),
    monthlyLimit: z.number()
});

/**
 * @constant OperationSchema
 * @description Zod schema for one logged operation.
 */
export const OperationSchema = z.object({
    id: z.string(),
    date: z.coerce.date(),
    name: z.string(),
    description: z.string().nullish(),
    categoryId: z.string(),
    location: z.string().nullish(),
    amount: z.number(),
    currencyCode: z.string(),
    rateToEuro: z.number(),
    isOnline: z.boolean(),
    isRecurring: z.boolean(),
    updatedAt: z.coerce.date().optional()
});

/**
 * @constant MonthlyBudgetSchema
 * @description Zod schema for the budget frozen against one finished month.
 */
export const MonthlyBudgetSchema = z.object({
    monthlyLimit: z.number(),
    categoryLimits: z.record(z.string(), z.number())
});

/**
 * @constant BudgetDocumentSchema
 * @description Zod schema for the whole budget document, as the app and the backend exchange it.
 */
export const BudgetDocumentSchema = z.object({
    categories: z.array(CategorySchema),
    operations: z.array(OperationSchema),
    budget: z.object({ monthlyLimit: z.number() }),
    budgetHistory: z.record(z.string(), MonthlyBudgetSchema)
});

/**
 * @constant StoredStateSchema
 * @description Zod schema for the document as the backend stores it, with the revision a write has to name.
 */
export const StoredStateSchema = BudgetDocumentSchema.extend({
    revision: z.number().int()
});

/**
 * @constant RateSnapshotSchema
 * @description Zod schema for a set of reference rates: the euros one unit of each currency buys.
 */
export const RateSnapshotSchema = z.object({
    quoteDate: z.string(),
    fetchedAt: z.coerce.date(),
    rates: z.record(z.string(), z.number())
});

/**
 * @type Category
 * @description A spending category, with its monthly limit
 */
export type Category = z.infer<typeof CategorySchema>;

/**
 * @type Operation
 * @description An operation: an amount spent, in its currency and in euros
 */
export type Operation = z.infer<typeof OperationSchema>;

/**
 * @type MonthlyBudget
 * @description The budget frozen against one finished month
 */
export type MonthlyBudget = z.infer<typeof MonthlyBudgetSchema>;

/**
 * @type BudgetDocument
 * @description The whole budget, as the app and the page share it
 */
export type BudgetDocument = z.infer<typeof BudgetDocumentSchema>;

/**
 * @type StoredState
 * @description The whole budget as the server holds it, with its revision
 */
export type StoredState = z.infer<typeof StoredStateSchema>;

/**
 * @type RateSnapshot
 * @description A set of reference rates: the euros one unit of each currency buys
 */
export type RateSnapshot = z.infer<typeof RateSnapshotSchema>;

/**
 * @interface BudgetServer
 * @description The budget's routes on the portal's server, as the store and the rates use them
 */
export interface BudgetServer {
    getState: () => Promise<StoredState>; /*!< Reads the whole budget and its revision */
    putState: (document: BudgetDocument, revision: number) => Promise<StoredState>; /*!< Stores the whole budget on top of a revision */
    getRates: () => Promise<RateSnapshot>; /*!< Reads the latest reference rates */
    getRatesOn: (day: string) => Promise<RateSnapshot>; /*!< Reads one day's reference rates */
}

/**
 * @interface BudgetServices
 * @description The long-lived objects the budget shares between its pages and its tile on the home page
 */
export interface BudgetServices {
    store: BudgetStore; /*!< The budget */
    rates: ExchangeRates; /*!< The exchange rates */
}

/**
 * @interface BudgetProviderProps
 * @description Budget provider properties
 */
export interface BudgetProviderProps {
    children: ReactNode; /*!< The budget's pages, or its tile */
}

/**
 * @type BudgetEditorRoute
 * @description What the operation sheet is open on
 */
export type BudgetEditorRoute = { kind: 'new' } | { kind: 'edit'; id: string };

/**
 * @interface BudgetEditorContextProps
 * @description Opening the operation sheet from any page of the budget
 */
export interface BudgetEditorContextProps {
    route: Maybe<BudgetEditorRoute>; /*!< What the sheet is open on, none while closed */
    openNew: () => void; /*!< Opens it on a new operation */
    openEdit: (id: string) => void; /*!< Opens it on an existing one */
    close: () => void; /*!< Closes it */
}

/**
 * @interface BudgetEditorProviderProps
 * @description Budget editor provider properties
 */
export interface BudgetEditorProviderProps {
    children: ReactNode; /*!< The budget's pages */
}
