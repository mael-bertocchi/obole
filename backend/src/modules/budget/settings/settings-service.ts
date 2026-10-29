import type { PrismaClient } from 'prisma/generated/prisma/client';
import type { BudgetSettings } from 'src/modules/budget/settings/settings-models';
import { OWNER_ID } from 'src/plugins/identity';

/**
 * @function storeSettings
 * @description Stores the monthly budget and moves the budget on to its next revision, on the same row.
 *
 * @param {PrismaClient} prisma The database client.
 * @param {BudgetSettings} body The settings.
 *
 * @returns {Promise<BudgetSettings>} The stored settings.
 */
export async function storeSettings(prisma: PrismaClient, body: BudgetSettings): Promise<BudgetSettings> {
    const state = await prisma.budgetState.upsert({
        where: { id: OWNER_ID },
        update: { monthlyLimit: body.monthlyLimit, revision: { increment: 1 } },
        create: { id: OWNER_ID, monthlyLimit: body.monthlyLimit, revision: 1 }
    });

    return { monthlyLimit: state.monthlyLimit };
}
