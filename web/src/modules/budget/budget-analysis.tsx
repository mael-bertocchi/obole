import type { Maybe } from 'models';
import { categoriesOf } from 'modules/budget/budget-categories';
import { daysInMonth, monthKey, monthStart } from 'modules/budget/budget-dates';
import { euroAmount, monthlyBudgetFor, operationsIn } from 'modules/budget/budget-math';
import type { BudgetDocument, Category, Operation } from 'modules/budget/budget-models';

/**
 * @constant REFERENCE_MONTHS
 * @description How many past months "usual" is measured on, at most.
 */
const REFERENCE_MONTHS = 6;

/**
 * @constant EARLY_DAYS
 * @description Before this day of the month, too little was spent for the projection to say much.
 */
const EARLY_DAYS = 5;

/**
 * @interface MonthProjection
 * @description Where the current month is heading: what was spent so far, where it ends at the same pace, and the
 * curves the chart draws.
 */
export interface MonthProjection {
    month: Date; /*!< The first day of the month */
    today: number; /*!< Today's day of the month */
    length: number; /*!< How many days the month has */
    limit: number; /*!< The month's budget */
    spent: number; /*!< Euros spent so far */
    recurring: number; /*!< Euros of it spent on recurring operations, which don't repeat within the month */
    pace: number; /*!< Euros spent per day on everything else */
    projected: number; /*!< Euros spent by the end of the month, at that pace */
    cumulative: number[]; /*!< Euros spent by the end of each day so far, the first day first */
    usual: Maybe<number[]>; /*!< Euros the reference months had spent by each day of the month, on average, or null without any */
    isEarly: boolean; /*!< Whether the month only just started, so the projection is rough */
}

/**
 * @interface CategoryComparison
 * @description What one category spent this month so far, against what it usually had by the same day.
 */
export interface CategoryComparison {
    category: Category; /*!< The category */
    spent: number; /*!< Euros spent this month so far */
    usual: number; /*!< Euros it usually had by the same day */
    change: Maybe<number>; /*!< The change as a fraction (0.4 for +40%), or null when it usually spent nothing */
}

/**
 * @interface MonthComparison
 * @description The current month so far against the same point of the reference months, in all and per category.
 */
export interface MonthComparison {
    referenceCount: number; /*!< How many past months "usual" is measured on, 0 without history */
    spent: number; /*!< Euros spent this month so far */
    usual: number; /*!< Euros usually spent by the same day */
    change: Maybe<number>; /*!< The change as a fraction, or null when nothing was usually spent */
    categories: CategoryComparison[]; /*!< Each category that spent this month or usually does, the largest rise first */
}

/**
 * @function referenceMonths
 * @description The past months "usual" is measured on: the latest ones holding operations, before the month and at
 * most six, latest first.
 *
 * @param {readonly Operation[]} operations Every operation.
 * @param {Date} month The month measured.
 *
 * @returns {Date[]} The first day of each reference month.
 */
export function referenceMonths(operations: readonly Operation[], month: Date): Date[] {
    const current = monthStart(month).getTime();
    const keys = new Set(operations.filter((operation) => monthStart(operation.date).getTime() < current).map((operation) => monthKey(operation.date)));

    return [...keys].sort().reverse().slice(0, REFERENCE_MONTHS).map((key) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1));
}

/**
 * @function spentByDay
 * @description What a month's operations spent by the end of a day, from its first.
 *
 * @param {readonly Operation[]} operations The month's operations.
 * @param {number} day The day of the month, past its last one meaning the whole month.
 *
 * @returns {number} The euros spent.
 */
function spentByDay(operations: readonly Operation[], day: number): number {
    return operations.filter((operation) => operation.date.getDate() <= day).reduce((total, operation) => total + euroAmount(operation), 0);
}

/**
 * @function cumulativeOf
 * @description What a month's operations spent by the end of each of its first days.
 *
 * @param {readonly Operation[]} operations The month's operations.
 * @param {number} days How many days to measure.
 *
 * @returns {number[]} The euros spent by each day, the first day first.
 */
function cumulativeOf(operations: readonly Operation[], days: number): number[] {
    const daily = Array.from({ length: days }, () => 0);

    for (const operation of operations) {
        const index = operation.date.getDate() - 1;

        if (index < days) {
            daily[index] = (daily[index] ?? 0) + euroAmount(operation);
        }
    }

    let total = 0;

    return daily.map((amount) => {
        total += amount;

        return total;
    });
}

