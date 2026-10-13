import PosterComponent from 'components/poster/poster';
import RatingComponent from 'components/rating/rating';
import SpinnerComponent from 'components/spinner/spinner';
import { t } from 'modules/language/language-service';
import { localized, ratingText } from 'modules/watchlist/watchlist-formatting';
import { useWatchlist, useWatchlistContext } from 'modules/watchlist/watchlist-hooks';
import { WatchlistProvider } from 'modules/watchlist/watchlist-provider';
import { toWatch, watchedEntries } from 'modules/watchlist/watchlist-shelves';
import { useEffect, type JSX } from 'react';

/**
 * @constant POSTERS
 * @description How many of the latest titles added the tile shows
 */
const POSTERS = 4;

/**
 * @function WatchlistGlanceComponent
 * @description How many titles are left to watch, the latest added, and the last one watched with its rating. It reads
 * the same watchlist the app shows, loading it if the app hasn't.
 *
 * @returns {JSX.Element} The glance at the watchlist
 */
function WatchlistGlanceComponent(): JSX.Element {
    const store = useWatchlistContext();
    const { entries, status } = useWatchlist();

    useEffect(() => {
        if (store.getSnapshot().entries === null) {
            void store.refresh();
        }
    }, [store]);

    if (entries === null) {
        return (
            <div className='flex h-[118px] items-center justify-center'>
                {status === 'loading' ? (
                    <SpinnerComponent />
                ) : <p className='text-[14px] text-ink-secondary'>{t('watchlist.loadFailed')}</p>}
            </div>
        );
    }

    const pending = toWatch(entries);
    const latest = [...pending].sort((first, second) => second.addedAt.getTime() - first.addedAt.getTime()).slice(0, POSTERS);
    const lastWatched = watchedEntries(entries, 'recent').at(0);

    return (
        <div className='flex min-h-[118px] items-start gap-4'>
            <div className='min-w-0 flex-1'>
                <p className='text-[13px] font-medium text-ink-secondary'>{t('watchlist.toWatch')}</p>
                <p className='mt-0.5 text-[30px] font-semibold leading-tight tracking-tight tabular-nums'>{pending.length}</p>
                {lastWatched === undefined ? (
                    <p className='text-[13px] text-ink-tertiary'>{t('watchlist.nothingWatched')}</p>
                ) : (
                    <div className='mt-1'>
                        <p className='truncate text-[13px] text-ink-tertiary'>{t('watchlist.lastWatched', { title: localized(lastWatched.title) })}</p>
                        {lastWatched.rating !== null && (
                            <RatingComponent value={lastWatched.rating} label={ratingText(lastWatched.rating)} size={13} />
                        )}
                    </div>
                )}
            </div>
            {latest.length > 0 && (
                <div className='flex shrink-0 -space-x-5' aria-hidden='true'>
                    {latest.map((entry, index) => (
                        <PosterComponent key={entry.id} path={entry.posterPath} title={localized(entry.title)} width='w92' className={`w-12 rounded-md shadow-control ring-2 ring-white ${index === 0 ? '' : 'mt-2'}`} />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * @function WatchlistWidgetComponent
 * @description The watchlist's tile on the home page
 *
 * @returns {JSX.Element} The widget
 */
function WatchlistWidgetComponent(): JSX.Element {
    return (
        <WatchlistProvider>
            <WatchlistGlanceComponent />
        </WatchlistProvider>
    );
}

export default WatchlistWidgetComponent;
