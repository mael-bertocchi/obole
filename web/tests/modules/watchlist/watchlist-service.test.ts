import watchlistService from 'modules/watchlist/watchlist-service';
import { fetchWithAuthentication, RequestError } from 'utils/request';
import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/request', async (importOriginal) => ({ ...(await importOriginal<typeof import('utils/request')>()), fetchWithAuthentication: vi.fn(() => Promise.resolve([])) }));

describe('watchlistService', () => {
    it('sends the watchlist’s requests under its own path, in the page’s language', async () => {
        await watchlistService.searchTitles('Le Seigneur des anneaux');
        await watchlistService.getTitle({ mediaType: 'tv', tmdbId: 1399 });
        await watchlistService.getCollection(119);
        await watchlistService.addEntry({ mediaType: 'movie', tmdbId: 120 });

        const calls = vi.mocked(fetchWithAuthentication).mock.calls;

        expect(calls.map(([path, init]) => [path, init.method])).toEqual([
            ['/v1/watchlist/catalog/search?query=Le%20Seigneur%20des%20anneaux&language=en', 'GET'],
            ['/v1/watchlist/catalog/titles/tv/1399?language=en', 'GET'],
            ['/v1/watchlist/catalog/collections/119?language=en', 'GET'],
            ['/v1/watchlist/entries', 'POST']
        ]);
        expect(calls[3]?.[1].body).toBe(JSON.stringify({ mediaType: 'movie', tmdbId: 120 }));
    });

    it('says when the catalog has no token, or a refused one', async () => {
        vi.mocked(fetchWithAuthentication).mockRejectedValueOnce(new RequestError(503, 'The server is unavailable right now.', 'catalog-not-configured'));

        await expect(watchlistService.searchTitles('Dune')).rejects.toMatchObject({ status: 503, message: "The catalog isn't set up on the server: The TMDB token is missing." });

        vi.mocked(fetchWithAuthentication).mockRejectedValueOnce(new RequestError(503, 'The server is unavailable right now.', 'catalog-refused'));

        await expect(watchlistService.getTitle({ mediaType: 'movie', tmdbId: 438631 })).rejects.toMatchObject({ message: "TMDB refuses the server's token." });
    });

    it('leaves any other failure as it is', async () => {
        vi.mocked(fetchWithAuthentication).mockRejectedValueOnce(new RequestError(503, 'The server is unavailable right now.'));

        await expect(watchlistService.getCollection(119)).rejects.toMatchObject({ message: 'The server is unavailable right now.', reason: null });
    });
});
