import EmptyStateComponent from 'components/empty-state/empty-state';
import PosterComponent from 'components/poster/poster';
import RatingComponent from 'components/rating/rating';
import type { MessageKey } from 'modules/language/language-en';
import { t } from 'modules/language/language-service';
import { dayText, localized, ratingText, releaseYear } from 'modules/watchlist/watchlist-formatting';
import { useWatchlist, useWatchlistSheetContext } from 'modules/watchlist/watchlist-hooks';
import type { Entry, WatchlistSheetContextProps } from 'modules/watchlist/watchlist-models';
import type { WatchedOrder } from 'modules/watchlist/watchlist-shelves';
import { isWatchedOrder, watchedEntries } from 'modules/watchlist/watchlist-shelves';
import { useMemo, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * @constant ORDERS
 * @description Every way to list the watched titles, and what it is called
 */
const ORDERS: readonly { order: WatchedOrder; name: MessageKey }[] = [
    { order: 'recent', name: 'watchlist.latestWatched' },
    { order: 'best', name: 'watchlist.bestRated' }
];

/**
 * @interface WatchedRowComponentProps
 * @description Properties of one watched title
 */
interface WatchedRowComponentProps {
    entry: Entry; /*!< The title */
    onOpen: () => void; /*!< Called when it is tapped */
}

/**
 * @function WatchedRowComponent
 * @description One watched title: its poster, its name and year, its rating, when it was watched, and the start of
 * what was said about it
 *
 * @param {WatchedRowComponentProps} props The properties of the component
 */
function WatchedRowComponent(props: WatchedRowComponentProps): JSX.Element {
    const facts = [releaseYear(props.entry.releaseDate), props.entry.mediaType === 'tv' ? t('watchlist.series') : t('watchlist.movie')];

    return (
        <button
            type='button'
            onClick={props.onOpen}
            className='flex w-full items-start gap-4 px-4 py-3.5 text-left transition hover:bg-fill/60'
        >
            <PosterComponent
                path={props.entry.posterPath}
                title={localized(props.entry.title)}
                width='w92'
                className='w-14 rounded-lg'
            />
            <span className='min-w-0 flex-1'>
                <span className='block truncate text-[16px] font-semibold tracking-tight'>{localized(props.entry.title)}</span>
                <span className='block text-[13px] text-ink-tertiary'>{facts.filter((fact) => fact !== null).join(' • ')}</span>
                <span className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1'>
                    <RatingComponent
                        value={props.entry.rating}
                        label={ratingText(props.entry.rating)}
                        size={15}
                    />
                    {props.entry.watchedAt !== null && (
                        <span className='text-[12px] text-ink-tertiary'>
                            {t('watchlist.watchedOn', { date: dayText(props.entry.watchedAt) })}
                        </span>
                    )}
                </span>
                {props.entry.comment !== null && (
                    <span className='mt-1.5 line-clamp-2 block text-[14px] text-ink-secondary'>{props.entry.comment}</span>
                )}
            </span>
        </button>
    );
}

/**
 * @function WatchlistWatchedComponent
 * @description The "Watched" tab: every watched title with its rating and comment, the latest watched first or the
 * best rated first. The order lives in the address.
 *
 * @returns {JSX.Element} The watched titles
 */
function WatchlistWatchedComponent(): JSX.Element {
    const { entries } = useWatchlist();
    const { openTitle }: WatchlistSheetContextProps = useWatchlistSheetContext();
    const [params, setParams] = useSearchParams();
    const orderParam = params.get('by');
    const order: WatchedOrder = isWatchedOrder(orderParam) ? orderParam : 'recent';
    const watched = useMemo(() => watchedEntries(entries ?? [], order), [entries, order]);

    return (
        <div className='animate-rise'>
            <p className='eyebrow'>{t('watchlist.eyebrow')}</p>
            <h1 className='mt-1 text-[34px] font-semibold leading-tight tracking-tight'>{t('watchlist.watchedTitle')}</h1>
            <p className='mt-1 text-[15px] text-ink-secondary'>
                {watched.length === 1 ? t('watchlist.watchedOne') : t('watchlist.watchedMany', { count: watched.length })}
            </p>

            <div
                className='mt-6 inline-flex rounded-full bg-fill-strong/80 p-1'
                role='group'
                aria-label={t('watchlist.order')}
            >
                {ORDERS.map((option) => (
                    <button
                        key={option.order}
                        type='button'
                        aria-pressed={option.order === order}
                        onClick={() => setParams(option.order === 'recent' ? {} : { by: option.order }, { replace: true })}
                        className={`rounded-full px-3.5 py-1.5 text-[14px] font-medium transition ${option.order === order ? 'bg-white text-ink shadow-control' : 'text-ink-secondary hover:text-ink'}`}
                    >
                        {t(option.name)}
                    </button>
                ))}
            </div>

            <div className='mt-6'>
                {watched.length === 0 ? (
                    <EmptyStateComponent message={t('watchlist.noneWatched')} />
                ) : (
                    <div className='card divide-y divide-hairline overflow-hidden'>
                        {watched.map((entry) => (
                            <WatchedRowComponent
                                key={entry.id}
                                entry={entry}
                                onOpen={() => openTitle({ mediaType: entry.mediaType, tmdbId: entry.tmdbId })}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default WatchlistWatchedComponent;
