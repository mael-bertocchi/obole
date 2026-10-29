import type { RequestGenericInterface } from 'fastify';
import type { MonthlyBudgetSchema } from 'src/modules/budget/state/state-models';
import { z } from 'zod';

/**
 * @constant HistoryParamsSchema
 * @description Zod schema for the month a request is about, as `YYYY-MM`.
 */
export const HistoryParamsSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/)
});

/**
 * @interface HistoryWriteRequest
 * @description Fastify request generic for freezing the budget of a finished month.
 *
 * @extends RequestGenericInterface
 */
export interface HistoryWriteRequest extends RequestGenericInterface {
    Params: z.infer<typeof HistoryParamsSchema>; /*!< The month */
    Body: MonthlyBudget; /*!< Its budget */
}

/**
 * @interface HistoryDeleteRequest
 * @description Fastify request generic for forgetting the budget frozen against a month.
 *
 * @extends RequestGenericInterface
 */
export interface HistoryDeleteRequest extends RequestGenericInterface {
    Params: z.infer<typeof HistoryParamsSchema>; /*!< The month */
}

/**
 * @type MonthlyBudget
 * @description The budget frozen against one finished month.
 */
export type MonthlyBudget = z.infer<typeof MonthlyBudgetSchema>;
