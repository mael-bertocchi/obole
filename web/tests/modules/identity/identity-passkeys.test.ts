import type { Maybe } from 'models';
import type { Passkey } from 'modules/identity/identity-models';
import { authenticatorName, passkeyName } from 'modules/identity/identity-passkeys';
import { chooseLanguage } from 'modules/language/language-service';
import { describe, expect, it } from 'vitest';

/**
 * @function passkey
 * @description A passkey from a given authenticator.
 */
function passkey(aaguid: string, backedUp = true, name: Maybe<string> = null): Passkey {
    return { id: 'id', aaguid, name, backedUp, createdAt: new Date(), lastUsedAt: null };
}

describe('passkeyName', () => {
    it('names the password managers that say who they are, in the page’s language', () => {
        expect(passkeyName(passkey('BADA5566-A7AA-401F-BD96-45619A55120D'))).toBe('1Password');
        expect(passkeyName(passkey('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4'))).toBe('Google Password Manager');

        chooseLanguage('fr');

        expect(passkeyName(passkey('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4'))).toBe('Gestionnaire de mots de passe de Google');
    });

    it('falls back on what the passkey is', () => {
        expect(passkeyName(passkey('00000000-0000-0000-0000-000000000000'))).toBe('Passkey');
        expect(passkeyName(passkey('00000000-0000-0000-0000-000000000000', false))).toBe('Security key');
    });

    it('prefers the name the owner gave it, keeping its authenticator’s aside', () => {
        const named = passkey('bada5566-a7aa-401f-bd96-45619a55120d', true, 'Work laptop');

        expect(passkeyName(named)).toBe('Work laptop');
        expect(authenticatorName(named)).toBe('1Password');
    });
});
