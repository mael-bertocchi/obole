import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { hasZodFastifySchemaValidationErrors, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { StatusCodes } from 'http-status-codes';
import type { PrismaClient } from 'prisma/generated/prisma/client';
import assistantRoutes from 'src/modules/assistant/assistant-routes';
import { AssistantStatus } from 'src/modules/assistant/assistant-status';
import type { Variables } from 'src/plugins/environment';
import type { IdentityService } from 'src/plugins/identity';
import type { Maybe } from 'src/shared/models';
import { RequestError } from 'src/shared/models';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { standIn } from '../../support/stand-in';
import { testVariables } from '../../support/variables';

/**
 * @interface GeminiCall
 * @description A request the Gemini stand-in received
 */
interface GeminiCall {
    url: string; /*!< Where it went */
    key: Maybe<string>; /*!< The key it carried */
    body: { contents: { role: string; parts: Record<string, unknown>[] }[]; tools: { functionDeclarations: { name: string }[] }[]; generationConfig: Record<string, unknown> }; /*!< What it sent */
}

/**
 * @function stubGemini
 * @description Replaces `fetch` with a Gemini stand-in answering each turn in order with the given parts.
 *
 * @param {unknown[][]} turns The parts of each turn, in order.
 * @param {number} status The status every answer carries.
 *
 * @returns {GeminiCall[]} The requests it receives, as they come.
 */
function stubGemini(turns: unknown[][], status: number = 200): GeminiCall[] {
    const calls: GeminiCall[] = [];

    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
        const headers = new Headers(init.headers);

        calls.push({ url, key: headers.get('x-goog-api-key'), body: standIn<GeminiCall['body']>(JSON.parse(typeof init.body === 'string' ? init.body : '{}')) });

        const parts = turns[calls.length - 1] ?? [{ text: 'Done.' }];

        return Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }] }), { status }));
    }));

    return calls;
}

/**
 * @constant groceries
 * @description An operation the stand-in database holds
 */
const groceries = {
    id: 'op-1',
    date: new Date('2026-10-24T18:00:00Z'),
    name: 'Monoprix',
    description: null,
    categoryId: 'groceries',
    location: 'Paris',
    amount: 42.5,
    currencyCode: 'EUR',
    rateToEuro: 1,
    isOnline: false,
    isRecurring: false,
    deletedAt: null
};

/**
 * @interface TestApp
 * @description A server carrying the assistant's route, and the stand-in tables it reads.
 */
interface TestApp {
    app: FastifyInstance; /*!< The server */
    operations: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }; /*!< The operations table */
}

/**
 * @function buildApp
 * @description Builds an instance carrying just what the assistant depends on.
 */
async function buildApp(variables: Variables = testVariables()): Promise<TestApp> {
    const operations = {
        findMany: vi.fn(() => Promise.resolve([groceries])),
        findUnique: vi.fn(({ where }: { where: { id: string } }) => Promise.resolve(where.id === groceries.id ? groceries : null)),
        create: vi.fn(),
        update: vi.fn()
    };
    const categories = { findMany: vi.fn(() => Promise.resolve([{ id: 'groceries', name: 'Groceries', monthlyLimit: 400 }, { id: 'restaurant', name: 'Restaurant', monthlyLimit: 250 }])) };
    const app = Fastify();

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorate('variables', variables);
    app.decorate('prisma', standIn<PrismaClient>({ budgetOperation: operations, budgetCategory: categories }));
    app.decorate('identity', standIn<IdentityService>({ authenticate: () => Promise.resolve() }));
    app.decorate('assistant', new AssistantStatus(variables, app.log));

    app.setErrorHandler((error: Error, _request, reply) => {
        let code = StatusCodes.INTERNAL_SERVER_ERROR;
        let data: unknown = undefined;

        if (error instanceof RequestError) {
            code = error.code;
            data = error.data ?? undefined;
        } else if (hasZodFastifySchemaValidationErrors(error)) {
            code = StatusCodes.BAD_REQUEST;
        }

        return reply.status(code).send({ message: error.message, data });
    });

    await app.register(assistantRoutes, { prefix: '/v1/assistant' });

    return { app, operations };
}

/**
 * @function ask
 * @description A request carrying one message from the owner
 */
function ask(text: string): object {
    return { messages: [{ role: 'user', text }], language: 'fr', today: '2026-10-29' };
}

/**
 * @interface ReplyBody
 * @description What the route answers
 */
