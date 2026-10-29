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
    'assistant.placeholder': 'Demandez à l’assistant',
    'assistant.send': 'Envoyer',
    'assistant.thinking': 'Réflexion',
    'assistant.newConversation': 'Nouvelle conversation',
    'assistant.privacy': 'Vos messages et les données que l’assistant consulte sont envoyés à Google Gemini.',
    'assistant.notConfigured': 'L’assistant est indisponible : aucune clé d’API Gemini n’est configurée sur le serveur.',
    'assistant.refused': 'L’assistant est indisponible : Gemini a refusé la clé d’API du serveur.',
    'assistant.unknownModel': 'L’assistant est indisponible : Gemini ne connaît pas le modèle configuré sur le serveur.',
    'assistant.unreachable': 'L’assistant est indisponible : Gemini ne répond pas pour le moment.',
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
