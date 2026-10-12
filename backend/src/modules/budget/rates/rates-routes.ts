import type { FastifyInstance } from 'fastify';
import ratesController from 'src/modules/budget/rates/rates-controller';
import type { RatesDayRequest } from 'src/modules/budget/rates/rates-models';
import { RatesDayParamsSchema } from 'src/modules/budget/rates/rates-models';

/**
 * @function ratesRoutes
 * @description Defines the exchange-rate routes (the current euro reference rates, and those of one past day).
 */
export default function (fastify: FastifyInstance): void {
    fastify.get('/', {
        preHandler: [fastify.identity.authenticate]
    }, ratesController.getRates);

    fastify.get<RatesDayRequest>('/:date', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: RatesDayParamsSchema
        }
    }, ratesController.getRatesForDay);
}
