import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { RatesDayRequest } from 'src/modules/budget/rates/rates-models';
import { pullRates, pullRatesForDay } from 'src/modules/budget/rates/rates-service';

/**
 * @function getRates
 * @description Returns the current euro reference rates, refreshed from the upstream provider when stale.
 *
 * @returns {Promise<void>} Resolves when the rate snapshot is sent.
 */
async function getRates(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const rates = await pullRates(request.server.prisma, request.log);

    reply.status(StatusCodes.OK).send({ data: rates });
}

/**
 * @function getRatesForDay
 * @description Returns the reference rates that applied on one past day, for pricing an operation at the rate
 * of the day it actually happened on.
 *
 * @returns {Promise<void>} Resolves when the rate snapshot is sent.
 */
async function getRatesForDay(request: FastifyRequest<RatesDayRequest>, reply: FastifyReply): Promise<void> {
    const rates = await pullRatesForDay(request.server.prisma, request.log, request.params.date);

    reply.status(StatusCodes.OK).send({ data: rates });
}

export default {
    getRates,
    getRatesForDay
};
