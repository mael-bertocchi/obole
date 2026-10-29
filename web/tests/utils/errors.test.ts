import { chooseLanguage } from 'modules/language/language-service';
import { messageOf, UserError } from 'utils/errors';
import { RequestError } from 'utils/request';
import { describe, expect, it } from 'vitest';

describe('messageOf', () => {
    it('shows the message of an error written for the person', () => {
        expect(messageOf(new UserError('This operation was deleted on another device.'))).toBe('This operation was deleted on another device.');
        expect(messageOf(new RequestError(0, "Can't reach the server."))).toBe("Can't reach the server.");
    });

    it('never shows the message of a bug', () => {
        chooseLanguage('en');

        expect(messageOf(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe('Something went wrong.');
        expect(messageOf('failed')).toBe('Something went wrong.');
    });
});