interface ReplyBody {
    data: { text: string; proposals: Record<string, unknown>[] }; /*!< The answer and its suggestions */
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('POST /v1/assistant/messages', () => {
    it('reads the budget through a tool, sends the result back, and answers', async () => {
        const calls = stubGemini([
            [{ functionCall: { id: 'call-1', name: 'search_operations', args: { query: 'monoprix' } }, thoughtSignature: 'sig-1' }],
            [{ text: 'Tu as dépensé 42,50 € chez Monoprix.' }]
        ]);
        const { app, operations } = await buildApp();
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Combien chez Monoprix ?') });

        expect(response.statusCode).toBe(StatusCodes.OK);
        expect(response.json<ReplyBody>().data).toEqual({ text: 'Tu as dépensé 42,50 € chez Monoprix.', proposals: [] });
        expect(calls[0]).toMatchObject({ url: 'https://gemini.example.fr/v1beta/models/gemini-test:generateContent', key: 'a-test-gemini-key' });
        expect(calls[0]?.body.generationConfig).toEqual({ thinkingConfig: { thinkingLevel: 'low' } });
        expect(operations.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { deletedAt: null } });

        const second = calls[1]?.body.contents ?? [];

        expect(second[1]).toEqual({ role: 'model', parts: [{ functionCall: { id: 'call-1', name: 'search_operations', args: { query: 'monoprix' } }, thoughtSignature: 'sig-1' }] });
        expect(second[2]?.parts[0]).toMatchObject({ functionResponse: { id: 'call-1', name: 'search_operations', response: { count: 1, totalEuros: 42.5 } } });

        await app.close();
    });

    it('turns a suggested operation into a proposal without storing anything', async () => {
        stubGemini([
            [{ functionCall: { id: 'call-1', name: 'propose_create_operation', args: { date: '2026-10-28', name: 'Déjeuner', categoryId: 'restaurant', amount: 12.5, currencyCode: 'CHF', location: 'Genève' } } }],
            [{ text: 'Je te propose de l’ajouter, confirme-le.' }]
        ]);
        const { app, operations } = await buildApp();
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('12,50 CHF déjeuner à Genève hier') });
        const { proposals } = response.json<ReplyBody>().data;

        expect(proposals).toHaveLength(1);
        expect(proposals[0]).toMatchObject({ kind: 'createOperation', draft: { date: '2026-10-28', name: 'Déjeuner', categoryId: 'restaurant', amount: 12.5, currencyCode: 'CHF', location: 'Genève' } });
        expect(String(proposals[0]?.id)).toMatch(/^[0-9a-f-]{36}$/);
        expect(operations.create).not.toHaveBeenCalled();
        expect(operations.update).not.toHaveBeenCalled();

        await app.close();
    });

    it('shows the operation a suggested deletion is about', async () => {
        stubGemini([[{ functionCall: { id: 'call-1', name: 'propose_delete_operation', args: { operationId: 'op-1' } } }], [{ text: 'À confirmer.' }]]);
        const { app } = await buildApp();
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Supprime Monoprix') });

        expect(response.json<ReplyBody>().data.proposals).toEqual([{ kind: 'deleteOperation', operation: { id: 'op-1', date: '2026-10-24T18:00:00.000Z', name: 'Monoprix', categoryId: 'groceries', amount: 42.5, currencyCode: 'EUR', euroAmount: 42.5 } }]);

        await app.close();
    });

    it('tells the model what to fix when its arguments do not hold up', async () => {
        const calls = stubGemini([
            [{ functionCall: { id: 'call-1', name: 'propose_create_operation', args: { date: '2026-10-28', name: 'Déjeuner', categoryId: 'food', amount: 12.5, currencyCode: 'EUR' } } }],
            [{ text: 'Quelle catégorie ?' }]
        ]);
        const { app } = await buildApp();
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Déjeuner 12,50') });

        expect(response.json<ReplyBody>().data.proposals).toEqual([]);
        expect(JSON.stringify(calls[1]?.body.contents[2])).toContain('Unknown category');

        await app.close();
    });

    it('stops offering tools once the model has used up its rounds', async () => {
        const call = [{ functionCall: { name: 'search_operations', args: {} } }];
        const calls = stubGemini([call, call, call, call, call, call, [{ text: 'Voilà.' }]]);
        const { app } = await buildApp();
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Analyse tout') });

        expect(response.statusCode).toBe(StatusCodes.OK);
        expect(calls).toHaveLength(7);
        expect(calls[6]?.body.tools[0]?.functionDeclarations).toEqual([]);

        await app.close();
    });

    it('answers 504 itself once the conversation runs past its deadline', async () => {
        const clock = { now: 0 };
        const call = [{ functionCall: { name: 'search_operations', args: {} } }];
        const calls = stubGemini([call, call, call, call]);
        const fetchStub = vi.mocked(fetch);
        const answer = fetchStub.getMockImplementation();

        vi.spyOn(Date, 'now').mockImplementation(() => clock.now);
        fetchStub.mockImplementation(async (...args) => {
            clock.now += 30 * 1000;

            return await (answer?.(...args) ?? Promise.reject(new Error('No stand-in')));
        });

        const { app } = await buildApp();
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Analyse tout') });

        expect(response.statusCode).toBe(StatusCodes.GATEWAY_TIMEOUT);
        expect(response.json<{ data: { reason: string } }>().data.reason).toBe('assistant-timeout');
        expect(calls).toHaveLength(3);

        await app.close();
    });

    it('says the assistant is not configured when no key is set', async () => {
        const calls = stubGemini([]);
        const { app } = await buildApp(testVariables({ ASSISTANT_GEMINI_KEY: '' }));
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Bonjour') });

        expect(response.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE);
        expect(response.json<{ data: { reason: string } }>().data.reason).toBe('assistant-not-configured');
        expect(calls).toHaveLength(0);

        await app.close();
    });

    it('passes on a spent quota', async () => {
        stubGemini([[]], StatusCodes.TOO_MANY_REQUESTS);
        const { app } = await buildApp();
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Bonjour') });

        expect(response.statusCode).toBe(StatusCodes.TOO_MANY_REQUESTS);

        await app.close();
    });

    it('refuses a conversation that does not end with the owner', async () => {
        const { app } = await buildApp();
        const response = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: { messages: [{ role: 'assistant', text: 'Bonjour' }], language: 'fr', today: '2026-10-29' } });

        expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);

        await app.close();
    });
});

