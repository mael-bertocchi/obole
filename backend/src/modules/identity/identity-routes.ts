import type { FastifyInstance } from 'fastify';
import identityController from 'src/modules/identity/identity-controller';
import type { ConnectRequest, ConnectTokenRequest, EnrollmentOptionsRequest, EnrollmentRequest, LoginRequest, LogoutRequest, PasskeyDeleteRequest, PasskeyRequest, PasskeyUpdateRequest, RefreshRequest } from 'src/modules/identity/identity-models';
import { ConnectSchema, ConnectTokenSchema, EnrollmentOptionsSchema, EnrollmentSchema, LoginSchema, LogoutSchema, PasskeyParamsSchema, PasskeySchema, PasskeyUpdateSchema, RefreshSchema } from 'src/modules/identity/identity-models';

/**
 * @constant SIGN_IN_LIMIT
 * @description How often an address may try a passkey or the enrollment token, per minute.
 */
const SIGN_IN_LIMIT = { rateLimit: { max: 10, timeWindow: '1 minute' } };

/**
 * @function identityRoutes
 * @description Defines the identity routes: signing in with a passkey (in the portal, or for the app through it), creating
 * the first passkey with the enrollment token, managing the passkeys, and the session itself.
 */
export default function (fastify: FastifyInstance): void {
    fastify.post('/login/options', {
        config: SIGN_IN_LIMIT
    }, identityController.loginOptions);

    fastify.post<LoginRequest>('/login', {
        config: SIGN_IN_LIMIT,
        schema: {
            body: LoginSchema
        }
    }, identityController.login);

    fastify.post<ConnectRequest>('/connect', {
        config: SIGN_IN_LIMIT,
        schema: {
            body: ConnectSchema
        }
    }, identityController.connect);

    fastify.post<ConnectTokenRequest>('/connect/token', {
        config: SIGN_IN_LIMIT,
        schema: {
            body: ConnectTokenSchema
        }
    }, identityController.connectToken);

    fastify.get('/enrollment', identityController.enrollment);

    fastify.post<EnrollmentOptionsRequest>('/enrollment/options', {
        config: SIGN_IN_LIMIT,
        schema: {
            body: EnrollmentOptionsSchema
        }
    }, identityController.enrollmentOptions);

    fastify.post<EnrollmentRequest>('/enrollment', {
        config: SIGN_IN_LIMIT,
        schema: {
            body: EnrollmentSchema
        }
    }, identityController.enroll);

    fastify.get('/passkeys', {
        preHandler: [fastify.identity.authenticate]
    }, identityController.passkeys);

    fastify.post('/passkeys/options', {
        preHandler: [fastify.identity.authenticate]
    }, identityController.newPasskeyOptions);

    fastify.post<PasskeyRequest>('/passkeys', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            body: PasskeySchema
        }
    }, identityController.newPasskey);

    fastify.patch<PasskeyUpdateRequest>('/passkeys/:id', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: PasskeyParamsSchema,
            body: PasskeyUpdateSchema
        }
    }, identityController.updatePasskey);

    fastify.delete<PasskeyDeleteRequest>('/passkeys/:id', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            params: PasskeyParamsSchema
        }
    }, identityController.deletePasskey);

    fastify.post<RefreshRequest>('/refresh', {
        schema: {
            body: RefreshSchema
        }
    }, identityController.refresh);

    fastify.post<LogoutRequest>('/logout', {
        preHandler: [fastify.identity.authenticate],
        schema: {
            body: LogoutSchema
        }
    }, identityController.logout);

    fastify.get('/me', {
        preHandler: [fastify.identity.authenticate]
    }, identityController.me);
}
