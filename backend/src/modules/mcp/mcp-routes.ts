import type { FastifyInstance } from 'fastify';
import mcpController from 'src/modules/mcp/mcp-controller';

/**
 * @constant MCP_LIMIT
 * @description How many messages a client may send per minute.
 */
const MCP_LIMIT = { rateLimit: { max: 120, timeWindow: '1 minute' } };

/**
 * @function mcpRoutes
 * @description Defines the MCP endpoint, through which Claude and other MCP clients read and change the budget and the
 * watchlist as the owner, once authorized with OAuth.
 */
export default function (fastify: FastifyInstance): void {
    fastify.post('/', {
        config: MCP_LIMIT,
        preHandler: [mcpController.authenticate]
    }, mcpController.message);

    fastify.get('/', mcpController.unsupported);

    fastify.delete('/', mcpController.unsupported);
}
