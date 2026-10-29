import type { RequestGenericInterface } from 'fastify';
import type { BudgetSettingsSchema } from 'src/modules/budget/state/state-models';
import type { z } from 'zod';

/**
 * @interface SettingsWriteRequest
 * @description Fastify request generic for storing the budget settings.
 *
 * @extends RequestGenericInterface
 */
export interface SettingsWriteRequest extends RequestGenericInterface {
    Body: BudgetSettings; /*!< The settings */
}

/**
 * @type BudgetSettings
 * @description The overall budget settings: the monthly budget.
 */
export type BudgetSettings = z.infer<typeof BudgetSettingsSchema>;
