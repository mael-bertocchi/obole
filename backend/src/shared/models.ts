import type { StatusCodes } from 'http-status-codes';

/**
 * @type Maybe
 * @description Type representing a nullable value
 */
export type Maybe<T> = T | null;

/**
 * @type Perhaps
 * @description Type representing an optional value
 */
export type Perhaps<T> = T | undefined;

/**
 * @interface RequestErrorResponse
 * @description Defines the structure of an error response
 */
export interface RequestErrorResponse {
    message: string; /*!< The error message */
    data: unknown; /*!< Additional error data */
}

/**
 * @class RequestError
 * @description This class represent an error with a code.
 *
 * @extends Error
 */
export class RequestError extends Error {
    public data: Maybe<object>; /*!< Additional error data */
    public code: StatusCodes; /*!< The error code */

    /**
     * @constructor
     * @description Send an error message with code
     *
     * @param {StatusCodes} code The error code
     * @param {string} message The error message
     * @param {Object} data Additional error data
     */
    constructor(code: StatusCodes, message: string, data: Maybe<object> = null) {
        super(message);

        this.code = code;
        this.data = data;
    }
}
