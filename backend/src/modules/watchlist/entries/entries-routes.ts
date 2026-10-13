import type { FastifyInstance } from 'fastify';
import entriesController from 'src/modules/watchlist/entries/entries-controller';
import type { EntryCreateRequest, EntryDeleteRequest, EntryUpdateRequest } from 'src/modules/watchlist/entries/entries-models';
import { EntryCreateSchema, EntryParamsSchema, EntryUpdateSchema } from 'src/modules/watchlist/entries/entries-models';

/**
 * @function entriesRoutes
 * @description Defines the routes of the watchlist itself: listing its titles, adding one, marking one watched with a
 * rating and a comment, and taking one off.
 */
export default function (fastify: FastifyInstance): void {
    fastify.get('/', {
        preHandler: [fastify.identity.authenticate]
    }, entriesController.list);

    fastify.post<EntryCreateRequest>('/', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            body: EntryCreateSchema
        }
    }, entriesController.add);

    fastify.patch<EntryUpdateRequest>('/:entryId', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: EntryParamsSchema,
            body: EntryUpdateSchema
        }
    }, entriesController.update);

    fastify.delete<EntryDeleteRequest>('/:entryId', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: EntryParamsSchema
        }
    }, entriesController.remove);
}
