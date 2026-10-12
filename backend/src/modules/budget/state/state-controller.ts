import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { StatePushRequest } from 'src/modules/budget/state/state-models';
import { pullState, pushState } from 'src/modules/budget/state/state-service';

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

/**
 * @function putState
 * @description Replaces the owner's whole budget document with the pushed one and returns the stored result. Answers
 * 409 when the push was edited from a revision the server has since moved past.
 *
 * @returns {Promise<void>} Resolves when the stored document is sent.
 */
async function putState(request: FastifyRequest<StatePushRequest>, reply: FastifyReply): Promise<void> {
    const state = await pushState(request.server.prisma, request.body);

    reply.status(StatusCodes.OK).send({ data: state });
}

export default {
    getState,
    putState
};
