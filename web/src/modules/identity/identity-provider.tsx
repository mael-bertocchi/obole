import { IdentityContext } from 'modules/identity/identity-context';
import { useIdentity } from 'modules/identity/identity-hooks';
import type { IdentityContextProps, IdentityProviderProps } from 'modules/identity/identity-models';
import type { JSX } from 'react';

/**
 * @function IdentityProvider
 * @description A context provider sharing the portal's session with every page and app
 *
 * @param {IdentityProviderProps} props The properties for the identity provider component
 * @returns {JSX.Element} The identity provider component
 */
export function IdentityProvider(props: IdentityProviderProps): JSX.Element {
    const identity: IdentityContextProps = useIdentity();

    return (
        <IdentityContext.Provider value={identity}>
            {props.children}
        </IdentityContext.Provider>
    );
}
