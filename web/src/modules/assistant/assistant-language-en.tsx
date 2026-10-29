/**
 * @constant assistantEn
 * @description Every sentence the assistant shows, in English. The keys are what the rest of the code asks for; `{name}`
 * marks a value filled in when the sentence is used.
 */
export const assistantEn = {
    'assistant.appName': 'Assistant',
    'assistant.appSummary': 'Ask about your budget and watchlist',

    'assistant.tryAsking': 'Try asking',
    'assistant.exampleSpending': 'How much on restaurants this month?',
    'assistant.exampleLog': '€12.50 lunch yesterday',

    'assistant.eyebrow': 'Assistant',
    'assistant.title': 'Ask away',
    'assistant.intro': 'Ask about your spending or your watchlist, or describe an expense to log. Nothing changes until you confirm it.',
    'assistant.placeholder': 'How much did I spend on restaurants this month?',
    'assistant.send': 'Send',
    'assistant.thinking': 'Thinking',
    'assistant.newConversation': 'New conversation',
    'assistant.privacy': 'Your messages and the data the assistant reads are sent to Google Gemini.',
    'assistant.notConfigured': 'The assistant isn’t available: no Gemini API key is set on the server.',
    'assistant.refused': 'The assistant isn’t available: Gemini rejected the server’s API key.',
    'assistant.quota': 'The assistant has used up its quota for now. Try again in a moment.',
    'assistant.invalidDate': 'This suggestion has a date that can’t be used.',
    'assistant.rateMissing': 'No exchange rate for {code} on that day.',

    'assistant.proposeCreate': 'Log an operation',
    'assistant.proposeUpdate': 'Change an operation',
    'assistant.proposeDelete': 'Delete an operation',
    'assistant.proposeRate': 'Rate a title',
    'assistant.deleteNote': 'It will go to the trash, where you can restore it.',
    'assistant.confirm': 'Confirm',
    'assistant.dismiss': 'Dismiss',
    'assistant.applied': 'Done',
    'assistant.dismissed': 'Dismissed',
    'assistant.watchedOn': 'Watched on {date}'
};

/**
 * @type AssistantMessages
 * @description Every sentence of the assistant in one language. Typing a translation with it makes a forgotten sentence
 * a build error.
 */
export type AssistantMessages = Record<keyof typeof assistantEn, string>;
