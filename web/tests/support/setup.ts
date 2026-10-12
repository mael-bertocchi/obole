import { beforeEach } from 'vitest';

/**
 * @function memoryStorage
 * @description A Web Storage kept in memory. Node only offers `localStorage` behind a flag and warns each time it is
 * touched, while the page reads it as soon as the language module loads; the session's tokens live in `sessionStorage`.
 */
function memoryStorage(): Storage {
    const items = new Map<string, string>();

    return {
        /**
         * @method length
         * @description How many items are stored
         */
        get length() {
            return items.size;
        },
        clear: () => items.clear(),
        getItem: (key) => items.get(key) ?? null,
        key: (index) => [...items.keys()][index] ?? null,
        removeItem: (key) => {
            items.delete(key);
        },
        setItem: (key, value) => {
            items.set(key, String(value));
        }
    };
}

Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: memoryStorage(), configurable: true });

if (typeof window === 'undefined') {
    Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true });
}

beforeEach(async () => {
    const { chooseLanguage } = await import('modules/language/language-service');

    chooseLanguage('en');
    sessionStorage.clear();
});
