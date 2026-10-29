import { randomUUID } from 'node:crypto';

import type { BudgetOperation, PrismaClient } from 'prisma/generated/prisma/client';
import type { GeminiFunction } from 'src/modules/assistant/assistant-gemini';
import type { OperationSummary, Proposal } from 'src/modules/assistant/assistant-models';
import { OperationChangesSchema, OperationDraftSchema } from 'src/modules/assistant/assistant-models';
import { StoredCategoryLimitsSchema } from 'src/modules/budget/state/state-models';
import { DEFAULT_MONTHLY_LIMIT } from 'src/modules/budget/state/state-service';
import { OWNER_ID } from 'src/plugins/identity';
import type { Perhaps } from 'src/shared/models';
import { z } from 'zod';

/**
 * @constant SEARCH_SCAN_MAX
 * @description How many operations a search reads at most to count and total its matches.
 */
const SEARCH_SCAN_MAX = 5000;

/**
 * @interface ToolContext
 * @description What a tool works with.
 */
export interface ToolContext {
    prisma: PrismaClient; /*!< The database client */
    language: 'en' | 'fr'; /*!< The language the owner reads */
    today: string; /*!< The owner's day, as `YYYY-MM-DD` */
}

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
 * @description A tool the model may call.
 */
export interface AssistantTool {
    declaration: GeminiFunction; /*!< How the model is told about it */
    run: (context: ToolContext, args: Record<string, unknown>) => Promise<ToolOutcome>; /*!< What it does */
}

/**
 * @constant DaySchema
 * @description Zod schema for a day, as `YYYY-MM-DD`.
 */
const DaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * @function invalid
 * @description The outcome of a call whose arguments don't hold up, telling the model what to fix.
 *
 * @param {z.ZodError} error What went wrong.
 *
 * @returns {ToolOutcome} The outcome.
 */
function invalid(error: z.ZodError): ToolOutcome {
    return { result: { error: `Invalid arguments: ${error.issues.map((issue) => `${issue.path.join('.') || 'arguments'}: ${issue.message}`).join('; ')}` } };
}

/**
 * @function euros
 * @description An amount rounded to the cent.
 *
 * @param {number} value The amount.
 *
 * @returns {number} The rounded amount.
 */
function euros(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * @function summaryOf
 * @description An operation as the model and the proposals see it.
 *
 * @param {BudgetOperation} row The stored operation.
 *
 * @returns {OperationSummary} Its summary.
 */
function summaryOf(row: BudgetOperation): OperationSummary {
    return {
        id: row.id,
        date: row.date,
        name: row.name,
        categoryId: row.categoryId,
        amount: row.amount,
        currencyCode: row.currencyCode,
        euroAmount: euros(row.amount * row.rateToEuro)
    };
}

/**
 * @function monthBounds
 * @description The first instant of a month and of the next one.
 *
 * @param {string} month The month, as `YYYY-MM`.
 *
 * @returns {{ start: Date; end: Date }} Its bounds.
 */
function monthBounds(month: string): { start: Date; end: Date } {
    const [year, index] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year ?? 1970, (index ?? 1) - 1, 1));
    const end = new Date(Date.UTC(year ?? 1970, index ?? 1, 1));

    return { start, end };
}

/**
 * @function findLiveOperation
 * @description Reads an operation still in the budget.
 *
 * @param {PrismaClient} prisma The database client.
 * @param {string} id Its id.
 *
 * @returns {Promise<Perhaps<BudgetOperation>>} The operation, or undefined when it is unknown or in the trash.
 */
async function findLiveOperation(prisma: PrismaClient, id: string): Promise<Perhaps<BudgetOperation>> {
    const row = await prisma.budgetOperation.findUnique({ where: { id } });

    return row === null || row.deletedAt !== null ? undefined : row;
}

/**
 * @function unknownCategory
 * @description Checks a category id against the stored categories.
 *
 * @param {PrismaClient} prisma The database client.
 * @param {Perhaps<string>} categoryId The id, if the call names one.
 *
 * @returns {Promise<Perhaps<ToolOutcome>>} An outcome telling the model the valid ids when it is unknown, undefined otherwise.
 */
async function unknownCategory(prisma: PrismaClient, categoryId: Perhaps<string>): Promise<Perhaps<ToolOutcome>> {
    if (categoryId === undefined) {
        return undefined;
    }

    const categories = await prisma.budgetCategory.findMany({ orderBy: { position: 'asc' } });

    if (categories.some((category) => category.id === categoryId)) {
        return undefined;
    }

    return { result: { error: `Unknown category "${categoryId}". Use one of: ${categories.map((category) => category.id).join(', ')}` } };
}

