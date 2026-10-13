import type { FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import type { CatalogCollectionRequest, CatalogLanguageRequest, CatalogSearchRequest, CatalogTitleRequest } from 'src/modules/watchlist/catalog/catalog-models';
import { collectionDetails, genreList, searchCatalog, titleDetails } from 'src/modules/watchlist/catalog/catalog-service';

/**
 * @function search
 * @description Finds the films and series matching a query.
 *
 * @returns {Promise<void>} Resolves when the titles are sent.
 */
async function search(request: FastifyRequest<CatalogSearchRequest>, reply: FastifyReply): Promise<void> {
    const titles = await searchCatalog(request.server.variables, request.log, request.query.query, request.query.language);

    reply.status(StatusCodes.OK).send({ data: titles });
}

/**
 * @function title
 * @description Sends everything the portal shows about one film or series, with where to watch it.
 *
 * @returns {Promise<void>} Resolves when the details are sent.
 */
async function title(request: FastifyRequest<CatalogTitleRequest>, reply: FastifyReply): Promise<void> {
    const found = await titleDetails(request.server.variables, request.log, request.params.mediaType, request.params.tmdbId, request.query.language);

    reply.status(StatusCodes.OK).send({ data: found });
}

/**
 * @function collection
 * @description Sends a saga and its films, in the order they came out.
 *
 * @returns {Promise<void>} Resolves when the saga is sent.
 */
async function collection(request: FastifyRequest<CatalogCollectionRequest>, reply: FastifyReply): Promise<void> {
    const found = await collectionDetails(request.server.variables, request.log, request.params.collectionId, request.query.language);

    reply.status(StatusCodes.OK).send({ data: found });
}

/**
 * @function genres
 * @description Sends every genre, named in the asked language.
 *
 * @returns {Promise<void>} Resolves when the genres are sent.
 */
async function genres(request: FastifyRequest<CatalogLanguageRequest>, reply: FastifyReply): Promise<void> {
    const found = await genreList(request.server.variables, request.log, request.query.language);

    reply.status(StatusCodes.OK).send({ data: found });
}

export default {
    search,
    title,
    collection,
    genres
};
