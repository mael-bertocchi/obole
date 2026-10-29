import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { AssistantStatus } from 'src/modules/assistant/assistant-status';

/**
 * @function assistantPlugin
 * @description Decorates the assistant's availability, and checks the Gemini key and model once the server is ready,
 * without holding up its start
 */
export default fp(function (fastify: FastifyInstance): Promise<void> {
    const assistant = new AssistantStatus(fastify.variables, fastify.log);

    fastify.decorate('assistant', assistant);

    fastify.addHook('onReady', () => {
        void assistant.check();

        return Promise.resolve();
    });

    return Promise.resolve();
}, {
    name: 'assistant',
    dependencies: ['environment']
});
