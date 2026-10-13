import type { Maybe } from 'models';
import { WatchlistContext, WatchlistSheetContext } from 'modules/watchlist/watchlist-context';
import type { WatchlistSheetContextProps, WatchlistSnapshot } from 'modules/watchlist/watchlist-models';
import type { WatchlistStore } from 'modules/watchlist/watchlist-store';
import { useContext, useEffect, useSyncExternalStore } from 'react';

/**
 * @constant CATCH_UP_EVERY
 * @description How often an open watchlist reads the server again
 */
const CATCH_UP_EVERY = 5 * 60 * 1000;

/**
 * @function useWatchlistContext
 * @description A custom hook to access the watchlist
 *
 * @returns {WatchlistStore} The watchlist
 */
export function useWatchlistContext(): WatchlistStore {
    const context: Maybe<WatchlistStore> = useContext(WatchlistContext);

    if (!context) {
        throw new Error('The watchlist context must be used within the watchlist provider');
    }

    return context;
}

/**
 * @function useWatchlist
 * @description The watchlist as the page renders it, with where it stands with the server
 *
 * @returns {WatchlistSnapshot} The snapshot
 */
export function useWatchlist(): WatchlistSnapshot {
    const store = useWatchlistContext();

    return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * @function useWatchlistSheetContext
 * @description A custom hook to open the watchlist's sheet
 *
 * @returns {WatchlistSheetContextProps} The sheet's route and what changes it
 */
export function useWatchlistSheetContext(): WatchlistSheetContextProps {
    const context: Maybe<WatchlistSheetContextProps> = useContext(WatchlistSheetContext);

    if (!context) {
        throw new Error('The watchlist sheet context must be used within the watchlist sheet provider');
    }

    return context;
}

/**
 * @function useCatchUp
 * @description Reads the watchlist when it opens (even in a tab opened in the background), when the page comes back
 * into view, and every few minutes while visible, so what was added elsewhere shows
 *
 * @param {WatchlistStore} store The watchlist
 */
export function useCatchUp(store: WatchlistStore): void {
    useEffect(() => {
        /**
         * @function catchUp
         * @description Reads the watchlist again while the page is visible
         */
        const catchUp = (): void => {
            if (document.visibilityState === 'visible') {
                void store.refresh();
            }
        };

        void store.refresh();
        document.addEventListener('visibilitychange', catchUp);
        window.addEventListener('online', catchUp);

        const timer = window.setInterval(catchUp, CATCH_UP_EVERY);

        return () => {
            document.removeEventListener('visibilitychange', catchUp);
            window.removeEventListener('online', catchUp);
            window.clearInterval(timer);
        };
    }, [store]);
}
