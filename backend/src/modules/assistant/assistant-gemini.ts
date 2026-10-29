import type { FastifyBaseLogger } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { ASSISTANT_NOT_CONFIGURED, ASSISTANT_REFUSED, ASSISTANT_UNKNOWN_MODEL, ASSISTANT_UNREACHABLE } from 'src/modules/assistant/assistant-models';
import type { Variables } from 'src/plugins/environment';
import { RequestError } from 'src/shared/models';
import { z } from 'zod';

/**
 * @constant GEMINI_TIMEOUT
 * @description How long to wait on Gemini for one turn before calling it unavailable.
 */
const GEMINI_TIMEOUT = 45 * 1000;

/**
 * @constant GeminiPartSchema
 * @description Zod schema for one part of a turn: text, a call to a tool, or a tool's result. Unknown fields (the
 * model's thought signature among them) are kept, since a part goes back to Gemini exactly as it came.
 */
export const GeminiPartSchema = z.looseObject({
    text: z.string().optional(),
    thought: z.boolean().optional(),
    functionCall: z.looseObject({
        id: z.string().optional(),
        name: z.string(),
        args: z.record(z.string(), z.unknown()).optional()
    }).optional()
});

/**
 * @constant GeminiContentSchema
 * @description Zod schema for one turn of the conversation, as Gemini writes it.
 */
export const GeminiContentSchema = z.object({
    role: z.string().optional(),
    parts: z.array(GeminiPartSchema).default([])
});

/**
 * @constant GeminiAnswerSchema
 * @description Zod schema for Gemini's answer to one turn: its first candidate is the one kept.
 */
const GeminiAnswerSchema = z.object({
    candidates: z.array(z.object({
        content: GeminiContentSchema.optional(),
        finishReason: z.string().optional()
    })).min(1)
});

/**
 * @interface GeminiFunction
 * @description A tool as Gemini is told about it.
 */
export interface GeminiFunction {
    name: string; /*!< Its name */
    description: string; /*!< What it does and when to use it */
    parameters: Record<string, unknown>; /*!< Its arguments, as an OpenAPI schema */
}

/**
 * @interface GeminiTurnRequest
 * @description What one turn sends Gemini.
 */
export interface GeminiTurnRequest {
    instruction: string; /*!< The system instruction */
    contents: GeminiContent[]; /*!< The conversation so far */
    functions: GeminiFunction[]; /*!< The tools it may call */
}

/**
 * @type GeminiPart
 * @description One part of a turn.
 */
export type GeminiPart = z.infer<typeof GeminiPartSchema>;

/**
 * @type GeminiContent
 * @description One turn of the conversation.
 */
export type GeminiContent = z.infer<typeof GeminiContentSchema>;

/**
 * @function failureOf
 * @description Why a request to Gemini never got an answer, in words: the error's name and message, then its cause's,
 * where Node keeps the network's own reason (a timeout, a refused connection, an unknown host).
 *
 * @param {unknown} error What `fetch` threw.
 *
 * @returns {string} Why.
 */
export function failureOf(error: unknown): string {
    if (!(error instanceof Error)) {
        return String(error);
    }

    const cause: unknown = error.cause;
    const code = typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string' ? ` [${cause.code}]` : '';
    const reason = cause instanceof Error ? ` (${cause.message}${code})` : code;

    return `${error.name}: ${error.message}${reason}`;
}

/**
 * @function generate
 * @description Asks Gemini for its next turn. Nothing is kept on Gemini's side between turns: the whole conversation is
 * sent every time.
 *
 * @param {Variables} variables The environment, holding Gemini's address, model and key.
 * @param {FastifyBaseLogger} logger The request logger.
 * @param {GeminiTurnRequest} turn What to send.
 *
 * @returns {Promise<GeminiContent>} The model's turn. Rejects with 503 when Gemini can't help, saying why in
 * `data.reason` when the key is missing or refused, the model unknown or Gemini unreachable, and with 429 when its quota is
 * spent.
 */
export async function generate(variables: Variables, logger: FastifyBaseLogger, turn: GeminiTurnRequest): Promise<GeminiContent> {
    if (variables.ASSISTANT_GEMINI_KEY === '') {
        throw new RequestError(StatusCodes.SERVICE_UNAVAILABLE, 'The assistant is not configured', { reason: ASSISTANT_NOT_CONFIGURED });
    }

    let response: Response;

    try {
        response = await fetch(`${variables.ASSISTANT_GEMINI_URL}/models/${variables.ASSISTANT_GEMINI_MODEL}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': variables.ASSISTANT_GEMINI_KEY },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: turn.instruction }] },
                contents: turn.contents,
                tools: [{ functionDeclarations: turn.functions }]
            }),
            signal: AbortSignal.timeout(GEMINI_TIMEOUT)
        });
    } catch (error: unknown) {
        logger.error({ url: variables.ASSISTANT_GEMINI_URL, failure: failureOf(error) }, 'Gemini unreachable');

        throw new RequestError(StatusCodes.SERVICE_UNAVAILABLE, 'The assistant is unavailable', { reason: ASSISTANT_UNREACHABLE });
    }

    if (response.status === Number(StatusCodes.TOO_MANY_REQUESTS)) {
        logger.warn('Gemini quota spent');

        throw new RequestError(StatusCodes.TOO_MANY_REQUESTS, 'The assistant is out of quota for now');
    }

    if (response.status === Number(StatusCodes.NOT_FOUND)) {
        logger.error({ model: variables.ASSISTANT_GEMINI_MODEL }, 'Gemini does not know the model: check ASSISTANT_GEMINI_MODEL');

        throw new RequestError(StatusCodes.SERVICE_UNAVAILABLE, 'The assistant does not know the model', { reason: ASSISTANT_UNKNOWN_MODEL });
    }

    if (!response.ok) {
        const body = await response.text().catch(() => '');

        if (response.status === Number(StatusCodes.UNAUTHORIZED) || response.status === Number(StatusCodes.FORBIDDEN) || body.includes('API_KEY_INVALID')) {
            logger.error({ status: response.status }, 'Gemini refused the key: check ASSISTANT_GEMINI_KEY');

            throw new RequestError(StatusCodes.SERVICE_UNAVAILABLE, 'The assistant refused the key', { reason: ASSISTANT_REFUSED });
        }

        logger.error({ status: response.status, body }, 'Gemini refused the request');

        throw new RequestError(StatusCodes.SERVICE_UNAVAILABLE, 'The assistant is unavailable');
    }

    const parsed = GeminiAnswerSchema.safeParse(await response.json().catch(() => null));

    if (!parsed.success) {
        logger.error({ issues: parsed.error.issues }, 'Gemini answered in an unexpected shape');

        throw new RequestError(StatusCodes.SERVICE_UNAVAILABLE, 'The assistant is unavailable');
    }

    const [candidate] = parsed.data.candidates;

    return { role: 'model', parts: candidate?.content?.parts ?? [] };
}
