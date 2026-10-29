import { ConnectSchema, ConnectTokenSchema, EnrollmentSchema, LoginSchema, LogoutSchema, PasskeyUpdateSchema, RefreshSchema } from 'src/modules/identity/identity-models';
import { pkceChallenge } from 'src/modules/identity/identity-service';
import { describe, expect, it } from 'vitest';

/**
 * @constant ASSERTION
 * @description A passkey's signed answer, as the browser hands it over
 */
const ASSERTION = {
    id: 'Y3JlZGVudGlhbA',
    rawId: 'Y3JlZGVudGlhbA',
    type: 'public-key',
    response: { clientDataJSON: 'e30', authenticatorData: 'YXV0aA', signature: 'c2ln' },
    clientExtensionResults: {}
};

describe('LoginSchema', () => {
    it('accepts a passkey’s signed answer', () => {
        expect(LoginSchema.safeParse({ response: ASSERTION }).success).toBe(true);
    });

    it('rejects the code the portal used to be opened with', () => {
        expect(LoginSchema.safeParse({ code: '048213' }).success).toBe(false);
    });

    it('rejects an answer that isn’t base64url', () => {
        expect(LoginSchema.safeParse({ response: { ...ASSERTION, id: 'not base64url!' } }).success).toBe(false);
    });
});

describe('ConnectSchema', () => {
    it('accepts an answer with a 43-character PKCE challenge', () => {
        expect(ConnectSchema.safeParse({ response: ASSERTION, challenge: pkceChallenge('verifier') }).success).toBe(true);
    });

    it('rejects a missing or malformed challenge', () => {
        expect(ConnectSchema.safeParse({ response: ASSERTION }).success).toBe(false);
        expect(ConnectSchema.safeParse({ response: ASSERTION, challenge: 'short' }).success).toBe(false);
    });
});

describe('ConnectTokenSchema', () => {
    it('accepts a code with a verifier of 43 to 128 unreserved characters', () => {
        expect(ConnectTokenSchema.safeParse({ code: pkceChallenge('a'), verifier: 'v'.repeat(43) }).success).toBe(true);
        expect(ConnectTokenSchema.safeParse({ code: pkceChallenge('a'), verifier: 'v'.repeat(42) }).success).toBe(false);
        expect(ConnectTokenSchema.safeParse({ code: pkceChallenge('a'), verifier: 'v'.repeat(129) }).success).toBe(false);
    });
});

describe('EnrollmentSchema', () => {
    it('needs the token next to the new passkey', () => {
        const passkey = { ...ASSERTION, response: { clientDataJSON: 'e30', attestationObject: 'b2Jq' } };

        expect(EnrollmentSchema.safeParse({ token: 'token', response: passkey }).success).toBe(true);
        expect(EnrollmentSchema.safeParse({ response: passkey }).success).toBe(false);
    });
});

describe('PasskeyUpdateSchema', () => {
    it('trims the name, and reads nothing but spaces as no name', () => {
        expect(PasskeyUpdateSchema.parse({ name: '  iPhone  ' })).toEqual({ name: 'iPhone' });
        expect(PasskeyUpdateSchema.parse({ name: '   ' })).toEqual({ name: null });
        expect(PasskeyUpdateSchema.parse({ name: null })).toEqual({ name: null });
    });

    it('rejects a name longer than 64 characters, or none given', () => {
        expect(PasskeyUpdateSchema.safeParse({ name: 'x'.repeat(65) }).success).toBe(false);
        expect(PasskeyUpdateSchema.safeParse({}).success).toBe(false);
    });
});

describe('RefreshSchema', () => {
    it('accepts a non-empty refresh token', () => {
        expect(RefreshSchema.safeParse({ refreshToken: 'abc.def.ghi' }).success).toBe(true);
    });

    it('rejects an empty refresh token', () => {
        expect(RefreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    });
});

describe('LogoutSchema', () => {
    it('accepts a non-empty refresh token', () => {
        expect(LogoutSchema.safeParse({ refreshToken: 'abc.def.ghi' }).success).toBe(true);
    });

    it('rejects an empty refresh token', () => {
        expect(LogoutSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    });
});

describe('pkceChallenge', () => {
    it('is the base64url SHA-256 of the verifier (RFC 7636, appendix B)', () => {
        expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    });
});
