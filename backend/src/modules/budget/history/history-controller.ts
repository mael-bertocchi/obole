import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { HistoryDeleteRequest, HistoryWriteRequest } from 'src/modules/budget/history/history-models';
import { deleteMonth, storeMonth } from 'src/modules/budget/history/history-service';

/**
 * @function store
 * @description Freezes the budget of a finished month.
 *
 * @returns {Promise<void>} Resolves when the stored budget is sent.
 */
async function store(request: FastifyRequest<HistoryWriteRequest>, reply: FastifyReply): Promise<void> {
    const budget = await storeMonth(request.server.prisma, request.params.month, request.body);

    reply.status(StatusCodes.OK).send({ data: budget });
}

/**
 * @function remove
 * @description Forgets the budget frozen against a month.
 *
 * @returns {Promise<void>} Resolves when the answer is sent.
 */
async function remove(request: FastifyRequest<HistoryDeleteRequest>, reply: FastifyReply): Promise<void> {
    await deleteMonth(request.server.prisma, request.params.month);

    reply.status(StatusCodes.NO_CONTENT).send();
}

export default {
    store,
    remove
};