/**
 * @function usualCumulative
 * @description What the reference months had spent by each day of a month of a given length, on average. A shorter
 * month counts as finished past its last day.
 *
 * @param {readonly Operation[]} operations Every operation.
 * @param {readonly Date[]} references The reference months.
 * @param {number} length How many days the measured month has.
 *
 * @returns {Maybe<number[]>} The average euros by each day, or null without a reference month.
 */
function usualCumulative(operations: readonly Operation[], references: readonly Date[], length: number): Maybe<number[]> {
    if (references.length === 0) {
        return null;
    }

    const curves = references.map((month) => {
        const curve = cumulativeOf(operationsIn(operations, month), daysInMonth(month));

        return Array.from({ length }, (_, index) => curve[Math.min(index, curve.length - 1)] ?? 0);
    });

    return Array.from({ length }, (_, index) => curves.reduce((total, curve) => total + (curve[index] ?? 0), 0) / curves.length);
}

/**
 * @function projectMonth
 * @description Where the current month is heading. Recurring operations, such as the rent or a subscription, are
 * counted once; everything else is spread over the days gone by, today included, and carried on to the month's end.
 *
 * @param {BudgetDocument} document The budget.
 * @param {Date} now The current date.
 *
 * @returns {MonthProjection} The projection.
 */
export function projectMonth(document: BudgetDocument, now: Date = new Date()): MonthProjection {
    const month = monthStart(now);
    const length = daysInMonth(month);
    const today = now.getDate();
    const operations = operationsIn(document.operations, month).filter((operation) => operation.date.getDate() <= today);
    const spent = spentByDay(operations, today);
    const recurring = operations.filter((operation) => operation.isRecurring).reduce((total, operation) => total + euroAmount(operation), 0);
    const pace = (spent - recurring) / today;

    return {
        month,
        today,
        length,
        limit: monthlyBudgetFor(document, month).monthlyLimit,
        spent,
        recurring,
        pace,
        projected: spent + pace * (length - today),
        cumulative: cumulativeOf(operations, today),
        usual: usualCumulative(document.operations, referenceMonths(document.operations, month), length),
        isEarly: today < EARLY_DAYS
    };
}

/**
 * @function changeOf
 * @description How much a figure moved from its usual value, as a fraction.
 *
 * @param {number} spent The figure.
 * @param {number} usual Its usual value.
 *
 * @returns {Maybe<number>} The change, or null when the usual value is nothing.
 */
function changeOf(spent: number, usual: number): Maybe<number> {
    return usual > 0 ? spent / usual - 1 : null;
}

/**
 * @function compareMonth
 * @description The current month so far against the same point of the reference months: by today's day, or by their
 * last day when they are shorter. Comparing at the same day keeps a rent paid on the 1st, or a month only half gone,
 * from reading as a rise or a fall.
 *
 * @param {BudgetDocument} document The budget.
 * @param {Date} now The current date.
 *
 * @returns {MonthComparison} The comparison.
 */
export function compareMonth(document: BudgetDocument, now: Date = new Date()): MonthComparison {
    const month = monthStart(now);
    const today = now.getDate();
    const references = referenceMonths(document.operations, month);
    const current = operationsIn(document.operations, month).filter((operation) => operation.date.getDate() <= today);
    const past = references.map((reference) => operationsIn(document.operations, reference).filter((operation) => operation.date.getDate() <= today));
    const count = Math.max(1, references.length);

    /**
     * @function usualFor
     * @description What the reference months usually spent by today, on the operations a filter keeps.
     */
    const usualFor = (keep: (operation: Operation) => boolean): number => past.reduce((total, operations) => total + operations.filter(keep).reduce((sum, operation) => sum + euroAmount(operation), 0), 0) / count;

    const categories = categoriesOf(document.categories).map((category) => {
        const isOf = (operation: Operation): boolean => operation.categoryId === category.id;
        const spent = current.filter(isOf).reduce((total, operation) => total + euroAmount(operation), 0);
        const usual = references.length > 0 ? usualFor(isOf) : 0;

        return { category, spent, usual, change: changeOf(spent, usual) };
    });

    const spent = current.reduce((total, operation) => total + euroAmount(operation), 0);
    const usual = references.length > 0 ? usualFor(() => true) : 0;
    const shown = categories.filter((comparison) => comparison.spent > 0 || comparison.usual > 0).toSorted((left, right) => (right.spent - right.usual) - (left.spent - left.usual));

    return { referenceCount: references.length, spent, usual, change: changeOf(spent, usual), categories: shown };
}
