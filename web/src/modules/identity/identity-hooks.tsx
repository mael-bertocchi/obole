import type { Maybe } from 'models';
import { IdentityContext } from 'modules/identity/identity-context';
import type { Account, IdentityContextProps, IdentityStatus } from 'modules/identity/identity-models';
import { createPasskey, signWithPasskey } from 'modules/identity/identity-passkeys';
import identityService from 'modules/identity/identity-service';
import { useCallback, useContext, useEffect, useState } from 'react';
import { IDENTITY_SESSION_ENDED_EVENT } from 'utils/request';

/**
 * @function useIdentity
 * @description Holds the portal's session: signed in or not, who the owner is once the server said, and the ways in
 * (a passkey, or the enrollment token for the first one) and out
 *
 * @returns {IdentityContextProps} The session and the functions managing it
 */
export function useIdentity(): IdentityContextProps {
    const [status, setStatus] = useState<IdentityStatus>(() => (identityService.isSignedIn() ? 'signedIn' : 'signedOut'));
    const [account, setAccount] = useState<Maybe<Account>>(null);

    useEffect(() => {
        /**
         * @function handleSessionEnded
         * @description Returns to the passkey screen once the session is over
         */
        const handleSessionEnded = (): void => {
            setAccount(null);
            setStatus('signedOut');
        };

        window.addEventListener(IDENTITY_SESSION_ENDED_EVENT, handleSessionEnded);

        return () => {
            window.removeEventListener(IDENTITY_SESSION_ENDED_EVENT, handleSessionEnded);
        };
    }, []);

    useEffect(() => {
        if (status !== 'signedIn') {
            return;
        }

        let isCurrent = true;

        identityService.getAccount().then((found: Account) => {
            if (isCurrent) {
                setAccount(found);
            }
        }).catch(() => undefined);

        return () => {
            isCurrent = false;
        };
    }, [status]);

    /**
     * @function signIn
     * @description Opens the portal with one of the owner's passkeys
     *
     * @returns {Promise<void>} Resolves once signed in
     */
    const signIn = useCallback(async (): Promise<void> => {
        const answer = await signWithPasskey(await identityService.getLoginOptions());

        await identityService.loginUser(answer);
        setStatus('signedIn');
    }, []);

    /**
     * @function enroll
     * @description Creates a passkey with the enrollment token, then opens the portal with it
     *
     * @param {string} token The enrollment token
     * @returns {Promise<void>} Resolves once signed in
     */
    const enroll = useCallback(async (token: string): Promise<void> => {
        const passkey = await createPasskey(await identityService.getEnrollmentOptions(token));

        await identityService.enrollUser(token, passkey);
        setStatus('signedIn');
    }, []);

    /**
     * @function signOut
     * @description Closes the session
     *
     * @returns {Promise<void>} Resolves once the server was told, or couldn't be
     */
    const signOut = useCallback(async (): Promise<void> => {
        await identityService.logoutUser();
    }, []);

    return { status, account, signIn, enroll, signOut };
}

/**
 * @function useIdentityContext
 * @description A custom hook to access the identity context
 *
 * @returns {IdentityContextProps} The portal's session and the functions managing it
 */
export function useIdentityContext(): IdentityContextProps {
    const context: Maybe<IdentityContextProps> = useContext(IdentityContext);

    if (!context) {
        throw new Error('The identity context must be used within the identity provider');
    }
    return context;
}
