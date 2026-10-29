import { StatusCodes } from 'http-status-codes';
import type { PrismaClient } from 'prisma/generated/prisma/client';
import type { CategoryWrite, StoredCategory } from 'src/modules/budget/categories/categories-models';
import { bumpRevision } from 'src/modules/budget/state/state-service';
import { RequestError } from 'src/shared/models';

/**
 * @function storeCategory
 * @description Stores a category under the id the request names, creating it or replacing what it held. The apps ship
 * the catalogue of categories themselves, so the id is theirs and storing the same category twice is harmless.
 *
 * @param {PrismaClient} prisma The database client.
 * @param {string} id The category's id.
 * @param {CategoryWrite} body What it holds.
 *
 * @returns {Promise<StoredCategory>} The stored category.
 */
export async function storeCategory(prisma: PrismaClient, id: string, body: CategoryWrite): Promise<StoredCategory> {
    return await prisma.$transaction(async (transaction) => {
        const row = await transaction.budgetCategory.upsert({
            where: { id },
            update: body,
            create: { id, ...body }
        });

        await bumpRevision(transaction);

        return { id: row.id, name: row.name, symbol: row.symbol, colorHex: row.colorHex, monthlyLimit: row.monthlyLimit, position: row.position };
    });
}

/**
 * @function deleteCategory
 * @description Removes a category from the list. The operations filed under it keep its id and show under the
 * uncategorized stand-in.
 *
 * @param {PrismaClient} prisma The database client.
 * @param {string} id The category's id.
 *
 * @returns {Promise<void>} Resolves once it is removed.
 */
export async function deleteCategory(prisma: PrismaClient, id: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
        const removed = await transaction.budgetCategory.deleteMany({ where: { id } });

        if (removed.count === 0) {
            throw new RequestError(StatusCodes.NOT_FOUND, 'Unknown category');
        }

        await bumpRevision(transaction);
    });
}
