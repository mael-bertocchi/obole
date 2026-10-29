import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { pullState } from 'src/modules/budget/state/state-service';

/**
 * @function getState
 * @description Returns the owner's whole budget document (categories, operations, budget settings) and its revision.
 *
 * @returns {Promise<void>} Resolves when the document is sent.
 */
async function getState(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const state = await pullState(request.server.prisma);

    reply.status(StatusCodes.OK).send({ data: state });
}

export default {
    getState
};
