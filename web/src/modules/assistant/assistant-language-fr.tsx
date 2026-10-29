import type { AssistantMessages } from 'modules/assistant/assistant-language-en';

/**
 * @constant assistantFr
 * @description Every sentence the assistant shows, in French. A no-break space keeps a question mark on the line of the
 * word it follows.
 */
export const assistantFr: AssistantMessages = {
    'assistant.appName': 'Assistant',
    'assistant.appSummary': 'Vos questions sur votre budget et votre watchlist',

    'assistant.tryAsking': 'Demandez par exemple',
    'assistant.exampleSpending': 'Combien en restaurants ce mois-ci\u00a0?',
    'assistant.exampleLog': 'Déjeuner 12,50\u00a0€ hier',

    'assistant.eyebrow': 'Assistant',
    'assistant.title': 'Posez votre question',
    'assistant.intro': 'Interrogez-le sur vos dépenses ou votre watchlist, ou décrivez une dépense à ajouter. Rien ne change sans votre confirmation.',
    'assistant.placeholder': 'Combien ai-je dépensé en restaurants ce mois-ci ?',
    'assistant.send': 'Envoyer',
    'assistant.thinking': 'Réflexion',
    'assistant.newConversation': 'Nouvelle conversation',
    'assistant.privacy': 'Vos messages et les données que l’assistant consulte sont envoyés à Google Gemini.',
    'assistant.notConfigured': 'L’assistant n’est pas configuré : ajoutez ASSISTANT_GEMINI_KEY à l’environnement du serveur.',
    'assistant.refused': 'Gemini a refusé la clé : vérifiez ASSISTANT_GEMINI_KEY sur le serveur.',
    'assistant.quota': 'L’assistant a épuisé son quota pour le moment. Réessayez dans un instant.',
    'assistant.invalidDate': 'Cette suggestion porte une date inutilisable.',
    'assistant.rateMissing': 'Aucun taux de change pour {code} ce jour-là.',

    'assistant.proposeCreate': 'Ajouter une opération',
    'assistant.proposeUpdate': 'Modifier une opération',
    'assistant.proposeDelete': 'Supprimer une opération',
    'assistant.proposeRate': 'Noter un titre',
    'assistant.deleteNote': 'Elle ira dans la corbeille, d’où vous pourrez la restaurer.',
    'assistant.confirm': 'Confirmer',
    'assistant.dismiss': 'Ignorer',
    'assistant.applied': 'Fait',
    'assistant.dismissed': 'Ignoré',
    'assistant.watchedOn': 'Vu le {date}'
};
