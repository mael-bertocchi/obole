import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { answerMcp } from 'src/modules/mcp/mcp-service';
import type { ToolContext } from 'src/modules/mcp/mcp-tools';
import { RequestError } from 'src/shared/models';
import { publicOrigin } from 'src/shared/public-origin';

/**
 * @constant LANGUAGE
 * @description The language the tools write titles and summaries in: the owner's.
 */
const LANGUAGE = 'fr';

/**
 * @function authenticate
 * @description Guards the MCP endpoint with a bearer access token. A client without one is told where to read how to
 * get one, as the MCP authorization spec asks.
 *
 * @returns {Promise<void>} Resolves when the token holds; rejects with 401 otherwise.
 */
async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
        await request.server.identity.authenticate(request, reply);
    } catch (error: unknown) {
        reply.header('WWW-Authenticate', `Bearer resource_metadata="${publicOrigin(request)}/.well-known/oauth-protected-resource/mcp"`);

        throw error;
    }
}

/**
 * @function message
 * @description Answers one MCP message, with the tools running as the owner.
 *
 * @returns {Promise<void>} Resolves when the answer is sent.
 */
async function message(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { prisma, variables } = request.server;
    const context: ToolContext = { prisma, variables, logger: request.log, language: LANGUAGE, today: new Date().toISOString().slice(0, 10) };
    const answer = await answerMcp(request, context);

    reply.status(answer.status).headers(answer.headers).send(answer.body);
}

/**
 * @function unsupported
 * @description Refuses the stream and session methods: the server keeps no session and answers each message on its own.
 *
 * @returns {Promise<void>} Never resolves; rejects with 405.
 */
function unsupported(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.header('Allow', 'POST');

    return Promise.reject(new RequestError(StatusCodes.METHOD_NOT_ALLOWED, 'Only POST is supported'));
}

export default {
    authenticate,
    message,
    unsupported
};
