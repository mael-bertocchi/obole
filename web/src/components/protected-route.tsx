import { useIdentityContext } from 'modules/identity/identity-hooks';
import type { IdentityContextProps } from 'modules/identity/identity-models';
import type { JSX } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * @interface ProtectedRouteComponentProps
 * @description Defines the properties for the protected route component
 */
interface ProtectedRouteComponentProps {
    children: JSX.Element; /*!< The pages to show once signed in */
}

/**
 * @function ProtectedRouteComponent
 * @description Keeps the portal behind the passkey: signed out, it sends to the sign-in page, which brings back to the
 * page asked for once signed in
 *
 * @param {ProtectedRouteComponentProps} props The properties for the protected route component
 * @returns {JSX.Element} The pages, or a redirection to the sign-in page
 */
function ProtectedRouteComponent(props: ProtectedRouteComponentProps): JSX.Element {
    const { status }: IdentityContextProps = useIdentityContext();
    const location = useLocation();

    if (status === 'signedOut') {
        return (
            <Navigate to='/login' state={{ from: `${location.pathname}${location.search}` }} replace />
        );
    }

    return props.children;
}

export default ProtectedRouteComponent;
