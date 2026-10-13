import type { Maybe } from 'models';
import { currentLanguage, t } from 'modules/language/language-service';
import { localized } from 'modules/watchlist/watchlist-formatting';
import type { Entry, MediaType } from 'modules/watchlist/watchlist-models';

/**
 * @type ShelfOrder
 * @description How the titles to watch are shelved: by genre, by saga, or as one shelf, the latest added first.
 */
export type ShelfOrder = 'genre' | 'saga' | 'recent';

/**
 * @type WatchedOrder
 * @description How the watched titles are listed: the latest watched first, or the best rated first.
 */
export type WatchedOrder = 'recent' | 'best';

/**
 * @type KindFilter
 * @description Which titles show: all of them, the films, or the series.
 */
export type KindFilter = 'all' | MediaType;

/**
 * @interface Shelf
 * @description A titled group of titles.
 */
export interface Shelf {
    key: string; /*!< What tells it apart */
    title: Maybe<string>; /*!< Its title, or null for the one untitled shelf */
    entries: Entry[]; /*!< Its titles, in order */
}

/**
 * @constant SHELF_ORDERS
 * @description Every way to shelve the titles to watch, in the order the page offers them.
 */
export const SHELF_ORDERS: readonly ShelfOrder[] = ['genre', 'saga', 'recent'];

/**
 * @constant KIND_FILTERS
 * @description Every kind filter, in the order the page offers them.
 */
export const KIND_FILTERS: readonly KindFilter[] = ['all', 'movie', 'tv'];

/**
 * @function isShelfOrder
 * @description Whether a value from the address is a way to shelve the titles.
 */
export function isShelfOrder(value: Maybe<string>): value is ShelfOrder {
    return SHELF_ORDERS.some((order) => order === value);
}

/**
 * @function isWatchedOrder
 * @description Whether a value from the address is a way to list the watched titles.
 */
export function isWatchedOrder(value: Maybe<string>): value is WatchedOrder {
    return value === 'recent' || value === 'best';
}

/**
 * @function isKindFilter
 * @description Whether a value from the address is a kind filter.
 */
export function isKindFilter(value: Maybe<string>): value is KindFilter {
    return KIND_FILTERS.some((kind) => kind === value);
}

/**
 * @function byAdded
 * @description Orders titles the latest added first.
 */
function byAdded(first: Entry, second: Entry): number {
    return second.addedAt.getTime() - first.addedAt.getTime();
}

/**
 * @function byRelease
 * @description Orders titles by the day they came out, the ones without a date last.
 */
function byRelease(first: Entry, second: Entry): number {
    if (first.releaseDate === second.releaseDate) {
        return byAdded(first, second);
    }

    if (first.releaseDate === null) {
        return 1;
    }

    if (second.releaseDate === null) {
        return -1;
    }

    return first.releaseDate < second.releaseDate ? -1 : 1;
}

/**
 * @function byTitle
 * @description Orders shelves by title in the page's language, the untitled-by-nature ones last.
 */
function byTitle(last: string): (first: Shelf, second: Shelf) => number {
    return (first: Shelf, second: Shelf): number => {
        if (first.key === last || second.key === last) {
            return first.key === last ? 1 : -1;
        }

        return (first.title ?? '').localeCompare(second.title ?? '', currentLanguage());
    };
}

/**
 * @function toWatch
 * @description The titles still to watch.
 *
 * @param {Entry[]} entries The watchlist
 * @returns {Entry[]} The titles to watch
 */
export function toWatch(entries: Entry[]): Entry[] {
    return entries.filter((entry) => entry.watchedAt === null);
}

/**
 * @function ofKind
 * @description The titles of one kind, or all of them.
 *
 * @param {Entry[]} entries The titles
 * @param {KindFilter} kind The kind to keep
 * @returns {Entry[]} The titles kept
 */
export function ofKind(entries: Entry[], kind: KindFilter): Entry[] {
    return kind === 'all' ? entries : entries.filter((entry) => entry.mediaType === kind);
}

/**
 * @function group
 * @description Puts titles on shelves by a key, keeping each shelf's title.
 */
function group(entries: Entry[], keyOf: (entry: Entry) => [string, string]): Shelf[] {
    const shelves = new Map<string, Shelf>();

    for (const entry of entries) {
        const [key, title] = keyOf(entry);
        const shelf = shelves.get(key) ?? { key, title, entries: [] };

        shelf.entries.push(entry);
        shelves.set(key, shelf);
    }

    return [...shelves.values()];
}

/**
 * @function shelves
 * @description Shelves the titles to watch. By genre, a title goes under its main genre (the first the catalog gives),
 * the latest added first. By saga, a saga's films follow one another in the order they came out, and the titles of no
 * saga come last. Otherwise all titles share one shelf, the latest added first.
 *
 * @param {Entry[]} entries The titles to shelve
 * @param {ShelfOrder} order How to shelve them
 * @param {ReadonlyMap<number, string>} genres Every genre's name, by identifier
 * @returns {Shelf[]} The shelves, in order
 */
export function shelves(entries: Entry[], order: ShelfOrder, genres: ReadonlyMap<number, string>): Shelf[] {
    if (order === 'recent') {
        return entries.length === 0 ? [] : [{ key: 'recent', title: null, entries: [...entries].sort(byAdded) }];
    }

    if (order === 'genre') {
        return group(entries, (entry) => {
            const name = entry.genreIds.length === 0 ? undefined : genres.get(entry.genreIds[0]);

            return name === undefined ? ['genre:none', t('watchlist.noGenre')] : [`genre:${entry.genreIds[0]}`, name];
        })
            .map((shelf) => ({ ...shelf, entries: shelf.entries.sort(byAdded) }))
            .sort(byTitle('genre:none'));
    }

    return group(entries, (entry) => (entry.collectionId === null ? ['saga:none', t('watchlist.noSaga')] : [`saga:${entry.collectionId}`, entry.collectionName === null ? '' : localized(entry.collectionName)]))
        .map((shelf) => ({ ...shelf, entries: shelf.entries.sort(shelf.key === 'saga:none' ? byAdded : byRelease) }))
        .sort(byTitle('saga:none'));
}

/**
 * @function watchedEntries
 * @description The watched titles, the latest watched first, or the best rated first (then the latest watched).
 *
 * @param {Entry[]} entries The watchlist
 * @param {WatchedOrder} order How to list them
 * @returns {Entry[]} The watched titles, in order
 */
export function watchedEntries(entries: Entry[], order: WatchedOrder): Entry[] {
    const latest = (first: Entry, second: Entry): number => (second.watchedAt?.getTime() ?? 0) - (first.watchedAt?.getTime() ?? 0);

    return entries
        .filter((entry) => entry.watchedAt !== null)
        .sort((first, second) => (order === 'best' ? (second.rating ?? 0) - (first.rating ?? 0) || latest(first, second) : latest(first, second)));
}
