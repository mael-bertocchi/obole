import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { hasZodFastifySchemaValidationErrors, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { StatusCodes } from 'http-status-codes';
import catalogRoutes from 'src/modules/watchlist/catalog/catalog-routes';
import { forgetCatalog } from 'src/modules/watchlist/catalog/catalog-service';
import type { Variables } from 'src/plugins/environment';
import type { IdentityService } from 'src/plugins/identity';
import { RequestError } from 'src/shared/models';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { standIn } from '../../../support/stand-in';
import { stubCatalog } from '../../../support/tmdb';
import { testVariables } from '../../../support/variables';

/**
 * @interface TestApp
 * @description A server carrying the catalog routes, and what it warned about as it started.
 */
interface TestApp {
    app: FastifyInstance; /*!< The server */
    warn: ReturnType<typeof vi.fn>; /*!< Its startup warnings */
}

/**
 * @function buildApp
 * @description Builds an instance carrying just what the catalog routes depend on, answering errors as the server does.
 */
async function buildApp(variables: Variables, authenticate: () => Promise<void> = () => Promise.resolve()): Promise<TestApp> {
    const app = Fastify();
    const warn = vi.spyOn(app.log, 'warn');

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorate('variables', variables);
    app.decorate('identity', standIn<IdentityService>({ authenticate }));

    app.setErrorHandler((error: Error, _request, reply) => {
        if (error instanceof RequestError) {
            return reply.status(error.code).send({ message: error.message, data: error.data });
        }

        return reply.status(hasZodFastifySchemaValidationErrors(error) ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR).send({ message: error.message, data: null });
    });

    await app.register(catalogRoutes, { prefix: '/v1/watchlist/catalog' });

    return { app, warn: vi.mocked(warn) };
}

beforeEach(() => {
    forgetCatalog();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('catalog routes', () => {
    it('search the catalog inside the standard envelope', async () => {
        stubCatalog(testVariables().WATCHLIST_TMDB_URL);
        const { app, warn } = await buildApp(testVariables());
        const response = await app.inject({ method: 'GET', url: '/v1/watchlist/catalog/search?query=anneau&language=fr' });

        expect(response.statusCode).toBe(StatusCodes.OK);
        expect(response.json<{ data: unknown[] }>().data).toHaveLength(3);
        expect(warn).not.toHaveBeenCalled();

        await app.close();
    });

    it('warn as the server starts without a token, then say why they answer 503', async () => {
        const calls = stubCatalog(testVariables().WATCHLIST_TMDB_URL);
        const { app, warn } = await buildApp(testVariables({ WATCHLIST_TMDB_TOKEN: '' }));
        const response = await app.inject({ method: 'GET', url: '/v1/watchlist/catalog/search?query=anneau' });

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('WATCHLIST_TMDB_TOKEN is not set'));
        expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE);
        expect(response.json<{ data: unknown }>().data).toEqual({ reason: 'catalog-not-configured' });
        expect(calls).toHaveLength(0);

        await app.close();
    });

    it('are guarded by the identity plugin', async () => {
        const calls = stubCatalog(testVariables().WATCHLIST_TMDB_URL);
        const { app } = await buildApp(testVariables(), () => Promise.reject(new RequestError(StatusCodes.UNAUTHORIZED, 'Invalid or expired access token')));
        const response = await app.inject({ method: 'GET', url: '/v1/watchlist/catalog/genres' });

        expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
        expect(calls).toHaveLength(0);

        await app.close();
    });
});
