import LoadFailedComponent from 'components/load-failed/load-failed';
import LoadingScreenComponent from 'components/loading-screen/loading-screen';
import ProtectedRouteComponent from 'components/protected-route';
import { APPS } from 'modules/apps/apps-registry';
import { IdentityProvider } from 'modules/identity/identity-provider';
import { LanguageProvider } from 'modules/language/language-provider';
import { ToastProvider } from 'modules/toast/toast-provider';
import AccountPage from 'pages/portal/account/account';
import AuthorizePage from 'pages/portal/authorize/authorize';
import ConnectPage from 'pages/portal/connect/connect';
import HomePage from 'pages/portal/home/home';
import LoginPage from 'pages/portal/login/login';
import { Fragment, lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom';
import 'styles/index.css';

/**
 * @constant APP_ROUTES
 * @description One route per app, under its own path. Each app's code is only loaded once it is opened, and the app
 * routes everything under its path itself. Each app has its own loading boundary: sharing one, going from an app to
 * another would keep showing the first while the second loads, since the router navigates in a transition.
 */
const APP_ROUTES: RouteObject[] = APPS.map((app) => {
    const App = lazy(app.load);

    return {
        path: `${app.id}/*`,
        element: (
            <Suspense key={app.id} fallback={<LoadingScreenComponent />}>
                <App />
            </Suspense>
        )
    };
});

/**
 * @constant router
 * @description Defines the portal's routing structure: the sign-in page, the page the iOS app signs in through and the
 * page MCP clients are authorized on, then, behind the passkey, the home page, the account settings and every app
 */
const router = createBrowserRouter([
    {
        path: 'login',
        element: <LoginPage />
    },
    {
        path: 'connect',
        element: <ConnectPage />
    },
    {
        path: 'authorize',
        element: <AuthorizePage />
    },
    {
        path: '/',
        element: (
            <ProtectedRouteComponent>
                <Fragment>
                    <ScrollRestoration />
                    <Outlet />
                </Fragment>
            </ProtectedRouteComponent>
        ),
        errorElement: <LoadFailedComponent />,
        children: [
            {
                index: true,
                element: <HomePage />
            },
            {
                path: 'account',
                element: <AccountPage />
            },
            ...APP_ROUTES,
            {
                path: '*',
                element: <Navigate to='/' replace />
            }
        ]
    }
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ToastProvider>
            <IdentityProvider>
                <LanguageProvider>
                    <RouterProvider router={router} />
                </LanguageProvider>
            </IdentityProvider>
        </ToastProvider>
    </StrictMode>
);
