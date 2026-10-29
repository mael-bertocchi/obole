import type { FastifyBaseLogger } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { failureOf } from 'src/modules/assistant/assistant-gemini';
import type { AssistantAvailability } from 'src/modules/assistant/assistant-models';
import { ASSISTANT_NOT_CONFIGURED, ASSISTANT_REFUSED, ASSISTANT_UNKNOWN_MODEL, ASSISTANT_UNREACHABLE } from 'src/modules/assistant/assistant-models';
import type { Variables } from 'src/plugins/environment';
import type { Maybe } from 'src/shared/models';
import { RequestError } from 'src/shared/models';

/**
 * @constant PROBE_TIMEOUT
 * @description How long to wait on Gemini when checking the key and the model.
 */
const PROBE_TIMEOUT = 10 * 1000;

/**
 * @constant RETRY_AFTER
 * @description How long an unreachable Gemini is taken at its word before it is asked again. Every other answer holds
 * until the server restarts, which is what changing the key or the model takes.
 */
const RETRY_AFTER = 60 * 1000;

/**
 * @constant AVAILABLE
 * @description The assistant, ready to answer.
 */
const AVAILABLE: AssistantAvailability = { isAvailable: true, reason: null };

/**
 * @function unavailable
 * @description The assistant, unable to answer for a reason.
 *
 * @param {string} reason Why.
 *
 * @returns {AssistantAvailability} The availability.
 */
function unavailable(reason: string): AssistantAvailability {
    return { isAvailable: false, reason };
}

/**
 * @constant SET_UP_REASONS
 * @description The reasons that say the assistant can't answer at all, as opposed to one answer that went wrong.
 */
const SET_UP_REASONS = new Set([ASSISTANT_NOT_CONFIGURED, ASSISTANT_REFUSED, ASSISTANT_UNKNOWN_MODEL, ASSISTANT_UNREACHABLE]);

/**
 * @function reasonOf
 * @description The assistant's reason a refusal carries in its data, if any.
 *
 * @param {unknown} error The refusal.
 *
 * @returns {Maybe<string>} The reason, or null.
 */
function reasonOf(error: unknown): Maybe<string> {
    if (!(error instanceof RequestError) || error.data === null || !('reason' in error.data)) {
        return null;
    }

    return typeof error.data.reason === 'string' ? error.data.reason : null;
}

/**
 * @class AssistantStatus
 * @description Whether Gemini takes the key and knows the model, asked once at start-up by reading the model's card,
 * which costs no quota. The answer is kept, and corrected by what the conversations meet.
 */
export class AssistantStatus {
    private current: Maybe<AssistantAvailability> = null; /*!< The last answer, none before the first check */
    private checkedAt = 0; /*!< When it was given, in milliseconds */
    private pending: Maybe<Promise<AssistantAvailability>> = null; /*!< The check under way, shared by whoever asks */
    private readonly variables: Variables; /*!< The environment, holding Gemini's address, model and key */
    private readonly logger: FastifyBaseLogger; /*!< Where the outcome is written */

    /**
     * @constructor
     * @description Watches the assistant set up in the environment.
     *
     * @param {Variables} variables The environment.
     * @param {FastifyBaseLogger} logger Where the outcome is written.
     */
    constructor(variables: Variables, logger: FastifyBaseLogger) {
        this.variables = variables;
        this.logger = logger;
    }

    /**
     * @method read
     * @description Whether the assistant can answer, checking again only when Gemini was unreachable a while ago.
     *
     * @param {number} now The time, in milliseconds.
     *
     * @returns {Promise<AssistantAvailability>} The availability.
     */
    async read(now: number = Date.now()): Promise<AssistantAvailability> {
        const isStale = this.current?.reason === ASSISTANT_UNREACHABLE && now - this.checkedAt >= RETRY_AFTER;

        if (this.current !== null && !isStale) {
            return this.current;
        }

        return await this.check(now);
    }

    /**
     * @method check
     * @description Asks Gemini for the model's card, and keeps the answer.
     *
     * @param {number} now The time, in milliseconds.
     *
     * @returns {Promise<AssistantAvailability>} The availability.
     */
    async check(now: number = Date.now()): Promise<AssistantAvailability> {
        this.pending ??= this.probe().then((availability) => {
            this.keep(availability, now);
            this.pending = null;

            return availability;
        });

        return await this.pending;
    }

    /**
     * @method noteAnswer
     * @description Records that a conversation got its answer: Gemini takes the key and knows the model.
     */
    noteAnswer(): void {
        this.keep(AVAILABLE, Date.now());
    }

    /**
     * @method noteFailure
     * @description Records why a conversation failed, when the reason is the assistant's set-up rather than one answer
     * that took too long.
     *
     * @param {unknown} error The failure.
     */
    noteFailure(error: unknown): void {
        const reason = reasonOf(error);

        if (reason !== null && SET_UP_REASONS.has(reason)) {
            this.keep(unavailable(reason), Date.now());
        }
    }

    /**
     * @method keep
     * @description Keeps an answer, and writes it down when it changes.
     *
     * @param {AssistantAvailability} availability The answer.
     * @param {number} now When it was given, in milliseconds.
     */
    private keep(availability: AssistantAvailability, now: number): void {
        if (this.current?.reason !== availability.reason || this.current.isAvailable !== availability.isAvailable) {
            if (availability.isAvailable) {
                this.logger.info({ model: this.variables.ASSISTANT_GEMINI_MODEL }, 'Assistant ready');
            } else {
                this.logger.warn({ model: this.variables.ASSISTANT_GEMINI_MODEL, reason: availability.reason }, 'Assistant unavailable');
            }
        }

        this.current = availability;
        this.checkedAt = now;
    }

    /**
     * @method probe
     * @description Reads the model's card from Gemini: an answer means the key is taken and the model known.
     *
     * @returns {Promise<AssistantAvailability>} The availability.
     */
    private async probe(): Promise<AssistantAvailability> {
        if (this.variables.ASSISTANT_GEMINI_KEY === '') {
            return unavailable(ASSISTANT_NOT_CONFIGURED);
        }

        let response: Response;

        try {
            response = await fetch(`${this.variables.ASSISTANT_GEMINI_URL}/models/${this.variables.ASSISTANT_GEMINI_MODEL}`, { headers: { 'x-goog-api-key': this.variables.ASSISTANT_GEMINI_KEY }, signal: AbortSignal.timeout(PROBE_TIMEOUT) });
        } catch (error: unknown) {
            this.logger.error({ url: this.variables.ASSISTANT_GEMINI_URL, failure: failureOf(error) }, 'Gemini unreachable');

            return unavailable(ASSISTANT_UNREACHABLE);
        }

        if (response.ok) {
            return AVAILABLE;
        }

        if (response.status === Number(StatusCodes.NOT_FOUND)) {
            return unavailable(ASSISTANT_UNKNOWN_MODEL);
        }

        const body = await response.text().catch(() => '');

        if (response.status === Number(StatusCodes.UNAUTHORIZED) || response.status === Number(StatusCodes.FORBIDDEN) || body.includes('API_KEY_INVALID')) {
            return unavailable(ASSISTANT_REFUSED);
        }

        return unavailable(ASSISTANT_UNREACHABLE);
    }
}
