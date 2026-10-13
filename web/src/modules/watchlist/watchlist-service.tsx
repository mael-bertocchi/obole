import { currentLanguage, t } from 'modules/language/language-service';
import type { CatalogTitle, Collection, Entry, EntryChanges, Genre, TitleDetails, TitleReference } from 'modules/watchlist/watchlist-models';
import { CatalogTitleSchema, CollectionSchema, EntrySchema, GenreSchema, TitleDetailsSchema } from 'modules/watchlist/watchlist-models';
import { fetchWithAuthentication, rewording } from 'utils/request';
import { z } from 'zod';

/**
 * @function language
 * @description The language the catalog writes titles, summaries and genres in: the page's.
 *
 * @returns {string} The language, as a query parameter
 */
function language(): string {
    return `language=${currentLanguage()}`;
}

/**
 * @function getEntries
 * @description Reads every title on the watchlist
 *
 * @returns {Promise<Entry[]>} The titles, the latest added first
 */
async function getEntries(): Promise<Entry[]> {
    return await fetchWithAuthentication('/v1/watchlist/entries', { method: 'GET' }, z.array(EntrySchema));
}

/**
 * @function addEntry
 * @description Puts a film or a series on the watchlist, to watch
 *
 * @param {TitleReference} title The title
 * @returns {Promise<Entry>} The title, as stored
 */
async function addEntry(title: TitleReference): Promise<Entry> {
    return await fetchWithAuthentication('/v1/watchlist/entries', { method: 'POST', body: JSON.stringify({ mediaType: title.mediaType, tmdbId: title.tmdbId }) }, EntrySchema).catch(rewording(409, t('watchlist.alreadyAdded')));
}

/**
 * @function updateEntry
 * @description Marks a title watched or not, rates it, comments on it
 *
 * @param {string} id The title's identifier on the watchlist
 * @param {EntryChanges} changes What changes
 * @returns {Promise<Entry>} The title, as now stored
 */
async function updateEntry(id: string, changes: EntryChanges): Promise<Entry> {
    return await fetchWithAuthentication(`/v1/watchlist/entries/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }, EntrySchema);
}

/**
 * @function removeEntry
 * @description Takes a title off the watchlist
 *
 * @param {string} id The title's identifier on the watchlist
 * @returns {Promise<void>} Resolves once it is gone
 */
async function removeEntry(id: string): Promise<void> {
    await fetchWithAuthentication(`/v1/watchlist/entries/${id}`, { method: 'DELETE' }, z.unknown());
}

/**
 * @function getGenres
 * @description Reads every genre of films and series, in the page's language
 *
 * @returns {Promise<Genre[]>} The genres
 */
async function getGenres(): Promise<Genre[]> {
    return await fetchWithAuthentication(`/v1/watchlist/catalog/genres?${language()}`, { method: 'GET' }, z.array(GenreSchema));
}

/**
 * @function searchTitles
 * @description Finds the films and series matching a query
 *
 * @param {string} query What to look for
 * @returns {Promise<CatalogTitle[]>} The titles found, most relevant first
 */
async function searchTitles(query: string): Promise<CatalogTitle[]> {
    return await fetchWithAuthentication(`/v1/watchlist/catalog/search?query=${encodeURIComponent(query)}&${language()}`, { method: 'GET' }, z.array(CatalogTitleSchema));
}

/**
 * @function getTitle
 * @description Reads everything about one title, with where to watch it in France
 *
 * @param {TitleReference} title The title
 * @returns {Promise<TitleDetails>} Its details
 */
async function getTitle(title: TitleReference): Promise<TitleDetails> {
    return await fetchWithAuthentication(`/v1/watchlist/catalog/titles/${title.mediaType}/${title.tmdbId}?${language()}`, { method: 'GET' }, TitleDetailsSchema);
}

/**
 * @function getCollection
 * @description Reads a saga, its films in the order they came out
 *
 * @param {number} id The saga's identifier in the catalog
 * @returns {Promise<Collection>} The saga
 */
async function getCollection(id: number): Promise<Collection> {
    return await fetchWithAuthentication(`/v1/watchlist/catalog/collections/${id}?${language()}`, { method: 'GET' }, CollectionSchema);
}

export default {
    getEntries,
    addEntry,
    updateEntry,
    removeEntry,
    getGenres,
    searchTitles,
    getTitle,
    getCollection
};
