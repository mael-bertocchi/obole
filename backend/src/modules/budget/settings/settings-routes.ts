import type { FastifyInstance } from 'fastify';
import settingsController from 'src/modules/budget/settings/settings-controller';
import type { SettingsWriteRequest } from 'src/modules/budget/settings/settings-models';
import { BudgetSettingsSchema } from 'src/modules/budget/state/state-models';

/**
 * @function settingsRoutes
 * @description Defines the route of the budget settings: storing the monthly budget.
 */
export default function (fastify: FastifyInstance): void {
    fastify.put<SettingsWriteRequest>('/', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            body: BudgetSettingsSchema
        }
    }, settingsController.store);
}
