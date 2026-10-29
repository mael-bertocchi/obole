import assistantService, { assistantAvailability } from 'modules/assistant/assistant-service';
import { fetchWithAuthentication, RequestError } from 'utils/request';
import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/request', async (importOriginal) => ({ ...await importOriginal<typeof import('utils/request')>(), fetchWithAuthentication: vi.fn(() => Promise.resolve({ text: 'Bonjour', proposals: [] })) }));

describe('assistantService', () => {
    it('sends the conversation with the day and the language, leaving out empty answers', async () => {
        await assistantService.sendConversation([
            { id: '1', role: 'user', text: 'Supprime Monoprix', proposals: [] },
            { id: '2', role: 'assistant', text: '', proposals: [] },
            { id: '3', role: 'user', text: 'Et Carrefour ?', proposals: [] }
        ]);

        const [path, init] = vi.mocked(fetchWithAuthentication).mock.calls[0] ?? [];
        const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null;

        expect(path).toBe('/v1/assistant/messages');
        expect(body).toMatchObject({ messages: [{ role: 'user', text: 'Supprime Monoprix' }, { role: 'user', text: 'Et Carrefour ?' }], language: 'en' });
        expect(body).toHaveProperty('today', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    });

    it('says the assistant is unavailable when the server has no key', async () => {
        vi.mocked(fetchWithAuthentication).mockRejectedValueOnce(new RequestError(503, 'Refused', 'assistant-not-configured'));

        await expect(assistantService.sendConversation([{ id: '1', role: 'user', text: 'Bonjour', proposals: [] }])).rejects.toThrow('no Gemini API key is set on the server');
    });

    it('greys the assistant out once the server refuses its key', async () => {
        vi.mocked(fetchWithAuthentication).mockRejectedValueOnce(new RequestError(503, 'Refused', 'assistant-refused'));

        await expect(assistantService.sendConversation([{ id: '1', role: 'user', text: 'Bonjour', proposals: [] }])).rejects.toThrow('Gemini rejected the server’s API key');
        expect(assistantAvailability.getSnapshot()).toEqual({ isAvailable: false, reason: 'assistant.refused' });
    });
});
