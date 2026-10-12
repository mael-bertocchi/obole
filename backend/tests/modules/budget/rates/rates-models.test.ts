import { ProviderPayloadSchema, RatesSchema, toIsoDay } from 'src/modules/budget/rates/rates-models';
import { describe, expect, it } from 'vitest';

/**
 * @constant validProviderPayload
 * @description A payload as the upstream provider answers it
 */
const validProviderPayload = {
    base: 'EUR',
    date: '2026-09-07',
    rates: { CHF: 0.9405, KRW: 1566.56, USD: 1.1622 }
};

/**
 * @constant validRates
 * @description A rate snapshot as the server serves it
 */
const validRates = {
    base: 'EUR',
    quoteDate: '2026-09-07',
    fetchedAt: '2026-09-08T09:00:00.000Z',
    rates: { EUR: 1, USD: 0.860437, CHF: 1.063264, KRW: 0.000638 }
};

describe('ProviderPayloadSchema', () => {
    it('accepts a valid provider payload', () => {
        expect(ProviderPayloadSchema.safeParse(validProviderPayload).success).toBe(true);
    });

    it('rejects a payload quoted against another base currency', () => {
        expect(ProviderPayloadSchema.safeParse({ ...validProviderPayload, base: 'USD' }).success).toBe(false);
    });

    it('rejects a malformed quote date', () => {
        expect(ProviderPayloadSchema.safeParse({ ...validProviderPayload, date: '07-09-2026' }).success).toBe(false);
    });

    it('rejects a non-positive quote', () => {
        expect(ProviderPayloadSchema.safeParse({ ...validProviderPayload, rates: { USD: 0 } }).success).toBe(false);
    });

    it('rejects a code that is not an ISO 4217 alphabetic code', () => {
        expect(ProviderPayloadSchema.safeParse({ ...validProviderPayload, rates: { usd: 1.1622 } }).success).toBe(false);
    });
});

describe('RatesSchema', () => {
    it('accepts a snapshot and coerces its fetch timestamp', () => {
        const parsed = RatesSchema.safeParse(validRates);

        expect(parsed.success).toBe(true);
        expect(parsed.data?.fetchedAt).toBeInstanceOf(Date);
    });

    it('rejects a snapshot missing its quote date', () => {
        const { quoteDate: _quoteDate, ...withoutQuoteDate } = validRates;

        expect(RatesSchema.safeParse(withoutQuoteDate).success).toBe(false);
    });
});

describe('toIsoDay', () => {
    it('reduces an instant to its UTC calendar day', () => {
        expect(toIsoDay(new Date('2026-09-05T23:30:00.000Z'))).toBe('2026-09-05');
    });
});
