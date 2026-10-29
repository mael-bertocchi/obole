import type { FastifyInstance } from 'fastify';
import categoriesController from 'src/modules/budget/categories/categories-controller';
import type { CategoryDeleteRequest, CategoryWriteRequest } from 'src/modules/budget/categories/categories-models';
import { CategoryParamsSchema, CategoryWriteSchema } from 'src/modules/budget/categories/categories-models';

/**
 * @function categoriesRoutes
 * @description Defines the routes of the categories: storing one under its id, removing one.
 */
export default function (fastify: FastifyInstance): void {
    fastify.put<CategoryWriteRequest>('/:categoryId', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: CategoryParamsSchema,
            body: CategoryWriteSchema
        }
    }, categoriesController.store);

    fastify.delete<CategoryDeleteRequest>('/:categoryId', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: CategoryParamsSchema
        }
    }, categoriesController.remove);
}
