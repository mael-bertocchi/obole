import { StatusCodes } from 'http-status-codes';
import type { PrismaClient } from 'prisma/generated/prisma/client';
import type { MonthlyBudget } from 'src/modules/budget/history/history-models';
import { StoredCategoryLimitsSchema } from 'src/modules/budget/state/state-models';
import { bumpRevision } from 'src/modules/budget/state/state-service';
import { RequestError } from 'src/shared/models';

/**
 * @function storeMonth
 * @description Freezes the budget of a finished month, or replaces what was frozen. Sealing the same month twice is
 * harmless.
 *
 * @param {PrismaClient} prisma The database client.
 * @param {string} month The month, as `YYYY-MM`.
 * @param {MonthlyBudget} body Its budget.
 *
 * @returns {Promise<MonthlyBudget>} The stored budget.
 */
export async function storeMonth(prisma: PrismaClient, month: string, body: MonthlyBudget): Promise<MonthlyBudget> {
    return await prisma.$transaction(async (transaction) => {
        const row = await transaction.budgetHistory.upsert({
            where: { month },
            update: body,
            create: { month, ...body }
        });

        await bumpRevision(transaction);

        return { monthlyLimit: row.monthlyLimit, categoryLimits: StoredCategoryLimitsSchema.parse(row.categoryLimits) };
    });
}

/**
 * @function deleteMonth
 * @description Forgets the budget frozen against a month.
 *
 * @param {PrismaClient} prisma The database client.
 * @param {string} month The month, as `YYYY-MM`.
 *
 * @returns {Promise<void>} Resolves once it is forgotten.
 */
export async function deleteMonth(prisma: PrismaClient, month: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
        const removed = await transaction.budgetHistory.deleteMany({ where: { month } });

        if (removed.count === 0) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Unknown month');
        }

        await bumpRevision(transaction);
    });
}
