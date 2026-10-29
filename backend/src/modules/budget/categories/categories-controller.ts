import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { CategoryDeleteRequest, CategoryWriteRequest } from 'src/modules/budget/categories/categories-models';
import { deleteCategory, storeCategory } from 'src/modules/budget/categories/categories-service';

/**
 * @function store
 * @description Creates a category or replaces what it holds.
 *
 * @returns {Promise<void>} Resolves when the stored category is sent.
 */
async function store(request: FastifyRequest<CategoryWriteRequest>, reply: FastifyReply): Promise<void> {
    const category = await storeCategory(request.server.prisma, request.params.categoryId, request.body);

    reply.status(StatusCodes.OK).send({ data: category });
}

/**
 * @function remove
 * @description Removes a category.
 *
 * @returns {Promise<void>} Resolves when the answer is sent.
 */
async function remove(request: FastifyRequest<CategoryDeleteRequest>, reply: FastifyReply): Promise<void> {
    await deleteCategory(request.server.prisma, request.params.categoryId);

    reply.status(StatusCodes.NO_CONTENT).send();
}

export default {
    store,
    remove
};
