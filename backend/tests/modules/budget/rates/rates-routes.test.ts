import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { hasZodFastifySchemaValidationErrors, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { StatusCodes } from 'http-status-codes';
import type { PrismaClient } from 'prisma/generated/prisma/client';
import ratesRoutes from 'src/modules/budget/rates/rates-routes';
import type { IdentityService } from 'src/plugins/identity';
import { RequestError } from 'src/shared/models';
import { describe, expect, it, vi } from 'vitest';

import { standIn } from '../../../support/stand-in';

/**
 * @constant storedSnapshot
 * @description The snapshot row the stand-in database holds
 */
const storedSnapshot = {
    id: 'latest',
    quoteDate: '2026-09-08',
    rates: { EUR: 1, USD: 0.861029, CHF: 1.061007, KRW: 0.000641 },
    fetchedAt: new Date()
};

/**
 * @function buildApp
 * @description Builds an instance carrying just the decorations the rates routes depend on, so the route
 * wiring and its guard can be exercised without a database.
 */
async function buildApp(authenticate: () => Promise<void>): Promise<{ app: FastifyInstance; findUnique: ReturnType<typeof vi.fn> }> {
    const findUnique = vi.fn(() => Promise.resolve(storedSnapshot));
    const app = Fastify();

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorate('prisma', standIn<PrismaClient>({ budgetExchangeRateSnapshot: { findUnique, upsert: vi.fn() } }));
    app.decorate('identity', standIn<IdentityService>({ authenticate }));

    app.setErrorHandler((error: Error, _request, reply) => {
        let code = StatusCodes.INTERNAL_SERVER_ERROR;

        if (error instanceof RequestError) {
            code = error.code;
        } else if (hasZodFastifySchemaValidationErrors(error)) {
            code = StatusCodes.BAD_REQUEST;
        }

        return reply.status(code).send({ message: error.message, data: undefined });
    });

    await app.register(ratesRoutes, { prefix: '/v1/budget/rates' });

    return { app, findUnique };
}

/**
 * @function allow
 * @description An authenticate stand-in that lets the request through.
 */
function allow(): Promise<void> {
    return Promise.resolve();
}

/**
 * @function deny
 * @description An authenticate stand-in that rejects the request the way the real guard does.
 */
function deny(): Promise<void> {
    return Promise.reject(new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid or expired access token'));
}

describe('GET /v1/budget/rates', () => {
    it('serves the snapshot inside the standard envelope', async () => {
        const { app } = await buildApp(allow);
        const response = await app.inject({ method: 'GET', url: '/v1/budget/rates' });

        expect(response.statusCode).toBe(StatusCodes.OK);

        const body = response.json<{ data: { base: string; quoteDate: string; rates: Record<string, number> } }>();

        expect(body.data.base).toBe('EUR');
        expect(body.data.quoteDate).toBe('2026-09-08');
        expect(body.data.rates.USD).toBe(0.861029);

        await app.close();
    });

    it('is guarded by the identity plugin', async () => {
        const { app, findUnique } = await buildApp(deny);
        const response = await app.inject({ method: 'GET', url: '/v1/budget/rates' });

        expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
        expect(findUnique).not.toHaveBeenCalled();

        await app.close();
    });
});

describe('GET /v1/budget/rates/:date', () => {
    it('serves the rates stored for that day', async () => {
        const { app } = await buildApp(allow);
        const response = await app.inject({ method: 'GET', url: '/v1/budget/rates/2026-09-08' });

        expect(response.statusCode).toBe(StatusCodes.OK);
        expect(response.json<{ data: { quoteDate: string } }>().data.quoteDate).toBe('2026-09-08');

        await app.close();
    });

    it('rejects a day that is not a calendar date', async () => {
        const { app, findUnique } = await buildApp(allow);
        const response = await app.inject({ method: 'GET', url: '/v1/budget/rates/08-09-2026' });

        expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
        expect(findUnique).not.toHaveBeenCalled();

        await app.close();
    });

    it('is guarded by the identity plugin', async () => {
        const { app, findUnique } = await buildApp(deny);
        const response = await app.inject({ method: 'GET', url: '/v1/budget/rates/2026-09-08' });

        expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
        expect(findUnique).not.toHaveBeenCalled();

        await app.close();
    });
});
