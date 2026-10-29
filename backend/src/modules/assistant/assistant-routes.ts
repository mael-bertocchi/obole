import type { FastifyInstance } from 'fastify';
import assistantController from 'src/modules/assistant/assistant-controller';
import type { ConversationRequest } from 'src/modules/assistant/assistant-models';
import { ConversationSchema } from 'src/modules/assistant/assistant-models';

/**
 * @constant ASSISTANT_LIMIT
 * @description How often the assistant may be asked, since every message costs model calls.
 */
const ASSISTANT_LIMIT = { rateLimit: { max: 20, timeWindow: '1 minute' } };

/**
 * @function assistantRoutes
 * @description Defines the assistant's routes: whether it can answer, and one message of a conversation, answered with
 * the changes it suggests.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get('/status', {
        preHandler: [fastify.identity.authenticate]
    }, assistantController.status);

    fastify.post<ConversationRequest>('/messages', {
        preHandler: [fastify.identity.authenticate],
        config: ASSISTANT_LIMIT,
        schema: {
            body: ConversationSchema
        }
    }, assistantController.message);
}
