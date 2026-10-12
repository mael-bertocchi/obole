import { t } from 'modules/language/language-service';

/**
 * @function messageOf
 * @description The message to show for any error
 *
 * @param {unknown} error The error
 * @returns {string} Its message
 */
export function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : t('error.generic');
}
