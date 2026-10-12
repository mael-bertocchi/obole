/**
 * @function standIn
 * @description Hands a partial test double over as the full type a route or service expects. A whole Prisma client or
 * Fastify decoration is out of reach in a unit test, so this is the one cast the tests allow, through `unknown`; every
 * double goes through it rather than casting where it is used.
 *
 * @param {unknown} double The test double, holding only what the code under test touches.
 *
 * @returns {T} The double, typed as what it stands in for.
 */
export function standIn<T>(double: unknown): T {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the single unavoidable cast, see above
    return double as T;
}
