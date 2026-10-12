import type { PortalApp } from 'modules/apps/apps-models';
import { budget } from 'modules/budget/budget-manifest';

/**
 * @constant APPS
 * @description Every app the portal hosts, in the order the home page and the launcher show them. Adding an app is
 * adding its module and pages, its manifest here and its sentences to the language module.
 */
export const APPS: readonly PortalApp[] = [budget];

/**
 * @function appPath
 * @description Where an app lives
 *
 * @param {PortalApp} app The app
 * @returns {string} Its path
 */
export function appPath(app: PortalApp): string {
    return `/${app.id}`;
}
