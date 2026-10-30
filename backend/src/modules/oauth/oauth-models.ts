import type { RequestGenericInterface } from 'fastify';
import { AuthenticationResponseSchema } from 'src/modules/identity/identity-models';
import { z } from 'zod';

/**
 * @constant PkceChallengeSchema
 * @description Zod schema for a PKCE challenge: the base64url SHA-256 of a secret only the client knows.
 */
const PkceChallengeSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/**
 * @constant ClientIdSchema
 * @description Zod schema for a client id, as the server hands them out.
 */
const ClientIdSchema = z.string().min(1).max(4000);

/**
 * @constant RedirectUriSchema
 * @description Zod schema for an address a client is sent back to.
 */
const RedirectUriSchema = z.string().min(1).max(2000);

/**
 * @constant RegistrationSchema
 * @description Zod schema for a client registering itself (RFC 7591). Only its addresses and its name are kept; the rest
 * of what it says is left aside.
 */
export const RegistrationSchema = z.looseObject({
    redirect_uris: z.array(RedirectUriSchema).min(1).max(10),
    client_name: z.string().trim().max(100).optional()
});

/**
 * @constant ClientQuerySchema
 * @description Zod schema for the portal asking who a client is, before the owner authorizes it.
 */
export const ClientQuerySchema = z.object({
    clientId: ClientIdSchema,
    redirectUri: RedirectUriSchema
});

/**
 * @constant AuthorizationSchema
 * @description Zod schema for the owner authorizing a client on the portal: the passkey's signed answer, the client, where
 * it waits, its PKCE challenge, and its state to hand back.
 */
export const AuthorizationSchema = z.object({
    response: AuthenticationResponseSchema,
    clientId: ClientIdSchema,
    redirectUri: RedirectUriSchema,
    codeChallenge: PkceChallengeSchema,
    state: z.string().max(1000).optional()
});

/**
 * @constant TokenSchema
 * @description Zod schema for a client asking for tokens: trading its code with its PKCE verifier, or its refresh token.
 */
export const TokenSchema = z.discriminatedUnion('grant_type', [
    z.object({
        grant_type: z.literal('authorization_code'),
        code: z.string().min(1).max(200),
        code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
        client_id: ClientIdSchema,
        redirect_uri: RedirectUriSchema
    }),
    z.object({
        grant_type: z.literal('refresh_token'),
        refresh_token: z.string().min(1).max(4000)
    })
]);

/**
 * @constant ConnectionParamsSchema
 * @description Zod schema for the path naming one client's connection.
 */
export const ConnectionParamsSchema = z.object({
    id: z.uuid()
});

/**
 * @type Registration
 * @description What a client says when it registers.
 */
export type Registration = z.infer<typeof RegistrationSchema>;

/**
 * @type Authorization
 * @description The owner's authorization of a client.
 */
export type Authorization = z.infer<typeof AuthorizationSchema>;

/**
 * @interface OAuthClient
 * @description A client, as its id carries it.
 */
export interface OAuthClient {
    redirectUris: string[]; /*!< Where it may be sent back */
    name: string; /*!< Its name, shown to the owner */
    issuedAt: number; /*!< When it registered, in seconds */
}

/**
 * @interface ConnectionSummary
 * @description A client the owner authorized, as the settings list it.
 */
export interface ConnectionSummary {
    id: string; /*!< The connection's id */
    name: string; /*!< The client's name, as it registered */
    connectedAt: Date; /*!< When the owner authorized it */
    lastUsedAt: Date; /*!< When it last renewed its access or called a tool */
}

/**
 * @interface RegistrationRequest
 * @description Fastify request generic for a client registering itself.
 *
 * @extends RequestGenericInterface
 */
export interface RegistrationRequest extends RequestGenericInterface {
    Body: Registration; /*!< What it says */
}

/**
 * @interface ClientRequest
 * @description Fastify request generic for the portal asking who a client is.
 *
 * @extends RequestGenericInterface
 */
export interface ClientRequest extends RequestGenericInterface {
    Querystring: z.infer<typeof ClientQuerySchema>; /*!< The client and where it waits */
}

/**
 * @interface AuthorizationRequest
 * @description Fastify request generic for the owner authorizing a client.
 *
 * @extends RequestGenericInterface
 */
export interface AuthorizationRequest extends RequestGenericInterface {
    Body: Authorization; /*!< The authorization */
}

/**
 * @interface ConnectionDeleteRequest
 * @description Fastify request generic for the owner revoking a client's connection.
 *
 * @extends RequestGenericInterface
 */
export interface ConnectionDeleteRequest extends RequestGenericInterface {
    Params: z.infer<typeof ConnectionParamsSchema>; /*!< The connection */
}
