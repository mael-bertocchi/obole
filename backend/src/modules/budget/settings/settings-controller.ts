import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { SettingsWriteRequest } from 'src/modules/budget/settings/settings-models';
import { storeSettings } from 'src/modules/budget/settings/settings-service';

/**
 * @function store
 * @description Stores the budget settings.
 *
 * @returns {Promise<void>} Resolves when the stored settings are sent.
 */
async function store(request: FastifyRequest<SettingsWriteRequest>, reply: FastifyReply): Promise<void> {
    const settings = await storeSettings(request.server.prisma, request.body);

    reply.status(StatusCodes.OK).send({ data: settings });
}

export default {
    store
};
