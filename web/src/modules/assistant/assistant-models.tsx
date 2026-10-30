import { MediaTypeSchema } from 'modules/watchlist/watchlist-models';
import { z } from 'zod';

/**
 * @constant OperationDraftSchema
 * @description Zod schema for an operation the assistant suggests logging, priced by the page once confirmed.
 */
export const OperationDraftSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: z.string(),
    description: z.string().nullish(),
    categoryId: z.string(),
    location: z.string().nullish(),
    amount: z.number(),
    currencyCode: z.string(),
    isOnline: z.boolean().optional()
});

/**
 * @constant OperationSummarySchema
 * @description Zod schema for an existing operation, as a suggestion shows it.
 */
export const OperationSummarySchema = z.object({
    id: z.string(),
    date: z.coerce.date(),
    name: z.string(),
    categoryId: z.string(),
    amount: z.number(),
    currencyCode: z.string(),
    euroAmount: z.number()
});

/**
 * @constant ProposalSchema
 * @description Zod schema for a change the assistant suggests, which only happens once the owner confirms it.
 */
export const ProposalSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('createOperation'), id: z.string(), draft: OperationDraftSchema }),
    z.object({ kind: z.literal('updateOperation'), operation: OperationSummarySchema, changes: OperationDraftSchema.partial() }),
    z.object({ kind: z.literal('deleteOperation'), operation: OperationSummarySchema }),
    z.object({ kind: z.literal('rateTitle'), entryId: z.string(), title: z.string(), rating: z.number().int(), comment: z.string().nullable(), watchedAt: z.string() }),
    z.object({ kind: z.literal('addTitle'), mediaType: MediaTypeSchema, tmdbId: z.number().int(), title: z.string(), releaseDate: z.string().nullable(), posterPath: z.string().nullable(), overview: z.string() })
]);

/**
 * @constant AssistantReplySchema
 * @description Zod schema for the assistant's answer.
 */
export const AssistantReplySchema = z.object({
    text: z.string(),
    proposals: z.array(ProposalSchema)
});

/**
 * @type Proposal
 * @description A change the assistant suggests.
 */
export type Proposal = z.infer<typeof ProposalSchema>;

/**
 * @type AssistantOperationDraft
 * @description An operation the assistant suggests logging.
 */
export type AssistantOperationDraft = z.infer<typeof OperationDraftSchema>;

/**
 * @type AssistantReply
 * @description The assistant's answer.
 */
export type AssistantReply = z.infer<typeof AssistantReplySchema>;

/**
 * @type ProposalStatus
 * @description Where a suggestion stands: waiting for the owner, being carried out, done, set aside, or failed.
 */
export type ProposalStatus = 'pending' | 'applying' | 'applied' | 'dismissed' | 'failed';

/**
 * @interface ConversationMessage
 * @description One message of the conversation, as the page shows it.
 */
export interface ConversationMessage {
    id: string; /*!< Its key in the list */
    role: 'user' | 'assistant'; /*!< Who said it */
    text: string; /*!< What was said */
    proposals: ProposalEntry[]; /*!< The changes it suggests, for an answer */
}

/**
 * @interface ProposalEntry
 * @description A suggestion and where it stands.
 */
export interface ProposalEntry {
    proposal: Proposal; /*!< The suggestion */
    status: ProposalStatus; /*!< Where it stands */
    error?: string; /*!< Why it failed, if it did */
}
