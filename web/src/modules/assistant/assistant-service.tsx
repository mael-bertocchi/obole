import type { Perhaps } from 'models';
import type { AssistantStatus } from 'modules/assistant/assistant-availability';
import { AssistantAvailabilityStore, assistantReason } from 'modules/assistant/assistant-availability';
import type { AssistantReply, ConversationMessage } from 'modules/assistant/assistant-models';
import { AssistantReplySchema } from 'modules/assistant/assistant-models';
import { dayKey } from 'modules/budget/budget-dates';
import type { MessageKey } from 'modules/language/language-en';
import { currentLanguage, t } from 'modules/language/language-service';
import { fetchWithAuthentication, RequestError } from 'utils/request';
import { z } from 'zod';

/**
 * @constant HISTORY_SENT
 * @description How many of the latest messages each request carries: the server takes forty at most.
 */
const HISTORY_SENT = 40;

/**
 * @constant ASSISTANT_TIMEOUT
 * @description How long to wait for an answer: the model may think and read through several tools before it answers
 */
const ASSISTANT_TIMEOUT = 2 * 60 * 1000;

/**
 * @constant AssistantStatusSchema
 * @description What the server answers when asked whether the assistant can answer
 */
const AssistantStatusSchema = z.object({
    isAvailable: z.boolean(),
    reason: z.string().nullable()
});

/**
 * @function readStatus
 * @description Asks the server whether the assistant can answer
 *
 * @returns {Promise<AssistantStatus>} Whether it can, and why not
 */
async function readStatus(): Promise<AssistantStatus> {
    return await fetchWithAuthentication('/v1/assistant/status', { method: 'GET' }, AssistantStatusSchema);
}

/**
 * @constant assistantAvailability
 * @description Whether the assistant can answer, shared by the launcher, the home page and the assistant itself
 */
export const assistantAvailability = new AssistantAvailabilityStore(readStatus);

/**
 * @function explainingAssistant
 * @description Rewords a refusal whose reason is the assistant's set-up, turning the assistant off until the server
 * says otherwise, or its spent quota, leaving every other failure as it is
 *
 * @param {unknown} error The failure
 * @returns {never} Rethrows it
 */
function explainingAssistant(error: unknown): never {
    if (!(error instanceof RequestError)) {
        throw error;
    }

    const key: Perhaps<MessageKey> = assistantReason(error.reason);

    if (key !== undefined) {
        assistantAvailability.note({ isAvailable: false, reason: error.reason });

        throw new RequestError(error.status, t(key), error.reason);
    }

    if (error.reason === 'assistant-timeout') {
        throw new RequestError(error.status, t('assistant.timeout'), error.reason);
    }

    if (error.status === 429) {
        throw new RequestError(error.status, t('assistant.quota'));
    }

    throw error;
}

/**
 * @function sendConversation
 * @description Asks the assistant to answer the last message of the conversation, in the page's language
 *
 * @param {readonly ConversationMessage[]} messages The conversation, ending with the owner's new message
 * @returns {Promise<AssistantReply>} Its answer and the changes it suggests
 */
async function sendConversation(messages: readonly ConversationMessage[]): Promise<AssistantReply> {
    const body = {
        messages: messages.filter((message) => message.text.trim() !== '').slice(-HISTORY_SENT).map((message) => ({ role: message.role, text: message.text })),
        language: currentLanguage(),
        today: dayKey(new Date())
    };

    const reply = await fetchWithAuthentication('/v1/assistant/messages', { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(ASSISTANT_TIMEOUT) }, AssistantReplySchema).catch(explainingAssistant);

    assistantAvailability.note({ isAvailable: true, reason: null });

    return reply;
}

export default {
    readStatus,
    sendConversation
};
