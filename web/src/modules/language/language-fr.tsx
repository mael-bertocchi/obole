import { budgetFr } from 'modules/budget/budget-language-fr';
import type { Messages, PortalMessages } from 'modules/language/language-en';
import { watchlistFr } from 'modules/watchlist/watchlist-language-fr';

/**
 * @constant portalFr
 * @description Every sentence the portal itself shows, in French, and those its apps share. A no-break space keeps a
 * question mark on the line of the word it follows.
 */
const portalFr: PortalMessages = {
    'common.cancel': 'Annuler',
    'common.close': 'Fermer',
    'common.loading': 'Chargement',
    'common.irreversible': 'Cette action est irréversible.',

    'portal.tagline': 'Votre espace personnel.',
    'portal.loadFailed': 'Impossible de charger cette page',
    'portal.reload': 'Recharger',

    'signIn.prompt': 'Connectez-vous avec votre clé d’accès pour ouvrir votre espace.',
    'signIn.action': 'Se connecter avec une clé d’accès',
    'signIn.setUp': 'Configurer une clé d’accès',
    'signIn.setUpPrompt': 'Collez le jeton d’enrôlement défini dans l’environnement du serveur, puis créez votre clé d’accès.',
    'signIn.token': 'Jeton d’enrôlement',
    'signIn.create': 'Créer une clé d’accès',
    'signIn.back': 'Retour',

    'connect.title': 'Connecter l’app',
    'connect.prompt': 'Connectez-vous avec votre clé d’accès pour ouvrir Obole sur cet iPhone.',
    'connect.action': 'Continuer avec une clé d’accès',
    'connect.done': 'Connecté. Vous pouvez revenir à l’app.',
    'connect.invalid': 'Ce lien est incomplet. Recommencez depuis l’app.',

    'frame.sections': 'Sections',
    'frame.home': 'Accueil',
    'frame.launcherEyebrow': 'Obole',
    'frame.apps': 'Applications',
    'frame.account': 'Compte',
    'frame.accountSettings': 'Réglages du compte',
    'frame.signOut': 'Se déconnecter',

    'home.morning': 'Bonjour, {name}',
    'home.afternoon': 'Bonjour, {name}',
    'home.evening': 'Bonsoir, {name}',
    'home.welcome': 'Bienvenue',
    'home.open': 'Ouvrir {app}',

    'account.eyebrow': 'Obole',
    'account.title': 'Compte',
    'account.passkeys': 'Clés d’accès',
    'account.passkeysNote': 'Chacune de ces clés d’accès ouvre Obole à elle seule. La dernière ne peut pas être supprimée.',
    'account.addPasskey': 'Ajouter une clé d’accès',
    'account.passkeyAdded': 'Clé d’accès ajoutée.',
    'account.created': 'Créée le {date}',
    'account.lastUsed': 'Utilisée le {date}',
    'account.neverUsed': 'Jamais utilisée',
    'account.synced': 'Synchronisée',
    'account.passkey': 'Clé d’accès',
    'account.securityKey': 'Clé de sécurité',
    'account.googlePasswordManager': 'Gestionnaire de mots de passe de Google',
    'account.removePasskey': 'Supprimer {name}',
    'account.confirmRemove': 'Supprimer cette clé d’accès ?',
    'account.removeMessage': 'Elle n’ouvrira plus Obole. Supprimez-la aussi de vos mots de passe.',
    'account.removeAction': 'Supprimer',
    'account.general': 'Général',
    'account.language': 'Langue',
    'account.automatic': 'Automatique',
    'account.session': 'Session',
    'account.signOut': 'Se déconnecter',
    'account.confirmSignOut': 'Se déconnecter ?',
    'account.signOutMessage': 'Il vous faudra votre clé d’accès pour rouvrir Obole.',

    'error.generic': 'Une erreur est survenue.',
    'error.unreachable': 'Impossible de joindre le serveur.',
    'error.sessionExpired': 'Votre session a expiré.',
    'error.tooManyAttempts': 'Trop de tentatives. Réessayez dans un instant.',
    'error.unavailable': 'Le serveur est indisponible pour le moment.',
    'error.refused': 'Le serveur a refusé la requête.',
    'error.unexpected': 'Le serveur a envoyé une réponse inattendue.',
    'error.passkeyCancelled': 'La demande de clé d’accès a été annulée.',
    'error.passkeyUnsupported': 'Ce navigateur ne prend pas en charge les clés d’accès.',
    'error.passkeyRefused': 'Cette clé d’accès n’est pas reconnue.',
    'error.passkeyExists': 'Cette clé d’accès est déjà enregistrée.',
    'error.enrollmentToken': 'Jeton d’enrôlement incorrect, ou enrôlement fermé.',
    'error.lastPasskey': 'Impossible de supprimer votre dernière clé d’accès.'
};

/**
 * @constant fr
 * @description Every sentence the page shows, in French: the portal's, then each app's.
 */
export const fr: Messages = { ...portalFr, ...budgetFr, ...watchlistFr };
