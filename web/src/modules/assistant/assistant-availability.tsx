import type { Maybe, Perhaps } from 'models';
import type { AppAvailability, AvailabilitySource } from 'modules/apps/apps-models';
import type { MessageKey } from 'modules/language/language-en';

/**
 * @constant ASSISTANT_REASONS
 * @description What to say for each reason the server gives when the assistant can't answer
 */
const ASSISTANT_REASONS: Partial<Record<string, MessageKey>> = {
    'assistant-not-configured': 'assistant.notConfigured',
    'assistant-refused': 'assistant.refused',
    'assistant-unknown-model': 'assistant.unknownModel',
    'assistant-unreachable': 'assistant.unreachable'
};

/**
 * @constant AVAILABLE
 * @description The assistant, ready to answer, which it is taken to be until the server says otherwise
 */
const AVAILABLE: AppAvailability = { isAvailable: true, reason: null };

/**
 * @function assistantReason
 * @description The sentence for a reason the server gives, when it is one of the assistant's
 *
 * @param {Maybe<string>} reason The reason
 * @returns {Perhaps<MessageKey>} Its sentence, or nothing
 */
export function assistantReason(reason: Maybe<string>): Perhaps<MessageKey> {
    return reason === null ? undefined : ASSISTANT_REASONS[reason];
}

/**
 * @interface AssistantStatus
 * @description Whether the assistant can answer, as the server tells it
 */
export interface AssistantStatus {
    isAvailable: boolean; /*!< Whether it can answer */
    reason: Maybe<string>; /*!< Why not, the server's reason */
}

/**
 * @class AssistantAvailabilityStore
 * @description Whether the assistant can answer. The server is asked once the page first shows the assistant, in the
 * launcher or on the home page; a failed question is asked again the next time, and the conversations correct the
 * answer as they go.
 */
export class AssistantAvailabilityStore implements AvailabilitySource {
    private readonly read: () => Promise<AssistantStatus>; /*!< Asks the server */
    private listeners = new Set<() => void>(); /*!< Who to tell about a change */
    private snapshot: AppAvailability = AVAILABLE; /*!< The availability as it stands */
    private state: 'unknown' | 'reading' | 'known' = 'unknown'; /*!< Where the question to the server stands */

    /**
     * @constructor
     * @description Prepares a store that hasn't asked yet
     *
     * @param {() => Promise<AssistantStatus>} read Asks the server
     */
    constructor(read: () => Promise<AssistantStatus>) {
        this.read = read;
    }

    /**
     * @function subscribe
     * @description Tells a listener about every change, until it unsubscribes, asking the server the first time
     */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        void this.check();

        return () => {
            this.listeners.delete(listener);
        };
    };

    /**
     * @function getSnapshot
     * @description The availability as it stands
     */
    getSnapshot = (): AppAvailability => this.snapshot;

    /**
     * @method note
     * @description Records what a conversation met: an answer, or a reason the assistant can't answer
     *
     * @param {AssistantStatus} status What it met
     */
    note(status: AssistantStatus): void {
        this.state = 'known';
        this.publish(status);
    }

    /**
     * @method check
     * @description Asks the server, unless it already answered or is answering. A failed question leaves the assistant
     * available and is asked again next time.
     */
    private async check(): Promise<void> {
        if (this.state !== 'unknown') {
            return;
        }

        this.state = 'reading';

        try {
            const status = await this.read();

            this.state = 'known';
            this.publish(status);
        } catch {
            this.state = 'unknown';
        }
    }

    /**
     * @method publish
     * @description Shows a new availability, telling the listeners when it changed
     *
     * @param {AssistantStatus} status What the server said
     */
    private publish(status: AssistantStatus): void {
        const reason = status.isAvailable ? null : assistantReason(status.reason) ?? 'assistant.unreachable';

        if (this.snapshot.isAvailable === status.isAvailable && this.snapshot.reason === reason) {
            return;
        }

        this.snapshot = status.isAvailable ? AVAILABLE : { isAvailable: false, reason };

        for (const listener of this.listeners) {
            listener();
        }
    }
}
