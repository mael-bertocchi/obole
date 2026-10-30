import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import type { Maybe, Perhaps } from 'models';
import type { ReactNode } from 'react';
import { z } from 'zod';

/**
 * @constant IdentityTokensSchema
 * @description Zod schema for an access/refresh token pair.
 */
export const IdentityTokensSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string()
});

/**
 * @constant AccountSchema
 * @description Zod schema for the signed-in account: its id and the owner's name.
 */
export const AccountSchema = z.object({
    id: z.string(),
    name: z.string()
});

/**
 * @constant PasskeySchema
 * @description Zod schema for one of the owner's passkeys, as the server lists it.
 */
export const PasskeySchema = z.object({
    id: z.string(),
    aaguid: z.string(),
    name: z.string().nullable(),
    backedUp: z.boolean(),
    createdAt: z.coerce.date(),
    lastUsedAt: z.coerce.date().nullable()
});

/**
 * @constant EnrollmentSchema
 * @description Zod schema for whether a passkey can be created with an enrollment token right now.
 */
export const EnrollmentSchema = z.object({
    open: z.boolean()
});

/**
 * @constant ConnectionSchema
 * @description Zod schema for the one-time code the connect page hands back to the app.
 */
export const ConnectionSchema = z.object({
    code: z.string()
});

/**
 * @constant OAuthClientSchema
 * @description Zod schema for who an MCP client asking to be authorized is: its name, and the host it waits on.
 */
export const OAuthClientSchema = z.object({
    name: z.string(),
    redirectHost: z.string()
});

/**
 * @constant AuthorizationSchema
 * @description Zod schema for where the authorization page sends the client back, with its code.
 */
export const AuthorizationSchema = z.object({
    redirectUrl: z.string()
});

/**
 * @function isRecord
 * @description Whether a value is a plain object, whose properties can be looked into
 *
 * @param {unknown} value The value
 * @returns {boolean} Whether it is one
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @function isRequestOptions
 * @description Whether the server handed out options to sign in with a passkey: a challenge to sign, the rest read by
 * the browser
 *
 * @param {unknown} value The server's answer
 * @returns {boolean} Whether it is such options
 */
function isRequestOptions(value: unknown): value is PublicKeyCredentialRequestOptionsJSON {
    return isRecord(value) && typeof value.challenge === 'string';
}

/**
 * @function isCreationOptions
 * @description Whether the server handed out options to create a passkey: a challenge, the site it is for and the owner
 * it is filed under, the rest read by the browser
 *
 * @param {unknown} value The server's answer
 * @returns {boolean} Whether it is such options
 */
function isCreationOptions(value: unknown): value is PublicKeyCredentialCreationOptionsJSON {
    return isRecord(value) && typeof value.challenge === 'string' && isRecord(value.rp) && typeof value.rp.name === 'string' && isRecord(value.user) && typeof value.user.id === 'string' && Array.isArray(value.pubKeyCredParams);
}

/**
 * @constant RequestOptionsSchema
 * @description Zod schema for the options the server hands out to sign in with a passkey
 */
export const RequestOptionsSchema = z.custom<PublicKeyCredentialRequestOptionsJSON>(isRequestOptions);

/**
 * @constant CreationOptionsSchema
 * @description Zod schema for the options the server hands out to create a passkey
 */
export const CreationOptionsSchema = z.custom<PublicKeyCredentialCreationOptionsJSON>(isCreationOptions);

/**
 * @type IdentityTokens
 * @description An access/refresh token pair
 */
export type IdentityTokens = z.infer<typeof IdentityTokensSchema>;

/**
 * @type Account
 * @description The signed-in account
 */
export type Account = z.infer<typeof AccountSchema>;

/**
 * @type Passkey
 * @description One of the owner's passkeys, as the server lists it
 */
export type Passkey = z.infer<typeof PasskeySchema>;

/**
 * @type OAuthClient
 * @description Who an MCP client asking to be authorized is.
 */
export type OAuthClient = z.infer<typeof OAuthClientSchema>;

/**
 * @interface ClientAuthorization
 * @description What the owner authorizes: the MCP client, where it waits, its PKCE challenge and its state to hand back.
 */
export interface ClientAuthorization {
    clientId: string; /*!< The client's id */
    redirectUri: string; /*!< Where it waits */
    codeChallenge: string; /*!< Its PKCE challenge */
    state: Perhaps<string>; /*!< What it asked to be handed back, if anything */
}

/**
 * @type IdentityStatus
 * @description Whether the page is signed in
 */
export type IdentityStatus = 'signedIn' | 'signedOut';

/**
 * @interface IdentityState
 * @description Where the portal's session stands
 */
export interface IdentityState {
    status: IdentityStatus; /*!< Whether the page is signed in */
    account: Maybe<Account>; /*!< Who is signed in, once the server said */
}

/**
 * @interface IdentityContextProps
 * @description The portal's session, which every app shares
 */
export interface IdentityContextProps extends IdentityState {
    signIn: () => Promise<void>; /*!< Opens the portal with one of the owner's passkeys */
    enroll: (token: string) => Promise<void>; /*!< Creates a passkey with the enrollment token, then opens the portal with it */
    signOut: () => Promise<void>; /*!< Closes the session */
}

/**
 * @interface IdentityProviderProps
 * @description Defines the properties for the identity provider component
 */
export interface IdentityProviderProps {
    children: ReactNode; /*!< Child components */
}
