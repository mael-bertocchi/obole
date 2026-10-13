import type { FastifyInstance } from 'fastify';
import catalogController from 'src/modules/watchlist/catalog/catalog-controller';
import type { CatalogCollectionRequest, CatalogLanguageRequest, CatalogSearchRequest, CatalogTitleRequest } from 'src/modules/watchlist/catalog/catalog-models';
import { CatalogCollectionParamsSchema, CatalogLanguageQuerySchema, CatalogSearchQuerySchema, CatalogTitleParamsSchema } from 'src/modules/watchlist/catalog/catalog-models';

/**
 * @function catalogRoutes
 * @description Defines the catalog routes of the watchlist: searching films and series, a title's details and where to
 * watch it, a saga, and the genres. The catalog is TMDB; the server asks it, so its token never leaves the server. Without
 * a token, the server says so once as it starts, and every catalog route answers 503.
 */
export default function (fastify: FastifyInstance): void {
    if (fastify.variables.WATCHLIST_TMDB_TOKEN === '') {
        fastify.log.warn('WATCHLIST_TMDB_TOKEN is not set: the watchlist lists its titles, but searching and opening one answer 503');
    }

    fastify.get<CatalogSearchRequest>('/search', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            querystring: CatalogSearchQuerySchema
        }
    }, catalogController.search);

    fastify.get<CatalogLanguageRequest>('/genres', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            querystring: CatalogLanguageQuerySchema
        }
    }, catalogController.genres);

    fastify.get<CatalogTitleRequest>('/titles/:mediaType/:tmdbId', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: CatalogTitleParamsSchema,
            querystring: CatalogLanguageQuerySchema
        }
    }, catalogController.title);

    fastify.get<CatalogCollectionRequest>('/collections/:collectionId', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: CatalogCollectionParamsSchema,
            querystring: CatalogLanguageQuerySchema
        }
    }, catalogController.collection);
}
