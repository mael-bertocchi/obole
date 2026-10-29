import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { ConversationRequest } from 'src/modules/assistant/assistant-models';
import { converse } from 'src/modules/assistant/assistant-service';

/**
 * @function message
 * @description Answers the owner's latest message, with the changes the assistant suggests. What the conversation meets
 * corrects the assistant's availability.
 *
 * @returns {Promise<void>} Resolves when the answer is sent.
 */
async function message(request: FastifyRequest<ConversationRequest>, reply: FastifyReply): Promise<void> {
    try {
        const answer = await converse(request.server.prisma, request.server.variables, request.log, request.body);

        request.server.assistant.noteAnswer();
        reply.status(StatusCodes.OK).send({ data: answer });
    } catch (error: unknown) {
        request.server.assistant.noteFailure(error);

        throw error;
    }
}

/**
 * @function status
 * @description Tells whether the assistant can answer, so the portal and the app can turn it off when it can't.
 *
 * @returns {Promise<void>} Resolves when the answer is sent.
 */
async function status(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const availability = await request.server.assistant.read();

    reply.status(StatusCodes.OK).send({ data: availability });
}

export default {
    message,
    status
};
