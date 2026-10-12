import type { Account, Passkey } from 'modules/identity/identity-models';
import { AccountSchema, ConnectionSchema, CreationOptionsSchema, EnrollmentSchema, IdentityTokensSchema, PasskeySchema, RequestOptionsSchema } from 'modules/identity/identity-models';
import type { AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from 'modules/identity/identity-passkeys';
import { t } from 'modules/language/language-service';
import { endSession, fetchPublic, fetchWithAuthentication, rewording } from 'utils/request';
import { getTokens, setTokens } from 'utils/token';
import { z } from 'zod';

/**
 * @function isSignedIn
 * @description Whether a session is open in this tab
 *
 * @returns {boolean} Whether the tab holds a session's tokens
 */
function isSignedIn(): boolean {
    return getTokens() !== null;
}

/**
 * @function getLoginOptions
 * @description Fetches a challenge for one of the owner's passkeys to sign
 *
 * @returns {Promise<PublicKeyCredentialRequestOptionsJSON>} The options to hand the browser
 */
async function getLoginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    return await fetchPublic('/v1/identity/login/options', { method: 'POST', body: '{}' }, RequestOptionsSchema);
}

/**
 * @function loginUser
 * @description Opens a session with a passkey's signed answer
 *
 * @param {AuthenticationResponseJSON} answer The signed answer
 * @returns {Promise<void>} Resolves once signed in; rejects with the server's reason otherwise
 */
async function loginUser(answer: AuthenticationResponseJSON): Promise<void> {
    setTokens(await fetchPublic('/v1/identity/login', { method: 'POST', body: JSON.stringify({ response: answer }) }, IdentityTokensSchema).catch(rewording(401, t('error.passkeyRefused'))));
}

/**
 * @function connectApplication
 * @description Trades a passkey's signed answer for a one-time code the iOS app can redeem, bound to the app's PKCE
 * challenge. It opens no session on this page.
 *
 * @param {AuthenticationResponseJSON} answer The signed answer
 * @param {string} challenge The app's PKCE challenge
 * @returns {Promise<string>} The code
 */
async function connectApplication(answer: AuthenticationResponseJSON, challenge: string): Promise<string> {
    const { code } = await fetchPublic('/v1/identity/connect', { method: 'POST', body: JSON.stringify({ response: answer, challenge }) }, ConnectionSchema).catch(rewording(401, t('error.passkeyRefused')));

    return code;
}

/**
 * @function isEnrollmentOpen
 * @description Whether a passkey can be created with an enrollment token right now
 *
 * @returns {Promise<boolean>} Whether the server has an enrollment token set
 */
async function isEnrollmentOpen(): Promise<boolean> {
    return (await fetchPublic('/v1/identity/enrollment', { method: 'GET' }, EnrollmentSchema)).open;
}

/**
 * @function getEnrollmentOptions
 * @description Fetches a challenge to create a passkey with the enrollment token
 *
 * @param {string} token The enrollment token
 * @returns {Promise<PublicKeyCredentialCreationOptionsJSON>} The options to hand the browser
 */
async function getEnrollmentOptions(token: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return await fetchPublic('/v1/identity/enrollment/options', { method: 'POST', body: JSON.stringify({ token }) }, CreationOptionsSchema).catch(rewording(403, t('error.enrollmentToken')));
}

/**
 * @function enrollUser
 * @description Stores the passkey created with the enrollment token and opens a session with it
 *
 * @param {string} token The enrollment token
 * @param {RegistrationResponseJSON} passkey The new passkey
 * @returns {Promise<void>} Resolves once signed in
 */
async function enrollUser(token: string, passkey: RegistrationResponseJSON): Promise<void> {
    setTokens(await fetchPublic('/v1/identity/enrollment', { method: 'POST', body: JSON.stringify({ token, response: passkey }) }, IdentityTokensSchema).catch(rewording(403, t('error.enrollmentToken'))).catch(rewording(409, t('error.passkeyExists'))));
}

/**
 * @function getAccount
 * @description Fetches the signed-in account, with the owner's name
 *
 * @returns {Promise<Account>} The account
 */
async function getAccount(): Promise<Account> {
    return await fetchWithAuthentication('/v1/identity/me', { method: 'GET' }, AccountSchema);
}

/**
 * @function getPasskeys
 * @description Fetches the owner's passkeys, oldest first
 *
 * @returns {Promise<Passkey[]>} The passkeys
 */
async function getPasskeys(): Promise<Passkey[]> {
    return await fetchWithAuthentication('/v1/identity/passkeys', { method: 'GET' }, z.array(PasskeySchema));
}

/**
 * @function getPasskeyOptions
 * @description Fetches a challenge to create another passkey
 *
 * @returns {Promise<PublicKeyCredentialCreationOptionsJSON>} The options to hand the browser
 */
async function getPasskeyOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return await fetchWithAuthentication('/v1/identity/passkeys/options', { method: 'POST', body: '{}' }, CreationOptionsSchema);
}

/**
 * @function addPasskey
 * @description Stores another passkey
 *
 * @param {RegistrationResponseJSON} passkey The new passkey
 * @returns {Promise<Passkey>} The stored passkey
 */
async function addPasskey(passkey: RegistrationResponseJSON): Promise<Passkey> {
    return await fetchWithAuthentication('/v1/identity/passkeys', { method: 'POST', body: JSON.stringify({ response: passkey }) }, PasskeySchema).catch(rewording(409, t('error.passkeyExists')));
}

/**
 * @function removePasskey
 * @description Forgets one of the owner's passkeys. The server keeps the last one.
 *
 * @param {string} id The passkey's identifier
 * @returns {Promise<void>} Resolves once it is forgotten
 */
async function removePasskey(id: string): Promise<void> {
    await fetchWithAuthentication(`/v1/identity/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' }, z.unknown()).catch(rewording(409, t('error.lastPasskey')));
}

/**
 * @function logoutUser
 * @description Closes the session on the server, then forgets it and tells the listeners. Forgetting it never waits on
 * the server.
 *
 * @returns {Promise<void>} Resolves once the server was told, or couldn't be
 */
async function logoutUser(): Promise<void> {
    const tokens = getTokens();

    endSession();

    if (tokens !== null) {
        await fetchPublic('/v1/identity/logout', { method: 'POST', body: JSON.stringify({ refreshToken: tokens.refreshToken }) }, z.unknown(), tokens.accessToken).catch(() => undefined);
    }
}

export default {
    isSignedIn,
    getLoginOptions,
    loginUser,
    connectApplication,
    isEnrollmentOpen,
    getEnrollmentOptions,
    enrollUser,
    getAccount,
    getPasskeys,
    getPasskeyOptions,
    addPasskey,
    removePasskey,
    logoutUser
};
