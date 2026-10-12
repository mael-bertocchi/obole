import type { Language } from 'modules/language/language-models';
import { currentLanguage, subscribeLanguage } from 'modules/language/language-service';
import { useSyncExternalStore } from 'react';

/**
 * @function useLanguage
 * @description The language the page is in, re-rendering whenever another is picked
 *
 * @returns {Language} The language
 */
export function useLanguage(): Language {
    return useSyncExternalStore(subscribeLanguage, currentLanguage);
}
