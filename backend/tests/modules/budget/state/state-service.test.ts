import type { PrismaClient } from 'prisma/generated/prisma/client';
import { pushState, withRenamedCategories } from 'src/modules/budget/state/state-service';
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

describe('withRenamedCategories', () => {
    it('moves the health category, its operations and its frozen limits to selfcare', () => {
        const pushed = {
            categories: [{ id: 'health', name: 'Health', symbol: 'cross.case', colorHex: 0xff8a5c, monthlyLimit: 80 }],
            operations: [{ id: 'gym', date: new Date('2026-10-01'), name: 'Gym', categoryId: 'health', amount: 30, currencyCode: 'EUR', rateToEuro: 1, isOnline: false, isRecurring: true }],
            budget: { monthlyLimit: 3000 },
            budgetHistory: { '2026-09': { monthlyLimit: 3000, categoryLimits: { health: 80, groceries: 400 } } }
        };
        const renamed = withRenamedCategories(pushed);

        expect(renamed.categories.map((category) => category.id)).toEqual(['selfcare']);
        expect(renamed.operations[0]?.categoryId).toBe('selfcare');
        expect(renamed.budgetHistory['2026-09']?.categoryLimits).toEqual({ selfcare: 80, groceries: 400 });
    });

    it('keeps the selfcare category when both ids are pushed', () => {
        const pushed = {
            categories: [{ id: 'health', name: 'Health', symbol: 'cross.case', colorHex: 0xff8a5c, monthlyLimit: 80 }, { id: 'selfcare', name: 'Selfcare', symbol: 'cross.case', colorHex: 0xff8a5c, monthlyLimit: 90 }],
            operations: [],
            budget: { monthlyLimit: 3000 },
            budgetHistory: { '2026-09': { monthlyLimit: 3000, categoryLimits: { health: 80, selfcare: 90 } } }
        };
        const renamed = withRenamedCategories(pushed);

        expect(renamed.categories).toEqual([pushed.categories[1]]);
        expect(renamed.budgetHistory['2026-09']?.categoryLimits).toEqual({ selfcare: 90 });
    });
});
