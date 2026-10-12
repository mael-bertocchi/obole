import type { ReactNode } from 'react';

/**
 * @type Language
 * @description A language the page speaks
 */
export type Language = 'en' | 'fr';

/**
 * @type LanguageChoice
 * @description What the language picker holds: a language, or automatic to follow the browser's
 */
export type LanguageChoice = Language | 'automatic';

/**
 * @interface LanguageProviderProps
 * @description Language provider properties
 */
export interface LanguageProviderProps {
    children: ReactNode; /*!< The pages, drawn again in a newly picked language */
}
