import { randomUUID } from 'node:crypto';

import type { GeminiFunction } from 'src/modules/assistant/assistant-gemini';
import type { Proposal } from 'src/modules/assistant/assistant-models';
import { OperationChangesSchema, OperationDraftSchema } from 'src/modules/assistant/assistant-models';
import type { ToolContext } from 'src/modules/mcp/mcp-tools';
import { DaySchema, findLiveOperation, invalid, monthSummary, searchOperations, searchWatchlist, summaryOf, unknownCategory, watchlistEntryOf, watchlistTitleDetails } from 'src/modules/mcp/mcp-tools';
import type { CatalogDetails } from 'src/modules/watchlist/catalog/catalog-models';
import { MediaTypeSchema } from 'src/modules/watchlist/catalog/catalog-models';
import { titleDetails } from 'src/modules/watchlist/catalog/catalog-service';
import { RequestError } from 'src/shared/models';
import { z } from 'zod';

/**
 * @interface ToolOutcome
 * @description What running a tool gives: what to tell the model, and the change it suggests, if it suggests one.
 */
export interface ToolOutcome {
    result: Record<string, unknown>; /*!< What the model reads back */
    proposal?: Proposal; /*!< The change waiting for the owner */
}

/**
 * @interface AssistantTool
 * @description A tool the model may call. The read tools are the MCP server's own; the others only suggest.
 */
export interface AssistantTool {
    declaration: GeminiFunction; /*!< How the model is told about it */
    run: (context: ToolContext, args: Record<string, unknown>) => Promise<ToolOutcome>; /*!< What it does */
}

/**
 * @constant proposeCreateOperation
 * @description Suggests logging an operation.
 */
const proposeCreateOperation: AssistantTool = {
    declaration: {
        name: 'budget_propose_create_operation',
        description: 'Suggests logging a new operation. Nothing is stored: the owner sees the suggestion and confirms it or not.',
        parameters: {
            type: 'object',
            properties: {
                date: { type: 'string', description: 'The day it happened, YYYY-MM-DD' },
                name: { type: 'string', description: 'What it was, usually the merchant' },
                description: { type: 'string', description: 'A note, if the owner gave one' },
                categoryId: { type: 'string', description: 'One of the category ids' },
                location: { type: 'string', description: 'The city or place, if any' },
                amount: { type: 'number', description: 'The amount in its own currency' },
                currencyCode: { type: 'string', description: 'ISO 4217 code, EUR unless the owner said otherwise' },
                isOnline: { type: 'boolean', description: 'Whether it was paid online' }
            },
            required: ['date', 'name', 'categoryId', 'amount', 'currencyCode']
        }
    },
    run: async (context: ToolContext, args: Record<string, unknown>): Promise<ToolOutcome> => {
        const parsed = OperationDraftSchema.safeParse(args);

        if (!parsed.success) {
            return invalid(parsed.error);
        }

        const refusal = await unknownCategory(context.prisma, parsed.data.categoryId);

        if (refusal !== undefined) {
            return refusal;
        }

        return { result: { status: 'Shown to the owner, waiting for confirmation' }, proposal: { kind: 'createOperation', id: randomUUID(), draft: parsed.data } };
    }
};

/**
 * @constant ProposeUpdateSchema
 * @description Zod schema for the arguments of `budget_propose_update_operation`.
 */
const ProposeUpdateSchema = z.object({
    operationId: z.string().min(1),
    changes: OperationChangesSchema
});

/**
 * @constant proposeUpdateOperation
 * @description Suggests changing an operation.
 */