/**
 * @constant SearchOperationsSchema
 * @description Zod schema for the arguments of `search_operations`.
 */
const SearchOperationsSchema = z.object({
    query: z.string().trim().min(1).max(100).optional(),
    categoryId: z.string().optional(),
    from: DaySchema.optional(),
    to: DaySchema.optional(),
    limit: z.number().int().min(1).max(50).default(20)
});

/**
 * @constant searchOperations
 * @description Finds operations in the budget, the latest first, with how many match and their total in euros.
 */
const searchOperations: AssistantTool = {
    declaration: {
        name: 'search_operations',
        description: 'Finds logged operations (expenses) in the budget, latest first. Returns how many match, their total in euros, and up to `limit` of them. Every filter is optional.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Words to look for in the name, note or place, case-insensitive' },
                categoryId: { type: 'string', description: 'Only this category' },
                from: { type: 'string', description: 'First day included, YYYY-MM-DD' },
                to: { type: 'string', description: 'Last day included, YYYY-MM-DD' },
                limit: { type: 'integer', description: 'How many operations to list, 1 to 50, 20 by default' }
            }
        }
    },
    run: async (context: ToolContext, args: Record<string, unknown>): Promise<ToolOutcome> => {
        const parsed = SearchOperationsSchema.safeParse(args);

        if (!parsed.success) {
            return invalid(parsed.error);
        }

        const { query, categoryId, from, to, limit } = parsed.data;
        const rows = await context.prisma.budgetOperation.findMany({
            where: {
                deletedAt: null,
                categoryId,
                date: { gte: from === undefined ? undefined : new Date(`${from}T00:00:00.000Z`), lte: to === undefined ? undefined : new Date(`${to}T23:59:59.999Z`) },
                OR: query === undefined ? undefined : [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { location: { contains: query, mode: 'insensitive' } }
                ]
            },
            orderBy: { date: 'desc' },
            take: SEARCH_SCAN_MAX
        });

        return {
            result: {
                count: rows.length,
                totalEuros: euros(rows.reduce((total, row) => total + row.amount * row.rateToEuro, 0)),
                operations: rows.slice(0, limit).map((row) => ({ ...summaryOf(row), description: row.description, location: row.location, isOnline: row.isOnline, isRecurring: row.isRecurring }))
            }
        };
    }
};

/**
 * @constant MonthSummarySchema
 * @description Zod schema for the arguments of `month_summary`.
 */
const MonthSummarySchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/)
});

/**
 * @constant monthSummary
 * @description Sums up one month: the budget, what was spent, and each category against its limit.
 */
const monthSummary: AssistantTool = {
    declaration: {
        name: 'month_summary',
        description: 'Sums up one month of the budget: the monthly budget, what was spent in euros, what is left, and each category\'s spending against its limit.',
        parameters: {
            type: 'object',
            properties: {
                month: { type: 'string', description: 'The month, YYYY-MM' }
            },
            required: ['month']
        }
    },
    run: async (context: ToolContext, args: Record<string, unknown>): Promise<ToolOutcome> => {
        const parsed = MonthSummarySchema.safeParse(args);

        if (!parsed.success) {
            return invalid(parsed.error);
        }

        const { start, end } = monthBounds(parsed.data.month);
        const [rows, categories, frozen, state] = await Promise.all([
            context.prisma.budgetOperation.findMany({ where: { deletedAt: null, date: { gte: start, lt: end } } }),
            context.prisma.budgetCategory.findMany({ orderBy: { position: 'asc' } }),
            context.prisma.budgetHistory.findUnique({ where: { month: parsed.data.month } }),
            context.prisma.budgetState.findUnique({ where: { id: OWNER_ID } })
        ]);
        const limits = frozen === null ? Object.fromEntries(categories.map((category) => [category.id, category.monthlyLimit])) : StoredCategoryLimitsSchema.parse(frozen.categoryLimits);
        const monthlyLimit = frozen?.monthlyLimit ?? state?.monthlyLimit ?? DEFAULT_MONTHLY_LIMIT;
        const spent = new Map<string, number>();

        for (const row of rows) {
            spent.set(row.categoryId, (spent.get(row.categoryId) ?? 0) + row.amount * row.rateToEuro);
        }

        const total = [...spent.values()].reduce((sum, value) => sum + value, 0);
        const ids = new Set([...categories.map((category) => category.id), ...spent.keys()]);

        return {
            result: {
                month: parsed.data.month,
                monthlyLimit,
                spentEuros: euros(total),
                leftEuros: euros(monthlyLimit - total),
                operationCount: rows.length,
                categories: [...ids].map((id) => ({
                    id,
                    name: categories.find((category) => category.id === id)?.name ?? id,
                    spentEuros: euros(spent.get(id) ?? 0),
                    limitEuros: limits[id] ?? 0
                }))
            }
        };
    }
};

