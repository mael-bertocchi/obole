import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { ConversationRequest } from 'src/modules/assistant/assistant-models';
import { converse } from 'src/modules/assistant/assistant-service';

/**
 * @function message
 * @description Answers the owner's latest message, with the changes the assistant suggests.
 *
 * @returns {Promise<void>} Resolves when the answer is sent.
 */
async function message(request: FastifyRequest<ConversationRequest>, reply: FastifyReply): Promise<void> {
    const answer = await converse(request.server.prisma, request.server.variables, request.log, request.body);

    reply.status(StatusCodes.OK).send({ data: answer });
}

export default {
    message
};
