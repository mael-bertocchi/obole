import type { Maybe } from 'models';
import type { WatchlistSheetContextProps } from 'modules/watchlist/watchlist-models';
import type { WatchlistStore } from 'modules/watchlist/watchlist-store';
import { createContext } from 'react';

/**
 * @constant WatchlistContext
 * @description The context sharing the watchlist with its pages and its tile
 */
export const WatchlistContext = createContext<Maybe<WatchlistStore>>(null);

/**
 * @constant WatchlistSheetContext
 * @description The context opening the watchlist's sheet from anywhere in the app
 */
export const WatchlistSheetContext = createContext<Maybe<WatchlistSheetContextProps>>(null);