/**
 * @constant SearchWatchlistSchema
 * @description Zod schema for the arguments of `search_watchlist`.
 */
const SearchWatchlistSchema = z.object({
    query: z.string().trim().min(1).max(100).optional(),
    status: z.enum(['toWatch', 'watched', 'all']).default('all'),
    limit: z.number().int().min(1).max(50).default(20)
});

/**
 * @constant searchWatchlist
 * @description Finds films and series on the watchlist.
 */
const searchWatchlist: AssistantTool = {
    declaration: {
        name: 'search_watchlist',
        description: 'Finds films and series on the watchlist, the latest added first: their id, title, kind, runtime in minutes or seasons, and once watched, the day, the rating (in half stars, 1 to 10) and the comment.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Words to look for in the title, case-insensitive' },
                status: { type: 'string', enum: ['toWatch', 'watched', 'all'], description: 'Still to watch, already watched, or both (the default)' },
                limit: { type: 'integer', description: 'How many titles to list, 1 to 50, 20 by default' }
            }
        }
    },
    run: async (context: ToolContext, args: Record<string, unknown>): Promise<ToolOutcome> => {
        const parsed = SearchWatchlistSchema.safeParse(args);

        if (!parsed.success) {
            return invalid(parsed.error);
        }

        const { query, status, limit } = parsed.data;
        const rows = await context.prisma.watchlistEntry.findMany({
            where: status === 'all' ? {} : { watchedAt: status === 'watched' ? { not: null } : null },
            orderBy: { addedAt: 'desc' }
        });
        const needle = query?.toLocaleLowerCase();
        const matches = needle === undefined ? rows : rows.filter((row) => [row.titleEn, row.titleFr, row.originalTitle].some((title) => title.toLocaleLowerCase().includes(needle)));

        return {
            result: {
                count: matches.length,
                titles: matches.slice(0, limit).map((row) => ({
                    id: row.id,
                    title: context.language === 'fr' ? row.titleFr : row.titleEn,
                    mediaType: row.mediaType,
                    releaseDate: row.releaseDate,
                    runtime: row.runtime,
                    seasons: row.seasons,
                    watchedAt: row.watchedAt,
                    rating: row.rating,
                    comment: row.comment
                }))
            }
        };
    }
};

/**
 * @constant proposeCreateOperation
 * @description Suggests logging an operation.
 */
const proposeCreateOperation: AssistantTool = {
    declaration: {
        name: 'propose_create_operation',
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
 * @description Zod schema for the arguments of `propose_update_operation`.
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
        name: 'propose_update_operation',
        description: 'Suggests changing an existing operation, found first with search_operations. Nothing is stored: the owner confirms it or not.',
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
            return { result: { error: 'Unknown operation: find its id with search_operations' } };
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
 * @description Zod schema for the arguments of `propose_delete_operation`.
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
        name: 'propose_delete_operation',
        description: 'Suggests deleting one operation, found first with search_operations. It would go to the trash, where it can be restored. Nothing is deleted: the owner confirms it or not.',
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
            return { result: { error: 'Unknown operation: find its id with search_operations' } };
        }

        return { result: { status: 'Shown to the owner, waiting for confirmation' }, proposal: { kind: 'deleteOperation', operation: summaryOf(operation) } };
    }
};

/**
 * @constant ProposeRatingSchema
 * @description Zod schema for the arguments of `propose_rate_title`.
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
        name: 'propose_rate_title',
        description: 'Suggests marking a watchlist title as watched, with a rating and an optional comment. Find its id first with search_watchlist. Nothing is stored: the owner confirms it or not.',
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
            return { result: { error: 'Unknown title: find its id with search_watchlist' } };
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
 * @constant ASSISTANT_TOOLS
 * @description Every tool the model may call: three that read, four that only suggest.
 */
export const ASSISTANT_TOOLS: readonly AssistantTool[] = [
    searchOperations,
    monthSummary,
    searchWatchlist,
    proposeCreateOperation,
    proposeUpdateOperation,
    proposeDeleteOperation,
    proposeRateTitle
];
