import type { PrismaClient } from 'prisma/generated/prisma/client';
import { pushState } from 'src/modules/budget/state/state-service';
import { RequestError } from 'src/shared/models';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import { standIn } from '../../../support/stand-in';

/**
 * @constant document
 * @description A small budget document to push
 */
const document = {
    categories: [{ id: 'groceries', name: 'Groceries', symbol: 'cart', colorHex: 0x3ecf8e, monthlyLimit: 400 }],
    operations: [],
    budget: { monthlyLimit: 3000 },
    budgetHistory: {}
};

/**
 * @interface PrismaDouble
 * @description A Prisma stand-in and the writes it records.
 */
interface PrismaDouble {
    prisma: PrismaClient; /*!< The stand-in */
    updateMany: Mock<(query: { where: { revision?: number } }) => Promise<{ count: number }>>; /*!< The revision claims */
    deleteMany: Mock<() => Promise<{ count: number }>>; /*!< The table wipes */
}

/**
 * @function makePrisma
 * @description Builds a Prisma stand-in whose budget row sits at the given revision, recording every write the
 * push attempts inside its transaction.
 */
function makePrisma(revision: number): PrismaDouble {
    const stored = { id: 'owner', monthlyLimit: 3000, revision };
    const updateMany = vi.fn(({ where }: { where: { revision?: number } }) => {
        const matches = where.revision === undefined || where.revision === stored.revision;

        if (matches) {
            stored.revision += 1;
        }

        return Promise.resolve({ count: matches ? 1 : 0 });
    });
    const deleteMany = vi.fn(() => Promise.resolve({ count: 0 }));
    const createMany = vi.fn(() => Promise.resolve({ count: 0 }));
    const table = { deleteMany, createMany, findMany: vi.fn(() => Promise.resolve([])) };
    const transaction = {
        budgetState: { updateMany },
        budgetCategory: table,
        budgetOperation: table,
        budgetHistory: table
    };
    const prisma = {
        ...transaction,
        budgetState: {
            updateMany,
            upsert: vi.fn(() => Promise.resolve(stored)),
            findUnique: vi.fn(() => Promise.resolve(stored))
        },
        $transaction: vi.fn(async (work: (client: typeof transaction) => Promise<void>) => {
            await work(transaction);
        })
    };

    return { prisma: standIn<PrismaClient>(prisma), updateMany, deleteMany };
}

describe('pushState', () => {
    it('stores a push edited from the current revision and moves the revision on', async () => {
        const { prisma, deleteMany } = makePrisma(4);
        const stored = await pushState(prisma, { ...document, revision: 4 });

        expect(stored.revision).toBe(5);
        expect(deleteMany).toHaveBeenCalled();
    });

    it('turns away a push edited from an older revision without touching the data', async () => {
        const { prisma, deleteMany } = makePrisma(4);
        const push = pushState(prisma, { ...document, revision: 3 });

        await expect(push).rejects.toBeInstanceOf(RequestError);
        await expect(push).rejects.toMatchObject({ code: 409 });
        expect(deleteMany).not.toHaveBeenCalled();
    });

    it('overwrites unconditionally when the push names no revision', async () => {
        const { prisma, updateMany } = makePrisma(9);
        const stored = await pushState(prisma, document);

        expect(stored.revision).toBe(10);
        expect(updateMany.mock.calls[0]?.[0].where).toEqual({ id: 'owner' });
    });
});
