import type { Perhaps } from 'src/shared/models';

/**
 * @interface OneTimeEntry
 * @description A value kept until it is taken or lapses.
 */
interface OneTimeEntry<T> {
    value: T; /*!< What was put */
    expiresAt: number; /*!< When it lapses, in milliseconds */
}

/**
 * @class OneTimeStore
 * @description Keeps short-lived, single-use values in memory, such as the challenges a passkey signs or the codes the
 * app trades for a session: each can be taken once, and only before it lapses. It holds a bounded number of them, so a
 * flood of requests can't grow it without end; past the bound the oldest goes first.
 */
export class OneTimeStore<T> {
    private entries = new Map<string, OneTimeEntry<T>>(); /*!< The values, oldest first */

    /**
     * @constructor
     * @description Creates an empty store
     *
     * @param {number} lifetime How long a value stays takeable, in milliseconds
     * @param {number} capacity How many values it holds at most
     */
    constructor(private readonly lifetime: number, private readonly capacity: number = 1000) {}

    /**
     * @method put
     * @description Keeps a value under a key.
     *
     * @param {string} key The key.
     * @param {T} value The value.
     * @param {number} now The current time, in milliseconds.
     */
    put(key: string, value: T, now: number = Date.now()): void {
        this.sweep(now);
        this.entries.delete(key);

        while (this.entries.size >= this.capacity) {
            const [oldest] = this.entries.keys();

            if (oldest === undefined) {
                break;
            }

            this.entries.delete(oldest);
        }

        this.entries.set(key, { value, expiresAt: now + this.lifetime });
    }

    /**
     * @method take
     * @description Hands back a value and forgets it, so it can't be taken twice.
     *
     * @param {string} key The key.
     * @param {number} now The current time, in milliseconds.
     *
     * @returns {Perhaps<T>} The value, or nothing when it was never put, was already taken or has lapsed.
     */
    take(key: string, now: number = Date.now()): Perhaps<T> {
        const entry = this.entries.get(key);

        this.entries.delete(key);

        return entry !== undefined && entry.expiresAt > now ? entry.value : undefined;
    }

    /**
     * @method sweep
     * @description Forgets the values that lapsed.
     *
     * @param {number} now The current time, in milliseconds.
     */
    private sweep(now: number): void {
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= now) {
                this.entries.delete(key);
            }
        }
    }
}
