import { useLanguage } from 'modules/language/language-hooks';
import type { LanguageProviderProps } from 'modules/language/language-models';
import { Fragment, type JSX } from 'react';

/**
 * @function LanguageProvider
 * @description Draws the pages afresh in a newly picked language: every sentence on them is looked up while rendering,
 * so redrawing them is all a new language takes. The session and the apps' data sit above or outside and are kept.
 *
 * @param {LanguageProviderProps} props The provider props
 * @returns {JSX.Element} The language provider component
 */
export function LanguageProvider(props: LanguageProviderProps): JSX.Element {
    const language = useLanguage();

    return <Fragment key={language}>{props.children}</Fragment>;
}
