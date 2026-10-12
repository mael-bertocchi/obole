import type { LucideIcon } from 'lucide-react';
import type { MessageKey } from 'modules/language/language-en';
import type { ComponentType } from 'react';

/**
 * @type AppModule
 * @description What loading a piece of an app hands back: a module whose default export is a component.
 */
export type AppModule = Promise<{ default: ComponentType }>;

/**
 * @interface PortalApp
 * @description An app the portal hosts, as its manifest describes it. The manifest is light: the portal reads it
 * up front to list the app, and only loads the app itself (and its tile on the home page) when they are shown.
 */
export interface PortalApp {
    id: string; /*!< Its identifier, which is also its path: the app lives under `/<id>` */
    name: MessageKey; /*!< Its name */
    summary: MessageKey; /*!< What it is for, in a few words */
    icon: LucideIcon; /*!< The glyph on its icon */
    colors: readonly [string, string]; /*!< Its icon's gradient, from the top to the bottom */
    load: () => AppModule; /*!< The app itself, mounted under `/<id>/*` with its own routes */
    loadWidget?: () => AppModule; /*!< Its tile's content on the home page, a glance at the app */
}
