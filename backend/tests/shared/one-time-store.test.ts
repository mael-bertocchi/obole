import { OneTimeStore } from 'src/shared/one-time-store';
import { describe, expect, it } from 'vitest';

describe('OneTimeStore', () => {
    it('hands a value back once', () => {
        const store = new OneTimeStore<string>(1000);

        store.put('challenge', 'authentication', 0);

        expect(store.take('challenge', 10)).toBe('authentication');
        expect(store.take('challenge', 10)).toBeUndefined();
    });

    it('lets a value lapse', () => {
        const store = new OneTimeStore<string>(1000);

        store.put('challenge', 'authentication', 0);

        expect(store.take('challenge', 1000)).toBeUndefined();
    });

    it('knows nothing of a key never put', () => {
        expect(new OneTimeStore<string>(1000).take('unknown')).toBeUndefined();
    });

    it('drops the oldest value past its capacity', () => {
        const store = new OneTimeStore<number>(1000, 2);

        store.put('first', 1, 0);
        store.put('second', 2, 1);
        store.put('third', 3, 2);

        expect(store.take('first', 3)).toBeUndefined();
        expect(store.take('second', 3)).toBe(2);
        expect(store.take('third', 3)).toBe(3);
    });
});