const proposeUpdateOperation: AssistantTool = {
    declaration: {
        name: 'budget_propose_update_operation',
        description: 'Suggests changing an existing operation, found first with budget_search_operations. Nothing is stored: the owner confirms it or not.',
        parameters: {
            type: 'object',
            properties: {
                operationId: { type: 'string', description: 'The operation\'s id' },
                changes: {
                    type: 'object',
                    description: 'Only the fields that change',
                    properties: {
                        date: { type: 'string', description: 'YYYY-MM-DD' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        categoryId: { type: 'string' },
                        location: { type: 'string' },
                        amount: { type: 'number' },
                        currencyCode: { type: 'string' },
                        isOnline: { type: 'boolean' }
                    }
                }
            },
            required: ['operationId', 'changes']
        }
    },
    run: async (context: ToolContext, args: Record<string, unknown>): Promise<ToolOutcome> => {
        const parsed = ProposeUpdateSchema.safeParse(args);

        if (!parsed.success) {
            return invalid(parsed.error);
        }

        const operation = await findLiveOperation(context.prisma, parsed.data.operationId);

        if (operation === undefined) {
            return { result: { error: 'Unknown operation: find its id with budget_search_operations' } };
        }

        const refusal = await unknownCategory(context.prisma, parsed.data.changes.categoryId);

        if (refusal !== undefined) {
            return refusal;
        }

        return { result: { status: 'Shown to the owner, waiting for confirmation' }, proposal: { kind: 'updateOperation', operation: summaryOf(operation), changes: parsed.data.changes } };
    }
};

/**
 * @constant ProposeDeleteSchema
 * @description Zod schema for the arguments of `budget_propose_delete_operation`.
 */
const ProposeDeleteSchema = z.object({
    operationId: z.string().min(1)
});

/**
 * @constant proposeDeleteOperation
 * @description Suggests moving an operation to the trash.
 */
const proposeDeleteOperation: AssistantTool = {
    declaration: {
        name: 'budget_propose_delete_operation',
        description: 'Suggests deleting one operation, found first with budget_search_operations. It would go to the trash, where it can be restored. Nothing is deleted: the owner confirms it or not.',
        parameters: {
            type: 'object',
            properties: {
                operationId: { type: 'string', description: 'The operation\'s id' }
            },
            required: ['operationId']
        }
    },
    run: async (context: ToolContext, args: Record<string, unknown>): Promise<ToolOutcome> => {
        const parsed = ProposeDeleteSchema.safeParse(args);

        if (!parsed.success) {
            return invalid(parsed.error);
        }

        const operation = await findLiveOperation(context.prisma, parsed.data.operationId);

        if (operation === undefined) {
            return { result: { error: 'Unknown operation: find its id with budget_search_operations' } };
        }

        return { result: { status: 'Shown to the owner, waiting for confirmation' }, proposal: { kind: 'deleteOperation', operation: summaryOf(operation) } };
    }
};

/**
 * @constant ProposeRatingSchema
 * @description Zod schema for the arguments of `watchlist_propose_rate_title`.
 */
const ProposeRatingSchema = z.object({
    entryId: z.uuid(),
    rating: z.number().int().min(1).max(10),
    comment: z.string().trim().max(2000).optional(),
    watchedAt: DaySchema.optional()
});

/**
 * @constant proposeRateTitle
 * @description Suggests marking a title watched, with a rating and a comment.
 */
const proposeRateTitle: AssistantTool = {
    declaration: {
        name: 'watchlist_propose_rate_title',
        description: 'Suggests marking a watchlist title as watched, with a rating and an optional comment. Find its id first with watchlist_search. Nothing is stored: the owner confirms it or not.',
        parameters: {
            type: 'object',
            properties: {
                entryId: { type: 'string', description: 'The title\'s id' },
                rating: { type: 'integer', description: 'In half stars, 1 to 10 (10 is five stars)' },
                comment: { type: 'string', description: 'What the owner thought, in their words' },
                watchedAt: { type: 'string', description: 'The day it was watched, YYYY-MM-DD, today by default' }
            },
            required: ['entryId', 'rating']
        }
    },
    run: async (context: ToolContext, args: Record<string, unknown>): Promise<ToolOutcome> => {
        const parsed = ProposeRatingSchema.safeParse(args);

        if (!parsed.success) {
            return invalid(parsed.error);
        }

        const entry = await context.prisma.watchlistEntry.findUnique({ where: { id: parsed.data.entryId } });

        if (entry === null) {
            return { result: { error: 'Unknown title: find its id with watchlist_search' } };
        }

        return {
            result: { status: 'Shown to the owner, waiting for confirmation' },
            proposal: {
                kind: 'rateTitle',
                entryId: entry.id,
                title: context.language === 'fr' ? entry.titleFr : entry.titleEn,
                rating: parsed.data.rating,
                comment: parsed.data.comment === undefined || parsed.data.comment === '' ? null : parsed.data.comment,
                watchedAt: parsed.data.watchedAt ?? context.today
            }
        };
    }
};

/**
 * @constant ProposeAddTitleSchema
 * @description Zod schema for the arguments of `watchlist_propose_add_title`.
 */
const ProposeAddTitleSchema = z.object({
    mediaType: MediaTypeSchema,
    tmdbId: z.number().int().positive()
});

/**
 * @constant watchlistProposeAddTitle
 * @description Suggests adding a film or a series to the watchlist.
 */
const watchlistProposeAddTitle: AssistantTool = {
    declaration: {
        name: 'watchlist_propose_add_title',
        description: 'Suggests adding a film or a series to the watchlist, found first with watchlist_title_details. Nothing is stored: the owner confirms it or not.',
        parameters: {
            type: 'object',
            properties: {
                mediaType: { type: 'string', enum: ['movie', 'tv'], description: 'Film or series' },
                tmdbId: { type: 'integer', description: 'The title\'s catalog id' }
            },
            required: ['mediaType', 'tmdbId']
        }
    },
    run: async (context: ToolContext, args: Record<string, unknown>): Promise<ToolOutcome> => {
        const parsed = ProposeAddTitleSchema.safeParse(args);

        if (!parsed.success) {
            return invalid(parsed.error);
        }

        if (await watchlistEntryOf(context.prisma, parsed.data) !== null) {
            return { result: { error: 'This title is already on the watchlist' } };
        }

        let details: CatalogDetails;

        try {
            details = await titleDetails(context.variables, context.logger, parsed.data.mediaType, parsed.data.tmdbId, context.language);
        } catch (error: unknown) {
            if (error instanceof RequestError) {
                return { result: { error: 'Unknown title, or the catalog is unavailable: find it with watchlist_title_details' } };
            }

            throw error;
        }

        return {
            result: { status: 'Shown to the owner, waiting for confirmation' },
            proposal: { kind: 'addTitle', mediaType: details.mediaType, tmdbId: details.tmdbId, title: details.title, releaseDate: details.releaseDate, posterPath: details.posterPath, overview: details.overview }
        };
    }
};

/**
 * @constant ASSISTANT_TOOLS
 * @description Every tool the model may call, named after the app it works on: four that read, five that only suggest.
 */
export const ASSISTANT_TOOLS: readonly AssistantTool[] = [
    searchOperations,
    monthSummary,
    searchWatchlist,
    watchlistTitleDetails,
    proposeCreateOperation,
    proposeUpdateOperation,
    proposeDeleteOperation,
    proposeRateTitle,
    watchlistProposeAddTitle
];
