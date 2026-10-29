import type { AppAvailability, AvailabilitySource, PortalApp } from 'modules/apps/apps-models';
import { useSyncExternalStore } from 'react';

/**
 * @constant ALWAYS_AVAILABLE
 * @description The availability of an app that doesn't say: it can always be opened.
 */
const ALWAYS_AVAILABLE: AppAvailability = { isAvailable: true, reason: null };

/**
 * @constant ALWAYS
 * @description The source of an app that is always available.
 */
const ALWAYS: AvailabilitySource = {
    subscribe: () => () => undefined,
    getSnapshot: () => ALWAYS_AVAILABLE
};

/**
 * @function useAppAvailability
 * @description Whether an app can be used right now, following its changes.
 *
 * @param {PortalApp} app The app
 * @returns {AppAvailability} Its availability
 */
export function useAppAvailability(app: PortalApp): AppAvailability {
    const source = app.availability ?? ALWAYS;

    return useSyncExternalStore(source.subscribe, source.getSnapshot);
}
