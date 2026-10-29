import type { RequestGenericInterface } from 'fastify';
import type { Maybe } from 'src/shared/models';
import { IdSchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant ASSISTANT_NOT_CONFIGURED
 * @description Why the assistant can't answer when no Gemini key is set, for the portal to word it.
 */
export const ASSISTANT_NOT_CONFIGURED = 'assistant-not-configured';

/**
 * @constant ASSISTANT_REFUSED
 * @description Why the assistant can't answer when Gemini refuses the key, for the portal to word it.
 */
export const ASSISTANT_REFUSED = 'assistant-refused';

/**
 * @constant ASSISTANT_UNKNOWN_MODEL
 * @description Why the assistant can't answer when Gemini doesn't know the model set, for the portal to word it.
 */
export const ASSISTANT_UNKNOWN_MODEL = 'assistant-unknown-model';

/**
 * @constant ASSISTANT_UNREACHABLE
 * @description Why the assistant can't answer when Gemini can't be reached, for the portal to word it.
 */
export const ASSISTANT_UNREACHABLE = 'assistant-unreachable';

/**
 * @constant MESSAGE_MAX
 * @description How long one message of the conversation may be, in characters.
 */
export const MESSAGE_MAX = 4000;

/**
 * @constant HISTORY_MAX
 * @description How many messages of the conversation a request may carry.
 */
export const HISTORY_MAX = 40;

/**
 * @constant MessageSchema
 * @description Zod schema for one message of the conversation, said by the owner or by the assistant.
 */
export const MessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().trim().min(1).max(MESSAGE_MAX)
});

/**
 * @constant ConversationSchema
 * @description Zod schema for a request to the assistant: the conversation so far, which the portal keeps and sends
 * whole each time, ending with the owner's new message, the language to answer in and the owner's day, which the
 * server can't know.
 */
export const ConversationSchema = z.object({
    messages: z.array(MessageSchema).min(1).max(HISTORY_MAX).refine((messages) => messages.at(-1)?.role === 'user', 'The conversation must end with a message from the owner'),
    language: z.enum(['en', 'fr']),
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

/**
 * @constant OperationDraftSchema
 * @description Zod schema for an operation the assistant suggests logging. Its rate to the euro is left to the portal,
 * which prices it as any operation typed by hand.
 */
export const OperationDraftSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullish(),
    categoryId: IdSchema,
    location: z.string().trim().max(200).nullish(),
    amount: z.number().positive().max(1_000_000_000),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    isOnline: z.boolean().optional()
});

/**
 * @constant OperationChangesSchema
 * @description Zod schema for the changes the assistant suggests making to an operation. A field left out stays as it is.
 */
export const OperationChangesSchema = OperationDraftSchema.partial().refine((changes) => Object.keys(changes).length > 0, 'Name at least one change');

/**
 * @constant OperationSummarySchema
 * @description Zod schema for an existing operation, as a proposal shows it.
 */
export const OperationSummarySchema = z.object({
    id: z.string(),
    date: z.date(),
    name: z.string(),
    categoryId: z.string(),
    amount: z.number(),
    currencyCode: z.string(),
    euroAmount: z.number()
});

/**
 * @constant ProposalSchema
 * @description Zod schema for a change the assistant suggests. The server never carries one out: the portal shows it
 * and the owner confirms it, which sends it through the ordinary routes.
 */
export const ProposalSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('createOperation'), id: z.uuid(), draft: OperationDraftSchema }),
    z.object({ kind: z.literal('updateOperation'), operation: OperationSummarySchema, changes: OperationDraftSchema.partial() }),
    z.object({ kind: z.literal('deleteOperation'), operation: OperationSummarySchema }),
    z.object({ kind: z.literal('rateTitle'), entryId: z.string(), title: z.string(), rating: z.number().int().min(1).max(10), comment: z.string().nullable(), watchedAt: z.string() })
]);

/**
 * @interface ConversationRequest
 * @description Fastify request generic for a message to the assistant.
 *
 * @extends RequestGenericInterface
 */
export interface ConversationRequest extends RequestGenericInterface {
    Body: Conversation; /*!< The conversation */
}

/**
 * @interface AssistantAvailability
 * @description Whether the assistant can answer, and why not when it can't.
 */
export interface AssistantAvailability {
    isAvailable: boolean; /*!< Whether Gemini takes the key and knows the model */
    reason: Maybe<string>; /*!< Why not, one of the assistant's reasons, null when it is available */
}

/**
 * @interface AssistantReply
 * @description What the assistant answers: its message, and the changes it suggests, waiting for the owner.
 */
export interface AssistantReply {
    text: string; /*!< Its message */
    proposals: Proposal[]; /*!< The changes it suggests */
}

/**
 * @type Conversation
 * @description A request to the assistant.
 */
export type Conversation = z.infer<typeof ConversationSchema>;

/**
 * @type Proposal
 * @description A change the assistant suggests.
 */
export type Proposal = z.infer<typeof ProposalSchema>;

/**
 * @type OperationSummary
 * @description An existing operation, as a proposal shows it.
 */
export type OperationSummary = z.infer<typeof OperationSummarySchema>;
