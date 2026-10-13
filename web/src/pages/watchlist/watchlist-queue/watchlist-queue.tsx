import PosterComponent from 'components/poster/poster';
import SearchFieldComponent from 'components/search-field/search-field';
import { Plus } from 'lucide-react';
import type { MessageKey } from 'modules/language/language-en';
import { t } from 'modules/language/language-service';
import { localized, releaseYear, titlesText } from 'modules/watchlist/watchlist-formatting';
import { useWatchlist, useWatchlistSheetContext } from 'modules/watchlist/watchlist-hooks';
import type { Entry, WatchlistSheetContextProps } from 'modules/watchlist/watchlist-models';
import type { KindFilter, ShelfOrder } from 'modules/watchlist/watchlist-shelves';
import { isKindFilter, isShelfOrder, KIND_FILTERS, matches, ofKind, SHELF_ORDERS, shelves, toWatch } from 'modules/watchlist/watchlist-shelves';
import { useMemo, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * @constant ORDER_NAMES
 * @description What each way of shelving is called
 */
const ORDER_NAMES: Record<ShelfOrder, MessageKey> = {
    genre: 'watchlist.byGenre',
    saga: 'watchlist.bySaga',
    recent: 'watchlist.byRecent'
};

/**
 * @constant KIND_NAMES
 * @description What each kind filter is called
 */
const KIND_NAMES: Record<KindFilter, MessageKey> = {
    all: 'watchlist.all',
    movie: 'watchlist.movies',
    tv: 'watchlist.seriesPlural'
};

/**
 * @interface PosterCardComponentProps
 * @description Properties of one title on a shelf
 */
interface PosterCardComponentProps {
    entry: Entry; /*!< The title */
    onOpen: () => void; /*!< Called when it is tapped */
}

/**
 * @function PosterCardComponent
 * @description One title on a shelf: its poster, its name and its year
 *
 * @param {PosterCardComponentProps} props The properties of the component
 */
function PosterCardComponent(props: PosterCardComponentProps): JSX.Element {
    const year = releaseYear(props.entry.releaseDate);

    return (
        <button type='button' onClick={props.onOpen} className='group flex flex-col text-left'>
            <PosterComponent path={props.entry.posterPath} title={localized(props.entry.title)} width='w342' className='w-full rounded-xl shadow-control transition group-hover:-translate-y-0.5 group-hover:shadow-card' />
            <span className='mt-2 line-clamp-2 text-[14px] font-medium leading-snug'>{localized(props.entry.title)}</span>
            <span className='text-[12px] text-ink-tertiary'>
                {[year, props.entry.mediaType === 'tv' ? t('watchlist.series') : null].filter((part) => part !== null).join(' • ')}
            </span>
        </button>
    );
}

/**
 * @function WatchlistQueueComponent
 * @description The "To watch" tab: the titles still to watch, shelved by genre, by saga (each saga's films in the order
 * they came out) or as one shelf, filtered by kind and by a search. The shelving, the filter and the search live in the
 * address.
 *
 * @returns {JSX.Element} The titles to watch
 */
function WatchlistQueueComponent(): JSX.Element {
    const { entries, genres } = useWatchlist();
    const { openSearch, openTitle }: WatchlistSheetContextProps = useWatchlistSheetContext();
    const [params, setParams] = useSearchParams();
    const orderParam = params.get('by');
    const kindParam = params.get('kind');
    const order: ShelfOrder = isShelfOrder(orderParam) ? orderParam : 'genre';
    const kind: KindFilter = isKindFilter(kindParam) ? kindParam : 'all';
    const query = params.get('q') ?? '';

    const pending = useMemo(() => ofKind(toWatch(entries ?? []), kind).filter((entry) => matches(entry, query)), [entries, kind, query]);
    const groups = useMemo(() => shelves(pending, order, genres), [pending, order, genres]);
    const total = toWatch(entries ?? []).length;

    /**
     * @function update
     * @description Changes the shelving, the filter or the search in the address, dropping the defaults
     */
    const update = (key: 'by' | 'kind' | 'q', value: string, fallback: string): void => {
        const next = new URLSearchParams(params);

        if (value === fallback) {
            next.delete(key);
        } else {
            next.set(key, value);
        }

        setParams(next, { replace: true });
    };

    let emptyMessage = t('watchlist.noneOfKind');

    if (total === 0) {
        emptyMessage = t('watchlist.emptyQueue');
    } else if (query.trim() !== '') {
        emptyMessage = t('watchlist.noMatch');
    }

    return (
        <div className='animate-rise'>
            <p className='eyebrow'>{t('watchlist.eyebrow')}</p>
            <h1 className='mt-1 text-[34px] font-semibold leading-tight tracking-tight'>{t('watchlist.toWatchTitle')}</h1>
            <p className='mt-1 text-[15px] text-ink-secondary'>
                {titlesText(total)}
            </p>

            <SearchFieldComponent value={query} onChange={(next) => update('q', next, '')} placeholder={t('watchlist.filter')} clearLabel={t('watchlist.clearSearch')} className='mt-6' />

            <div className='mt-4 flex flex-wrap items-center gap-3'>
                <div className='flex rounded-full bg-fill-strong/80 p-1' role='group' aria-label={t('watchlist.shelving')}>
                    {SHELF_ORDERS.map((option) => (
                        <button key={option} type='button' aria-pressed={option === order} onClick={() => update('by', option, 'genre')} className={`rounded-full px-3.5 py-1.5 text-[14px] font-medium transition ${option === order ? 'bg-white text-ink shadow-control' : 'text-ink-secondary hover:text-ink'}`}>
                            {t(ORDER_NAMES[option])}
                        </button>
                    ))}
                </div>
                <div className='flex gap-2' role='group' aria-label={t('watchlist.kind')}>
                    {KIND_FILTERS.map((option) => (
                        <button key={option} type='button' aria-pressed={option === kind} onClick={() => update('kind', option, 'all')} className={`h-8 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition ${option === kind ? 'bg-ink text-white' : 'bg-white text-ink shadow-control hover:bg-fill'}`}>
                            {t(KIND_NAMES[option])}
                        </button>
                    ))}
                </div>
            </div>

            {groups.length === 0 ? (
                <div className='mt-8 flex flex-col items-center rounded-2xl bg-fill px-6 py-10 text-center'>
                    <p className='text-[15px] text-ink-secondary'>
                        {emptyMessage}
                    </p>
                    {total === 0 && (
                        <button type='button' onClick={openSearch} className='mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[15px] font-semibold text-white transition hover:bg-accent-strong'>
                            <Plus size={17} strokeWidth={2.6} />
                            {t('watchlist.addFirst')}
                        </button>
                    )}
                </div>
            ) : groups.map((shelf) => (
                <section key={shelf.key} className='mt-9'>
                    {shelf.title !== null && (
                        <h2 className='eyebrow mb-3 flex items-baseline gap-2'>
                            {shelf.title}
                            <span className='font-medium normal-case tracking-normal text-ink-quaternary'>{shelf.entries.length}</span>
                        </h2>
                    )}
                    <div className='grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6'>
                        {shelf.entries.map((entry) => (
                            <PosterCardComponent key={entry.id} entry={entry} onOpen={() => openTitle({ mediaType: entry.mediaType, tmdbId: entry.tmdbId })} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

export default WatchlistQueueComponent;
