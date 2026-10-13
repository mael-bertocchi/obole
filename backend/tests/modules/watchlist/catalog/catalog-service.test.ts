import type { FastifyBaseLogger } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { collectionDetails, forgetCatalog, genreList, searchCatalog, titleDetails } from 'src/modules/watchlist/catalog/catalog-service';
import type { Maybe } from 'src/shared/models';
import { RequestError } from 'src/shared/models';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { standIn } from '../../../support/stand-in';
import { stubCatalog } from '../../../support/tmdb';
import { testVariables } from '../../../support/variables';

/**
 * @constant variables
 * @description The environment the catalog is asked with
 */
const variables = testVariables();

/**
 * @constant logger
 * @description A logger that keeps quiet
 */
const logger = standIn<FastifyBaseLogger>({ error: vi.fn(), warn: vi.fn() });

/**
 * @function failureOf
 * @description The `RequestError` a call rejected with, or null when it did not.
 */
async function failureOf(call: Promise<unknown>): Promise<Maybe<RequestError>> {
    try {
        await call;
        return null;
    } catch (error: unknown) {
        return error instanceof RequestError ? error : null;
    }
}

/**
 * @function statusOf
 * @description The status a rejected call carries, or 0 when it did not reject with a `RequestError`.
 */
async function statusOf(call: Promise<unknown>): Promise<number> {
    return (await failureOf(call))?.code ?? 0;
}

beforeEach(() => {
    forgetCatalog();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('searchCatalog', () => {
    it('keeps the films and series, in the language asked, and leaves people out', async () => {
        const calls = stubCatalog(variables.WATCHLIST_TMDB_URL);
        const titles = await searchCatalog(variables, logger, 'anneau', 'fr');

        expect(titles.map((title) => `${title.mediaType}:${title.tmdbId}`)).toEqual(['movie:120', 'tv:1399', 'movie:404']);
        expect(titles[1]).toMatchObject({ title: 'Game of Thrones', releaseDate: '2011-04-17', posterPath: null });
        expect(titles[2].releaseDate).toBeNull();
        expect(calls[0].path).toBe('/search/multi');
        expect(calls[0].query.get('query')).toBe('anneau');
        expect(calls[0].query.get('language')).toBe('fr-FR');
        expect(calls[0].query.get('include_adult')).toBe('false');
        expect(calls[0].authorization).toBe('Bearer a-test-tmdb-token');
    });

    it('answers a repeated search from memory', async () => {
        const calls = stubCatalog(variables.WATCHLIST_TMDB_URL);

        await searchCatalog(variables, logger, 'Anneau', 'fr');
        await searchCatalog(variables, logger, 'anneau', 'fr');

        expect(calls).toHaveLength(1);
    });
});

describe('titleDetails', () => {
    it('describes a film with its saga and where to watch it in France', async () => {
        stubCatalog(variables.WATCHLIST_TMDB_URL);
        const film = await titleDetails(variables, logger, 'movie', 120, 'fr');

        expect(film).toMatchObject({
            tmdbId: 120,
            mediaType: 'movie',
            originalTitle: 'The Lord of the Rings: The Fellowship of the Ring',
            runtime: 179,
            seasons: null,
            collection: { id: 119, name: 'Le Seigneur des anneaux - Saga' }
        });
        expect(film.genres.map((genre) => genre.id)).toEqual([12, 14]);
        expect(film.offers.link).toBe('https://www.themoviedb.org/movie/120/watch?locale=FR');
        expect(film.offers.subscription.map((provider) => provider.name)).toEqual(['Netflix', 'Amazon Prime Video']);
        expect(film.offers.free).toEqual([{ id: 300, name: 'Pluto TV', logoPath: null }]);
        expect(film.offers.rent).toHaveLength(1);
        expect(film.offers.buy).toHaveLength(1);
    });

    it('describes a series as a whole, with no offers when none is in France', async () => {
        stubCatalog(variables.WATCHLIST_TMDB_URL);
        const series = await titleDetails(variables, logger, 'tv', 1399, 'fr');

        expect(series).toMatchObject({ title: 'Game of Thrones', seasons: 8, runtime: null, collection: null });
        expect(series.offers).toEqual({ link: null, subscription: [], free: [], rent: [], buy: [] });
    });

    it('answers a title asked again from memory', async () => {
        const calls = stubCatalog(variables.WATCHLIST_TMDB_URL);

        await titleDetails(variables, logger, 'movie', 120, 'fr');
        await titleDetails(variables, logger, 'movie', 120, 'fr');

        expect(calls).toHaveLength(2);
    });

    it('turns an unknown title into a 404', async () => {
        stubCatalog(variables.WATCHLIST_TMDB_URL);

        expect(await statusOf(titleDetails(variables, logger, 'movie', 7, 'fr'))).toBe(StatusCodes.NOT_FOUND);
    });

    it('turns a failure of the catalog into a 503 with no reason to give', async () => {
        stubCatalog(variables.WATCHLIST_TMDB_URL, { '/movie/120': 500 });
        const failure = await failureOf(titleDetails(variables, logger, 'movie', 120, 'fr'));

        expect(failure?.code).toBe(StatusCodes.SERVICE_UNAVAILABLE);
        expect(failure?.data).toBeNull();
    });

    it('says when the catalog refuses the token, which only the owner can fix', async () => {
        stubCatalog(variables.WATCHLIST_TMDB_URL, { '/movie/120': 401 });
        const failure = await failureOf(titleDetails(variables, logger, 'movie', 120, 'fr'));

        expect(failure?.code).toBe(StatusCodes.SERVICE_UNAVAILABLE);
        expect(failure?.data).toEqual({ reason: 'catalog-refused' });
    });

    it('turns an unreachable catalog into a 503', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));

        expect(await statusOf(titleDetails(variables, logger, 'tv', 1399, 'fr'))).toBe(StatusCodes.SERVICE_UNAVAILABLE);
    });

    it('answers 503 without asking when no token is set, and says so', async () => {
        const calls = stubCatalog(variables.WATCHLIST_TMDB_URL);
        const failure = await failureOf(titleDetails(testVariables({ WATCHLIST_TMDB_TOKEN: '' }), logger, 'movie', 120, 'fr'));

        expect(failure?.code).toBe(StatusCodes.SERVICE_UNAVAILABLE);
        expect(failure?.data).toEqual({ reason: 'catalog-not-configured' });
        expect(calls).toHaveLength(0);
    });
});

describe('collectionDetails', () => {
    it('lists a saga in the order its films came out, the undated ones last', async () => {
        stubCatalog(variables.WATCHLIST_TMDB_URL);
        const saga = await collectionDetails(variables, logger, 119, 'fr');

        expect(saga.name).toBe('Le Seigneur des anneaux - Saga');
        expect(saga.parts.map((part) => part.tmdbId)).toEqual([120, 121, 122, 999]);
        expect(saga.parts.every((part) => part.mediaType === 'movie')).toBe(true);
    });
});

describe('genreList', () => {
    it('merges the genres of films and series, once each, by name', async () => {
        const calls = stubCatalog(variables.WATCHLIST_TMDB_URL);
        const genres = await genreList(variables, logger, 'en');

        expect(genres.map((genre) => genre.id)).toEqual([28, 12, 18, 10765]);
        expect(calls.every((call) => call.query.get('language') === 'en-US')).toBe(true);
    });
});
