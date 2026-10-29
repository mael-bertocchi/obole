import type { Perhaps } from 'models';
import type { AssistantReply, ConversationMessage } from 'modules/assistant/assistant-models';
import { AssistantReplySchema } from 'modules/assistant/assistant-models';
import { dayKey } from 'modules/budget/budget-dates';
import type { MessageKey } from 'modules/language/language-en';
import { currentLanguage, t } from 'modules/language/language-service';
import { fetchWithAuthentication, RequestError } from 'utils/request';

/**
 * @constant HISTORY_SENT
 * @description How many of the latest messages each request carries: the server takes forty at most.
 */
const HISTORY_SENT = 40;

/**
 * @constant ASSISTANT_REASONS
 * @description What to say when the server tells why the assistant can't answer: only the owner can fix these, on the
 * server, so the page names what to fix
 */
const ASSISTANT_REASONS: Partial<Record<string, MessageKey>> = {
    'assistant-not-configured': 'assistant.notConfigured',
    'assistant-refused': 'assistant.refused'
};

/**
 * @function explainingAssistant
 * @description Rewords a refusal whose reason is the assistant's set-up, or its spent quota, leaving every other failure
 * as it is
 *
 * @param {unknown} error The failure
 * @returns {never} Rethrows it
 */
function explainingAssistant(error: unknown): never {
    if (!(error instanceof RequestError)) {
        throw error;
    }

    const key: Perhaps<MessageKey> = error.reason !== null ? ASSISTANT_REASONS[error.reason] : undefined;

    if (key !== undefined) {
        throw new RequestError(error.status, t(key), error.reason);
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

    return await fetchWithAuthentication('/v1/assistant/messages', { method: 'POST', body: JSON.stringify(body) }, AssistantReplySchema).catch(explainingAssistant);
}

export default {
    sendConversation
};