/**
 * @function stubModelCard
 * @description Replaces `fetch` with a Gemini stand-in answering every request with the given status.
 *
 * @param {number} status The status of every answer.
 * @param {string} body The body of every answer.
 *
 * @returns {string[]} Where the requests it receives went, as they come.
 */
function stubModelCard(status: number, body: string = '{}'): string[] {
    const urls: string[] = [];

    vi.stubGlobal('fetch', vi.fn((url: string) => {
        urls.push(url);

        return Promise.resolve(new Response(body, { status }));
    }));

    return urls;
}

/**
 * @interface StatusBody
 * @description What the status route answers
 */
interface StatusBody {
    data: { isAvailable: boolean; reason: Maybe<string> }; /*!< Whether the assistant can answer, and why not */
}

describe('GET /v1/assistant/status', () => {
    it('reads the model card once and says the assistant is available', async () => {
        const urls = stubModelCard(StatusCodes.OK, '{"name":"models/gemini-test"}');
        const { app } = await buildApp();
        const first = await app.inject({ method: 'GET', url: '/v1/assistant/status' });
        const second = await app.inject({ method: 'GET', url: '/v1/assistant/status' });

        expect(first.json<StatusBody>().data).toEqual({ isAvailable: true, reason: null });
        expect(second.json<StatusBody>().data).toEqual({ isAvailable: true, reason: null });
        expect(urls).toEqual(['https://gemini.example.fr/v1beta/models/gemini-test']);

        await app.close();
    });

    it('says the key is refused', async () => {
        stubModelCard(StatusCodes.BAD_REQUEST, '{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}');
        const { app } = await buildApp();
        const response = await app.inject({ method: 'GET', url: '/v1/assistant/status' });

        expect(response.json<StatusBody>().data).toEqual({ isAvailable: false, reason: 'assistant-refused' });

        await app.close();
    });

    it('says the model is unknown', async () => {
        stubModelCard(StatusCodes.NOT_FOUND);
        const { app } = await buildApp();
        const response = await app.inject({ method: 'GET', url: '/v1/assistant/status' });

        expect(response.json<StatusBody>().data).toEqual({ isAvailable: false, reason: 'assistant-unknown-model' });

        await app.close();
    });

    it('says the assistant is not configured without asking Gemini', async () => {
        const urls = stubModelCard(StatusCodes.OK);
        const { app } = await buildApp(testVariables({ ASSISTANT_GEMINI_KEY: '' }));
        const response = await app.inject({ method: 'GET', url: '/v1/assistant/status' });

        expect(response.json<StatusBody>().data).toEqual({ isAvailable: false, reason: 'assistant-not-configured' });
        expect(urls).toEqual([]);

        await app.close();
    });

    it('learns from a conversation that Gemini refused the key', async () => {
        stubModelCard(StatusCodes.FORBIDDEN);
        const { app } = await buildApp();

        await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Bonjour') });

        const urls = stubModelCard(StatusCodes.OK);
        const response = await app.inject({ method: 'GET', url: '/v1/assistant/status' });

        expect(response.json<StatusBody>().data).toEqual({ isAvailable: false, reason: 'assistant-refused' });
        expect(urls).toEqual([]);

        await app.close();
    });

    it('keeps the assistant on when one answer took too long', async () => {
        stubModelCard(StatusCodes.OK);
        const { app } = await buildApp();

        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))));

        const answer = await app.inject({ method: 'POST', url: '/v1/assistant/messages', payload: ask('Bonjour') });

        expect(answer.statusCode).toBe(StatusCodes.GATEWAY_TIMEOUT);
        expect(answer.json<{ data: { reason: string } }>().data.reason).toBe('assistant-timeout');

        stubModelCard(StatusCodes.OK);
        const response = await app.inject({ method: 'GET', url: '/v1/assistant/status' });

        expect(response.json<StatusBody>().data).toEqual({ isAvailable: true, reason: null });

        await app.close();
    });
});
