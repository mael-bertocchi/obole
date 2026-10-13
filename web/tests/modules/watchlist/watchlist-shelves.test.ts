import { chooseLanguage } from 'modules/language/language-service';
import type { Entry } from 'modules/watchlist/watchlist-models';
import { isKindFilter, isShelfOrder, matches, ofKind, shelves, toWatch, watchedEntries } from 'modules/watchlist/watchlist-shelves';
import { describe, expect, it } from 'vitest';

/**
 * @function entry
 * @description A title on the watchlist, a film to watch unless told otherwise
 */
function entry(overrides: Partial<Entry>): Entry {
    return {
        id: String(overrides.tmdbId ?? 1),
        tmdbId: 1,
        mediaType: 'movie',
        title: { en: 'A film', fr: 'Un film' },
        originalTitle: 'A film',
        releaseDate: '2020-01-01',
        posterPath: null,
        genreIds: [],
        collectionId: null,
        collectionName: null,
        runtime: null,
        seasons: null,
        addedAt: new Date('2026-10-01T10:00:00Z'),
        watchedAt: null,
        rating: null,
        comment: null,
        ...overrides
    };
}

/**
 * @constant GENRES
 * @description Genre names, by identifier, in French
 */
const GENRES: ReadonlyMap<number, string> = new Map([
    [12, 'Aventure'],
    [18, 'Drame'],
    [35, 'Comédie'],
    [878, 'Science-Fiction']
]);

/**
 * @constant ENTRIES
 * @description Two films of a saga added in the wrong order, a film and a series of their own, and a watched film
 */
const ENTRIES: Entry[] = [
    entry({ tmdbId: 122, title: { en: 'The Return of the King', fr: 'The Return of the King' }, releaseDate: '2003-12-01', genreIds: [12, 14], collectionId: 119, collectionName: { en: 'The Lord of the Rings', fr: 'Le Seigneur des anneaux' }, addedAt: new Date('2026-10-03T10:00:00Z') }),
    entry({ tmdbId: 120, title: { en: 'The Fellowship of the Ring', fr: 'The Fellowship of the Ring' }, releaseDate: '2001-12-18', genreIds: [12], collectionId: 119, collectionName: { en: 'The Lord of the Rings', fr: 'Le Seigneur des anneaux' }, addedAt: new Date('2026-10-04T10:00:00Z') }),
    entry({ tmdbId: 550, title: { en: 'Fight Club', fr: 'Fight Club' }, genreIds: [18], addedAt: new Date('2026-10-02T10:00:00Z') }),
    entry({ tmdbId: 1399, mediaType: 'tv', title: { en: 'Game of Thrones', fr: 'Game of Thrones' }, genreIds: [10765, 18], addedAt: new Date('2026-10-05T10:00:00Z') }),
    entry({ tmdbId: 27205, title: { en: 'Inception', fr: 'Inception' }, genreIds: [878], watchedAt: new Date('2026-10-06T20:00:00Z'), rating: 9 })
];

describe('toWatch and ofKind', () => {
    it('keeps the titles still to watch, of one kind or all', () => {
        expect(toWatch(ENTRIES).map((found) => found.tmdbId)).toEqual([122, 120, 550, 1399]);
        expect(ofKind(toWatch(ENTRIES), 'tv').map((found) => found.tmdbId)).toEqual([1399]);
        expect(ofKind(toWatch(ENTRIES), 'all')).toHaveLength(4);
    });
});

describe('shelves', () => {
    it('shelves by main genre, by name in the page language, the unknown genres last', () => {
        chooseLanguage('fr');
        const found = shelves(toWatch(ENTRIES), 'genre', GENRES);

        expect(found.map((shelf) => shelf.title)).toEqual(['Aventure', 'Drame', 'Autres genres']);
        expect(found[0].entries.map((shelved) => shelved.tmdbId)).toEqual([120, 122]);
        expect(found[2].entries.map((shelved) => shelved.tmdbId)).toEqual([1399]);
    });

    it('lists a saga in the order its films came out, whatever the order they were added in, named in the page language', () => {
        const found = shelves(toWatch(ENTRIES), 'saga', GENRES);

        expect(found.map((shelf) => shelf.title)).toEqual(['The Lord of the Rings', 'No saga']);
        chooseLanguage('fr');
        expect(shelves(toWatch(ENTRIES), 'saga', GENRES).map((shelf) => shelf.title)).toEqual(['Le Seigneur des anneaux', 'Hors saga']);
        expect(found[0].entries.map((shelved) => shelved.tmdbId)).toEqual([120, 122]);
        expect(found[1].entries.map((shelved) => shelved.tmdbId)).toEqual([1399, 550]);
    });

    it('puts everything on one untitled shelf, the latest added first', () => {
        const found = shelves(toWatch(ENTRIES), 'recent', GENRES);

        expect(found).toHaveLength(1);
        expect(found[0].title).toBeNull();
        expect(found[0].entries.map((shelved) => shelved.tmdbId)).toEqual([1399, 120, 122, 550]);
    });

    it('has no shelf for nothing', () => {
        expect(shelves([], 'recent', GENRES)).toEqual([]);
        expect(shelves([], 'genre', GENRES)).toEqual([]);
    });
});

describe('watchedEntries', () => {
    it('lists the watched titles the latest first, or the best rated first', () => {
        const watched = [
            entry({ tmdbId: 1, watchedAt: new Date('2026-10-01T20:00:00Z'), rating: 10 }),
            entry({ tmdbId: 2, watchedAt: new Date('2026-10-03T20:00:00Z'), rating: null }),
            entry({ tmdbId: 3, watchedAt: new Date('2026-10-02T20:00:00Z'), rating: 6 }),
            entry({ tmdbId: 4 })
        ];

        expect(watchedEntries(watched, 'recent').map((found) => found.tmdbId)).toEqual([2, 3, 1]);
        expect(watchedEntries(watched, 'best').map((found) => found.tmdbId)).toEqual([1, 3, 2]);
    });
});

describe('matches', () => {
    it('finds a title by any of its names, its saga or its comment, accents, capitals and word order aside', () => {
        const fellowship = entry({ title: { en: 'The Fellowship of the Ring', fr: 'La Communauté de l’anneau' }, originalTitle: 'The Lord of the Rings', collectionName: { en: 'The Lord of the Rings Collection', fr: 'Le Seigneur des anneaux - Saga' }, comment: 'Un monument.' });

        expect(matches(fellowship, '')).toBe(true);
        expect(matches(fellowship, '  communaute ')).toBe(true);
        expect(matches(fellowship, 'RING fellowship')).toBe(true);
        expect(matches(fellowship, 'seigneur saga')).toBe(true);
        expect(matches(fellowship, 'monument')).toBe(true);
        expect(matches(fellowship, 'matrix')).toBe(false);
        expect(matches(fellowship, 'ring matrix')).toBe(false);
    });
});

describe('address values', () => {
    it('recognizes the shelvings and the kinds, and nothing else', () => {
        expect(isShelfOrder('saga')).toBe(true);
        expect(isShelfOrder('rating')).toBe(false);
        expect(isShelfOrder(null)).toBe(false);
        expect(isKindFilter('tv')).toBe(true);
        expect(isKindFilter('person')).toBe(false);
    });
});
