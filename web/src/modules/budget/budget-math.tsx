import type { Maybe } from 'models';
import { categoriesOf } from 'modules/budget/budget-categories';
import { EURO } from 'modules/budget/budget-currencies';
import { daysInMonth, isSameMonth, monthKey, monthStart, shiftMonth, startOfDay } from 'modules/budget/budget-dates';
import type { BudgetDocument, Category, MonthlyBudget, Operation } from 'modules/budget/budget-models';

/**
 * @interface MonthSummary
 * @description The figures around a month's budget ring.
 */
export interface MonthSummary {
    limit: number; /*!< The month's budget */
    spent: number; /*!< Euros spent in the month */
    left: number; /*!< Euros left, negative once overspent */
    daysLeft: number; /*!< Days left in the month, today included */
    perDay: number; /*!< What can still be spent each remaining day */
    progress: number; /*!< Share of the budget spent, between 0 and 1 */
}

/**
 * @interface CategorySpend
 * @description What one category spent against its limit in a month.
 */
export interface CategorySpend {
    category: Category; /*!< The category */
    spent: number; /*!< Euros spent under it */
    limit: number; /*!< Its limit for the month, 0 when unset */
    progress: number; /*!< Share of the limit spent, between 0 and 1 */
    isOverBudget: boolean; /*!< Whether it spent past a set limit */
}

/**
 * @interface DayGroup
 * @description The operations of one day, the way History groups them.
 */
export interface DayGroup {
    date: Date; /*!< The day's midnight */
    operations: Operation[]; /*!< Its operations, latest first */
    spent: number; /*!< Their euro total */
}

/**
 * @function euroAmount
 * @description What an operation cost in euros, at the rate it was logged with.
 */
export function euroAmount(operation: Operation): number {
    return operation.amount * operation.rateToEuro;
}

/**
 * @function operationsIn
 * @description The operations dated in a month.
 */
export function operationsIn(operations: readonly Operation[], month: Date): Operation[] {
    return operations.filter((operation) => isSameMonth(operation.date, month));
}

/**
 * @function daysLeft
 * @description Days left in a month, today included. A past month has none and a future one has all of its days.
 */
export function daysLeft(month: Date, now: Date = new Date()): number {
    const total = daysInMonth(month);

    if (isSameMonth(month, now)) {
        return Math.max(0, total - now.getDate() + 1);
    }

    return month.getTime() < monthStart(now).getTime() ? 0 : total;
}

/**
 * @function liveBudget
 * @description The budget as it stands today: the monthly limit and each category's current limit.
 */
export function liveBudget(document: BudgetDocument): MonthlyBudget {
    return {
        monthlyLimit: document.budget.monthlyLimit,
        categoryLimits: Object.fromEntries(categoriesOf(document.categories).map((category) => [category.id, category.monthlyLimit]))
    };
}

/**
 * @function monthlyBudgetFor
 * @description The budget a month is measured against: the one frozen when it ended, or the live one.
 */
export function monthlyBudgetFor(document: BudgetDocument, month: Date): MonthlyBudget {
    return document.budgetHistory[monthKey(month)] ?? liveBudget(document);
}

/**
 * @function summary
 * @description The figures around a month's budget ring.
 */
export function summary(operations: readonly Operation[], month: Date, budget: MonthlyBudget, now: Date = new Date()): MonthSummary {
    const spent = operationsIn(operations, month).reduce((total, operation) => total + euroAmount(operation), 0);
    const left = budget.monthlyLimit - spent;
    const remaining = daysLeft(month, now);
    let progress = spent > 0 ? 1 : 0;

    if (budget.monthlyLimit > 0) {
        progress = Math.min(1, Math.max(0, spent / budget.monthlyLimit));
    }

    return {
        limit: budget.monthlyLimit,
        spent,
        left,
        daysLeft: remaining,
        perDay: remaining > 0 ? Math.max(0, left) / remaining : 0,
        progress
    };
}

/**
 * @function categorySpends
 * @description What each category spent against its limit in a month, in category order.
 */
