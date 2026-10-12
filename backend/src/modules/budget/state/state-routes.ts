import type { FastifyInstance } from 'fastify';
import stateController from 'src/modules/budget/state/state-controller';
import type { StatePushRequest } from 'src/modules/budget/state/state-models';
import { StatePushSchema } from 'src/modules/budget/state/state-models';

/**
 * @function stateRoutes
 * @description Defines the budget-document routes (read the whole document, replace the whole document).
 */
export default function (fastify: FastifyInstance): void {
    fastify.get('/', {
        preHandler: [fastify.identity.authenticate]
    }, stateController.getState);

    fastify.put<StatePushRequest>('/', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            body: StatePushSchema
        }
    }, stateController.putState);
}
