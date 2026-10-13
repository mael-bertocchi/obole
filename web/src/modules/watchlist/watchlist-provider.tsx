import type { Maybe } from 'models';
import { WatchlistContext, WatchlistSheetContext } from 'modules/watchlist/watchlist-context';
import type { TitleReference, WatchlistProviderProps, WatchlistSheetProviderProps, WatchlistSheetRoute } from 'modules/watchlist/watchlist-models';
import watchlistService from 'modules/watchlist/watchlist-service';
import { WatchlistStore } from 'modules/watchlist/watchlist-store';
import { useCallback, useMemo, useState, type JSX } from 'react';
import { IDENTITY_SESSION_ENDED_EVENT } from 'utils/request';

/**
 * @var shared
 * @description The one watchlist the app and its tile on the home page share, built the first time either shows
 */
let shared: Maybe<WatchlistStore> = null;

/**
 * @function sharedStore
 * @description The shared watchlist, built on first use. It is forgotten once the session is over.
 *
 * @returns {WatchlistStore} The watchlist
 */
function sharedStore(): WatchlistStore {
    if (shared === null) {
        const store = new WatchlistStore(watchlistService);

        window.addEventListener(IDENTITY_SESSION_ENDED_EVENT, () => store.reset());
        shared = store;
    }

    return shared;
}

/**
 * @function WatchlistProvider
 * @description A context provider sharing the watchlist with its pages, or its tile
 *
 * @param {WatchlistProviderProps} props The provider props
 * @returns {JSX.Element} The watchlist provider component
 */
export function WatchlistProvider(props: WatchlistProviderProps): JSX.Element {
    return (
        <WatchlistContext.Provider value={sharedStore()}>
            {props.children}
        </WatchlistContext.Provider>
    );
}

/**
 * @function WatchlistSheetProvider
 * @description A context provider for the watchlist's one sheet: the search, or a title
 *
 * @param {WatchlistSheetProviderProps} props The provider props
 * @returns {JSX.Element} The sheet provider component
 */
export function WatchlistSheetProvider(props: WatchlistSheetProviderProps): JSX.Element {
    const [route, setRoute] = useState<WatchlistSheetRoute>({ kind: 'closed' });

    const openSearch = useCallback(() => setRoute({ kind: 'search' }), []);
    const openTitle = useCallback((title: TitleReference, fromSearch = false) => setRoute({ kind: 'title', title, fromSearch }), []);
    const close = useCallback(() => setRoute({ kind: 'closed' }), []);
    const value = useMemo(() => ({ route, openSearch, openTitle, close }), [route, openSearch, openTitle, close]);

    return (
        <WatchlistSheetContext.Provider value={value}>
            {props.children}
        </WatchlistSheetContext.Provider>
    );
}
