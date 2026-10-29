import { t } from 'modules/language/language-service';

/**
 * @class UserError
 * @description An error whose message is written for the person using the page, in its language. Every failure the
 * page shows goes through one: anything else is a bug, whose message is never shown.
 *
 * @extends Error
 */
export class UserError extends Error {
    /**
     * @constructor
     * @description Wraps a failure worded for the person
     *
     * @param {string} message The message to show
     */
    constructor(message: string) {
        super(message);

        this.name = 'UserError';
    }
}

/**
 * @function messageOf
 * @description The message to show for any error: its own when it was written for the person, a generic one otherwise
 *
 * @param {unknown} error The error
 * @returns {string} The message to show
 */
export function messageOf(error: unknown): string {
    return error instanceof UserError ? error.message : t('error.generic');
}
