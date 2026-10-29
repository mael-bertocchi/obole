import type { PrismaClient } from 'prisma/generated/prisma/client';
import { storeSettings } from 'src/modules/budget/settings/settings-service';
import { describe, expect, it, vi } from 'vitest';

import { standIn } from '../../../support/stand-in';

describe('storeSettings', () => {
    it('stores the monthly budget and moves the revision on, on the same row', async () => {
        const upsert = vi.fn(() => Promise.resolve({ id: 'owner', monthlyLimit: 2500, revision: 8 }));
        const settings = await storeSettings(standIn<PrismaClient>({ budgetState: { upsert } }), { monthlyLimit: 2500 });

        expect(settings).toEqual({ monthlyLimit: 2500 });
        expect(upsert).toHaveBeenCalledWith({
            where: { id: 'owner' },
            update: { monthlyLimit: 2500, revision: { increment: 1 } },
            create: { id: 'owner', monthlyLimit: 2500, revision: 1 }
        });
    });
});
