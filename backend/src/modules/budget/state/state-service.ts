import { StatusCodes } from 'http-status-codes';
import type { Prisma, PrismaClient } from 'prisma/generated/prisma/client';
import type { StatePushBody, StoredStateBody } from 'src/modules/budget/state/state-models';
import { StoredCategoryLimitsSchema } from 'src/modules/budget/state/state-models';
import { OWNER_ID } from 'src/plugins/identity';
import type { Perhaps } from 'src/shared/models';
import { RequestError } from 'src/shared/models';

/**
 * @constant DEFAULT_MONTHLY_LIMIT
 * @description The monthly budget assumed before the client has ever pushed its settings.
 */
const DEFAULT_MONTHLY_LIMIT = 3000;

/**
 * @constant TRANSACTION_TIMEOUT
 * @description How long a push may hold its transaction open. It rewrites every row of the document, which for a
 * few thousand operations outlasts Prisma's five-second default.
 */
const TRANSACTION_TIMEOUT = 30 * 1000;

/**
 * @function pullState
 * @description Reads the whole budget document back for the owner, in the order the client expects to render it.
 *
 * @param {PrismaClient} prisma The database client.
 *
 * @returns {Promise<StoredStateBody>} The full budget document and its revision.
 */
export async function pullState(prisma: PrismaClient): Promise<StoredStateBody> {
    const [categories, operations, history, state] = await Promise.all([
        prisma.budgetCategory.findMany({ orderBy: { position: 'asc' } }),
        prisma.budgetOperation.findMany({ orderBy: { date: 'desc' } }),
        prisma.budgetHistory.findMany({ orderBy: { month: 'asc' } }),
        prisma.budgetState.findUnique({ where: { id: OWNER_ID } })
    ]);

    return {
        categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            symbol: category.symbol,
            colorHex: category.colorHex,
            monthlyLimit: category.monthlyLimit
        })),
        operations: operations.map((operation) => ({
            id: operation.id,
            date: operation.date,
            name: operation.name,
            description: operation.description,
            categoryId: operation.categoryId,
            location: operation.location,
            amount: operation.amount,
            currencyCode: operation.currencyCode,
            rateToEuro: operation.rateToEuro,
            isOnline: operation.isOnline,
            isRecurring: operation.isRecurring,
            updatedAt: operation.updatedAt
        })),
        budget: { monthlyLimit: state?.monthlyLimit ?? DEFAULT_MONTHLY_LIMIT },
        budgetHistory: Object.fromEntries(
            history.map((entry) => [
                entry.month,
                {
                    monthlyLimit: entry.monthlyLimit,
                    categoryLimits: StoredCategoryLimitsSchema.parse(entry.categoryLimits)
                }
            ])
        ),
        revision: state?.revision ?? 0
    };
}

/**
 * @function claimRevision
 * @description Moves the document on to its next revision, provided it still sits at the one the push was edited from.
 *
 * @param {Prisma.TransactionClient} transaction The open transaction.
 * @param {Perhaps<number>} expected The revision the push was edited from, or undefined to overwrite unconditionally.
 * @param {number} monthlyLimit The pushed monthly budget, stored on the same row.
 *
 * @returns {Promise<void>} Resolves once the revision is claimed.
 */
async function claimRevision(transaction: Prisma.TransactionClient, expected: Perhaps<number>, monthlyLimit: number): Promise<void> {
    const claimed = await transaction.budgetState.updateMany({
        where: expected === undefined ? { id: OWNER_ID } : { id: OWNER_ID, revision: expected },
        data: { monthlyLimit, revision: { increment: 1 } }
    });

    if (claimed.count === 0) {
        throw new RequestError(StatusCodes.CONFLICT, 'The budget changed on the server since it was last read');
    }
}

/**
 * @function pushState
 * @description Replaces the owner's whole budget document with the pushed one inside a single transaction, then returns the persisted result.
 * A push naming a revision the server has moved past is rejected with a conflict and changes nothing.
 *
 * @param {PrismaClient} prisma The database client.
 * @param {StatePushBody} body The full budget document to store, and the revision it was edited from.
 *
 * @returns {Promise<StoredStateBody>} The stored budget document and its new revision, read back after the write.
 */
export async function pushState(prisma: PrismaClient, body: StatePushBody): Promise<StoredStateBody> {
    await prisma.budgetState.upsert({
        where: { id: OWNER_ID },
        update: {},
        create: { id: OWNER_ID, monthlyLimit: DEFAULT_MONTHLY_LIMIT }
    });

    await prisma.$transaction(async (transaction) => {
        await claimRevision(transaction, body.revision, body.budget.monthlyLimit);

        await transaction.budgetCategory.deleteMany();
        await transaction.budgetOperation.deleteMany();
        await transaction.budgetHistory.deleteMany();

        await transaction.budgetCategory.createMany({
            data: body.categories.map((category, index) => ({
                id: category.id,
                name: category.name,
                symbol: category.symbol,
                colorHex: category.colorHex,
                monthlyLimit: category.monthlyLimit,
                position: index
            }))
        });

        await transaction.budgetOperation.createMany({
            data: body.operations.map((operation) => ({
                id: operation.id,
                date: operation.date,
                name: operation.name,
                description: operation.description ?? null,
                categoryId: operation.categoryId,
                location: operation.location ?? null,
                amount: operation.amount,
                currencyCode: operation.currencyCode,
                rateToEuro: operation.rateToEuro,
                isOnline: operation.isOnline,
                isRecurring: operation.isRecurring
            }))
        });

        await transaction.budgetHistory.createMany({
            data: Object.entries(body.budgetHistory).map(([month, snapshot]) => ({
                month,
                monthlyLimit: snapshot.monthlyLimit,
                categoryLimits: snapshot.categoryLimits
            }))
        });
    }, { timeout: TRANSACTION_TIMEOUT });

    return await pullState(prisma);
}