export function categorySpends(operations: readonly Operation[], categories: readonly Category[], month: Date, budget: MonthlyBudget): CategorySpend[] {
    const totals = new Map<string, number>();

    for (const operation of operationsIn(operations, month)) {
        totals.set(operation.categoryId, (totals.get(operation.categoryId) ?? 0) + euroAmount(operation));
    }

    return categoriesOf(categories).map((category) => {
        const spent = totals.get(category.id) ?? 0;
        const limit = budget.categoryLimits[category.id] ?? 0;
        let progress = spent > 0 ? 1 : 0;

        if (limit > 0) {
            progress = Math.min(1, spent / limit);
        }

        return { category, spent, limit, progress, isOverBudget: spent > limit && limit > 0 };
    });
}

/**
 * @function toDispatch
 * @description How much of the monthly budget no category limit claims yet. Negative when the limits add up to more.
 */
export function toDispatch(categories: readonly Category[], budget: MonthlyBudget): number {
    const allocated = categoriesOf(categories).reduce((total, category) => total + (budget.categoryLimits[category.id] ?? 0), 0);

    return budget.monthlyLimit - allocated;
}

/**
 * @function dayGroups
 * @description Operations grouped by day, latest day first and latest operation first within it.
 */
export function dayGroups(operations: readonly Operation[]): DayGroup[] {
    const groups = new Map<number, Operation[]>();

    for (const operation of operations) {
        const day = startOfDay(operation.date).getTime();

        groups.set(day, [...(groups.get(day) ?? []), operation]);
    }

    return [...groups.entries()]
        .sort(([left], [right]) => right - left)
        .map(([day, members]) => {
            const sorted = members.toSorted((left, right) => right.date.getTime() - left.date.getTime());

            return {
                date: new Date(day),
                operations: sorted,
                spent: sorted.reduce((total, operation) => total + euroAmount(operation), 0)
            };
        });
}

/**
 * @function sealCompletedMonths
 * @description Freezes the live budget onto every finished month that has none yet, so changing a limit later never
 * rewrites how a past month went. The app does the same on launch; whichever side gets there first seals the month.
 *
 * @param {BudgetDocument} document The document.
 * @param {Date} now The current date.
 *
 * @returns {BudgetDocument} The document with every finished month sealed.
 */
export function sealCompletedMonths(document: BudgetDocument, now: Date = new Date()): BudgetDocument {
    const earliest = document.operations.reduce<Maybe<Date>>((first, operation) => (first === null || operation.date < first ? operation.date : first), null);

    if (earliest === null) {
        return document;
    }

    const snapshot = liveBudget(document);
    const history = { ...document.budgetHistory };
    const current = monthStart(now);

    for (let month = monthStart(earliest); month < current; month = shiftMonth(month, 1)) {
        history[monthKey(month)] ??= snapshot;
    }

    return { ...document, budgetHistory: history };
}

/**
 * @function latestLocation
 * @description Where the most recent in-person operation happened, to suggest it for the next one.
 */
export function latestLocation(operations: readonly Operation[]): Maybe<string> {
    const latest = operations.toSorted((left, right) => right.date.getTime() - left.date.getTime())
        .find((operation) => !operation.isOnline && (operation.location ?? '') !== '');

    return latest?.location ?? null;
}

/**
 * @function recentLocations
 * @description The places operations happened at, most recent first and each only once.
 */
export function recentLocations(operations: readonly Operation[]): string[] {
    const locations = new Map<string, string>();

    for (const operation of operations.toSorted((left, right) => right.date.getTime() - left.date.getTime())) {
        const location = operation.location?.trim() ?? '';

        if (location !== '' && !locations.has(location.toLowerCase())) {
            locations.set(location.toLowerCase(), location);
        }
    }

    return [...locations.values()];
}

/**
 * @function lastUsedCurrency
 * @description The currency of the latest operation, which the next one most likely shares. The app remembers the
 * last currency picked on the phone; the bot reads the same intent off the data.
 */
export function lastUsedCurrency(operations: readonly Operation[]): string {
    const latest = operations.reduce<Maybe<Operation>>((last, operation) => (last === null || operation.date > last.date ? operation : last), null);

    return latest?.currencyCode ?? EURO.code;
}

/**
 * @function monthsWithOperations
 * @description Every month holding an operation, plus the current one, latest first.
 */
export function monthsWithOperations(operations: readonly Operation[], now: Date = new Date()): Date[] {
    const keys = new Set([monthKey(now), ...operations.map((operation) => monthKey(operation.date))]);

    return [...keys].sort().reverse().map((key) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1));
}
