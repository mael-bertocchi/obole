import type { FastifyInstance } from 'fastify';
import historyController from 'src/modules/budget/history/history-controller';
import type { HistoryDeleteRequest, HistoryWriteRequest } from 'src/modules/budget/history/history-models';
import { HistoryParamsSchema } from 'src/modules/budget/history/history-models';
import { MonthlyBudgetSchema } from 'src/modules/budget/state/state-models';

/**
 * @function historyRoutes
 * @description Defines the routes of the budget history: freezing the budget of a finished month, forgetting it.
 */
export default function (fastify: FastifyInstance): void {
    fastify.put<HistoryWriteRequest>('/:month', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: HistoryParamsSchema,
            body: MonthlyBudgetSchema
        }
    }, historyController.store);

    fastify.delete<HistoryDeleteRequest>('/:month', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: HistoryParamsSchema
        }
    }, historyController.remove);
}
