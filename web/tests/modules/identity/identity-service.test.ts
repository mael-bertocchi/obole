import type { AuthenticationResponseJSON } from 'modules/identity/identity-passkeys';
import identityService from 'modules/identity/identity-service';
import { chooseLanguage } from 'modules/language/language-service';
import { IDENTITY_SESSION_ENDED_EVENT } from 'utils/request';
import { getTokens, setTokens } from 'utils/token';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * @constant ANSWER
 * @description A passkey's signed answer, as the browser hands it over.
 */
const ANSWER: AuthenticationResponseJSON = {
    id: 'Y3JlZGVudGlhbA',
    rawId: 'Y3JlZGVudGlhbA',
    type: 'public-key',
    response: { clientDataJSON: 'e30', authenticatorData: 'YXV0aA', signature: 'c2ln' },
    clientExtensionResults: {}
};

/**
 * @constant TOKENS
 * @description A session's tokens, as the server hands them over.
 */
const TOKENS = { accessToken: 'access', refreshToken: 'refresh' };

afterEach(() => {
    vi.unstubAllGlobals();
});

/**
 * @function answers
 * @description Answers each request in turn, recording what was asked.
 */
function answers(...replies: [number, unknown][]): ReturnType<typeof vi.fn> {
    const fetch = vi.fn(() => {
        const [status, body] = replies.shift() ?? [500, null];

        return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    });

    vi.stubGlobal('fetch', fetch);

    return fetch;
}

describe('identityService', () => {
    it('signs in with the passkey’s answer and keeps the session in the tab', async () => {
        const fetch = answers([200, { data: TOKENS }]);

        await identityService.loginUser(ANSWER);

        expect(identityService.isSignedIn()).toBe(true);
        expect(getTokens()).toEqual(TOKENS);
        expect(fetch).toHaveBeenCalledWith('/v1/identity/login', expect.objectContaining({ method: 'POST', body: JSON.stringify({ response: ANSWER }) }));
    });

    it('says a passkey was not recognized, in the page’s language', async () => {
        answers([401, { message: 'Passkey not accepted', data: null }]);

        await expect(identityService.loginUser(ANSWER)).rejects.toMatchObject({ status: 401, message: "This passkey isn't recognized." });

        chooseLanguage('fr');
        answers([401, { message: 'Passkey not accepted', data: null }]);

        await expect(identityService.loginUser(ANSWER)).rejects.toMatchObject({ status: 401, message: 'Cette clé d’accès n’est pas reconnue.' });
    });

    it('says the enrollment token was refused', async () => {
        answers([403, { message: 'Enrollment is closed or the token is wrong', data: null }]);

        await expect(identityService.getEnrollmentOptions('token')).rejects.toMatchObject({ status: 403, message: 'Wrong enrollment token, or enrollment is closed.' });
    });

    it('hands the app its code without opening a session here', async () => {
        answers([200, { data: { code: 'one-time-code' } }]);

        await expect(identityService.connectApplication(ANSWER, 'challenge')).resolves.toBe('one-time-code');
        expect(identityService.isSignedIn()).toBe(false);
    });

    it('says the last passkey can’t be removed', async () => {
        setTokens(TOKENS);
        answers([409, { message: 'The last passkey can not be removed', data: null }]);

        await expect(identityService.removePasskey('id')).rejects.toMatchObject({ status: 409, message: "Your last passkey can't be removed." });
    });

    it('signs out without waiting on the server, and tells whoever listens', async () => {
        setTokens(TOKENS);
        answers([500, {}]);

        const ended = vi.fn();

        window.addEventListener(IDENTITY_SESSION_ENDED_EVENT, ended);
        await identityService.logoutUser();

        expect(ended).toHaveBeenCalledOnce();
        expect(getTokens()).toBeNull();

        window.removeEventListener(IDENTITY_SESSION_ENDED_EVENT, ended);
    });
});
