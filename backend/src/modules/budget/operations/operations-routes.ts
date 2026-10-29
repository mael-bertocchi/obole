import type { FastifyInstance } from 'fastify';
import operationsController from 'src/modules/budget/operations/operations-controller';
import type { OperationCreateRequest, OperationTargetRequest, OperationUpdateRequest } from 'src/modules/budget/operations/operations-models';
import { OperationCreateSchema, OperationParamsSchema, OperationUpdateSchema } from 'src/modules/budget/operations/operations-models';

/**
 * @function operationsRoutes
 * @description Defines the routes of the operations: logging one, changing one, moving one to the trash, listing the
 * trash and restoring from it.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get('/trash', {
        preHandler: [fastify.identity.authenticate]
    }, operationsController.trash);

    fastify.post<OperationCreateRequest>('/', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            body: OperationCreateSchema
        }
    }, operationsController.create);

    fastify.patch<OperationUpdateRequest>('/:operationId', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: OperationParamsSchema,
            body: OperationUpdateSchema
        }
    }, operationsController.update);

    fastify.delete<OperationTargetRequest>('/:operationId', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: OperationParamsSchema
        }
    }, operationsController.remove);

    fastify.post<OperationTargetRequest>('/:operationId/restore', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: OperationParamsSchema
        }
    }, operationsController.restore);
}
