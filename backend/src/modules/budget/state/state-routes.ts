import type { FastifyInstance } from 'fastify';
import stateController from 'src/modules/budget/state/state-controller';

/**
 * @function stateRoutes
 * @description Defines the budget-document route: reading the whole document at once. Writes go through the routes of
 * each kind of entry (operations, categories, settings, history).
 */
export default function (fastify: FastifyInstance): void {
    fastify.get('/', {
        preHandler: [fastify.identity.authenticate]
    }, stateController.getState);
}
