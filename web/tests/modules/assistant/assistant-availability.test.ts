import { AssistantAvailabilityStore } from 'modules/assistant/assistant-availability';
import { describe, expect, it, vi } from 'vitest';

/**
 * @function settle
 * @description Lets the pending promises run.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AssistantAvailabilityStore', () => {
    it('stays available while the server has not said otherwise', () => {
        const store = new AssistantAvailabilityStore(() => new Promise(() => undefined));

        store.subscribe(() => undefined);

        expect(store.getSnapshot()).toEqual({ isAvailable: true, reason: null });
    });

    it('asks the server once and greys the assistant out with its reason', async () => {
        const read = vi.fn(() => Promise.resolve({ isAvailable: false, reason: 'assistant-refused' }));
        const store = new AssistantAvailabilityStore(read);
        const listener = vi.fn();

        store.subscribe(listener);
        store.subscribe(() => undefined);
        await settle();

        expect(read).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getSnapshot()).toEqual({ isAvailable: false, reason: 'assistant.refused' });
    });

    it('asks again next time when the question failed', async () => {
        const read = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ isAvailable: false, reason: 'assistant-unknown-model' });
        const store = new AssistantAvailabilityStore(read);

        store.subscribe(() => undefined);
        await settle();

        expect(store.getSnapshot().isAvailable).toBe(true);

        store.subscribe(() => undefined);
        await settle();

        expect(read).toHaveBeenCalledTimes(2);
        expect(store.getSnapshot()).toEqual({ isAvailable: false, reason: 'assistant.unknownModel' });
    });

    it('follows what the conversations meet', () => {
        const store = new AssistantAvailabilityStore(() => Promise.resolve({ isAvailable: true, reason: null }));

        store.note({ isAvailable: false, reason: 'assistant-not-configured' });

        expect(store.getSnapshot()).toEqual({ isAvailable: false, reason: 'assistant.notConfigured' });

        store.note({ isAvailable: true, reason: null });

        expect(store.getSnapshot()).toEqual({ isAvailable: true, reason: null });
    });
});
