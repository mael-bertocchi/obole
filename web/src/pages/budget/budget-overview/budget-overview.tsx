import CategoryIconComponent from 'components/category-icon/category-icon';
import EmptyStateComponent from 'components/empty-state/empty-state';
import RingComponent from 'components/ring/ring';
import TrackBarComponent from 'components/track-bar/track-bar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { categoryName, hexColor } from 'modules/budget/budget-categories';
import { isSameMonth, monthStart, shiftMonth } from 'modules/budget/budget-dates';
import { euro, monthTitle } from 'modules/budget/budget-formatting';
import { useDocument } from 'modules/budget/budget-hooks';
import type { CategorySpend } from 'modules/budget/budget-math';
import { categorySpends, monthlyBudgetFor, operationsIn, summary, toDispatch } from 'modules/budget/budget-math';
import { t } from 'modules/language/language-service';
import BudgetLimitsComponent from 'pages/budget/budget-limits/budget-limits';
import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * @constant ACCENT
 * @description The ring's colour while there is budget left.
 */
const ACCENT = '#6E56CF';

/**
 * @constant NEGATIVE
 * @description The colour of anything over budget.
 */
const NEGATIVE = '#FF3B30';

/**
 * @interface StatTileComponentProps
 * @description Properties of one figure under the ring
 */
interface StatTileComponentProps {
    label: string; /*!< Its label */
    value: string; /*!< Its figure */
}

/**
 * @function StatTileComponent
 * @description One of the three figures under the ring.
 *
 * @param {StatTileComponentProps} props The properties of the component
 */
function StatTileComponent(props: StatTileComponentProps): JSX.Element {
    return (
        <div className='flex flex-col justify-between rounded-2xl bg-fill px-2 py-3 text-center'>
            <p className='text-[12px] font-medium text-ink-secondary'>{props.label}</p>
            <p className='mt-0.5 text-[19px] font-semibold tracking-tight tabular-nums'>{props.value}</p>
        </div>
    );
}

/**
 * @interface CategoryRowComponentProps
 * @description Properties of one category row
 */
interface CategoryRowComponentProps {
    spend: CategorySpend; /*!< The category and what was spent in it */
    onOpen: () => void; /*!< Called to open its operations */
}

/**
 * @function CategoryRowComponent
 * @description A category against its limit. Over the limit, its figures and bar turn red.
 *
 * @param {CategoryRowComponentProps} props The properties of the component
 */
function CategoryRowComponent(props: CategoryRowComponentProps): JSX.Element {
    const range = props.spend.limit > 0 ? `${euro(props.spend.spent)} / ${euro(props.spend.limit)}` : euro(props.spend.spent);

    return (
        <button
            type='button'
            onClick={props.onOpen}
            className='-mx-3 flex w-[calc(100%+1.5rem)] flex-col gap-2.5 rounded-2xl px-3 py-3 text-left transition hover:bg-fill/70'
        >
            <span className='flex w-full items-center gap-3'>
                <CategoryIconComponent category={props.spend.category} size={34} />
                <span className='flex-1 text-[15px] font-medium'>{categoryName(props.spend.category)}</span>
                <span
                    className={`text-[14px] tabular-nums ${props.spend.isOverBudget ? 'font-semibold text-negative-text' : 'text-ink-secondary'}`}
                >
                    {range}
                </span>
            </span>
            <TrackBarComponent
                progress={props.spend.progress}
                color={props.spend.isOverBudget ? NEGATIVE : hexColor(props.spend.category.colorHex)}
            />
        </button>
    );
}

/**
 * @function BudgetOverviewComponent
 * @description The Budget tab: what is left to spend in a month, the spent, days-left and per-day figures, and every
 * category against its limit. A past month is measured against the budget frozen when it ended.
 */
function BudgetOverviewComponent(): JSX.Element {
    const document = useDocument();
    const navigate = useNavigate();
    const [month, setMonth] = useState(() => monthStart(new Date()));
    const [showLimits, setShowLimits] = useState(false);

    const now = new Date();
    const budget = monthlyBudgetFor(document, month);
    const hasOperations = operationsIn(document.operations, month).length > 0;
    const figures = summary(document.operations, month, budget, now);
    const isOverBudget = hasOperations && figures.left < 0;
    const isCurrentMonth = isSameMonth(month, now);
    const canGoForward = month.getTime() < monthStart(now).getTime();
    const dispatch = toDispatch(document.categories, budget);
    const spends = categorySpends(document.operations, document.categories, month, budget).filter((spend) => spend.limit > 0 || spend.spent > 0);

    return (
        <div className='animate-rise'>
            <div className='flex items-end justify-between gap-4'>
                <div>
                    <p className='eyebrow'>{t('budget.eyebrow')}</p>
                    <h1
                        className='mt-1 whitespace-nowrap text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]'
                    >
                        {monthTitle(month)} <span className='font-normal text-ink-tertiary'>{month.getFullYear()}</span>
                    </h1>
                </div>
                <div className='flex gap-2 pb-1'>
                    <button
                        type='button'
                        aria-label={t('budget.previousMonth')}
                        onClick={() => setMonth(shiftMonth(month, -1))}
                        className='flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-control transition hover:bg-fill'
                    >
                        <ChevronLeft size={19} strokeWidth={2.4} />
                    </button>
                    <button
                        type='button'
                        aria-label={t('budget.nextMonth')}
                        disabled={!canGoForward}
                        onClick={() => setMonth(shiftMonth(month, 1))}
                        className='flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-control transition hover:bg-fill disabled:opacity-35 disabled:hover:bg-white'
                    >
                        <ChevronRight size={19} strokeWidth={2.4} />
                    </button>
                </div>
            </div>

            <div className='mt-6 grid gap-5 lg:grid-cols-5'>
                <section
                    className='card flex flex-col items-center p-6 sm:p-8 lg:sticky lg:top-24 lg:col-span-2 lg:self-start'
                >
                    <RingComponent
                        progress={hasOperations ? figures.progress : 0}
                        color={isOverBudget ? NEGATIVE : ACCENT}
                    >
                        <p
                            className={`text-[14px] font-medium ${isOverBudget ? 'text-negative-text' : 'text-ink-secondary'}`}
                        >
                            {isOverBudget ? t('budget.overspent') : t('budget.leftToSpend')}
                        </p>
                        <p className='mt-0.5 text-[40px] font-semibold leading-none tracking-tight tabular-nums'>
                            {hasOperations ? euro(Math.abs(figures.left)) : '•'}
                        </p>
                        <p className='mt-2 text-[14px] text-ink-tertiary'>
                            {hasOperations ? t('budget.of', { amount: euro(figures.limit) }) : t('budget.noOperations')}
                        </p>
                    </RingComponent>
                    <div className='mt-8 grid w-full grid-cols-3 gap-2.5'>
                        <StatTileComponent
                            label={t('budget.spent')}
                            value={hasOperations ? euro(figures.spent) : '•'}
                        />
                        <StatTileComponent
                            label={t('budget.daysLeft')}
                            value={hasOperations ? String(figures.daysLeft) : '•'}
                        />
                        <StatTileComponent
                            label={t('budget.perDay')}
                            value={hasOperations ? euro(figures.perDay) : '•'}
                        />
                    </div>
                </section>

                <section className='card p-6 sm:p-8 lg:col-span-3'>
                    <div className='flex items-baseline justify-between gap-4'>
                        <h2 className='text-[20px] font-semibold tracking-tight'>{t('budget.byCategory')}</h2>
                        {isCurrentMonth && (
                            <button
                                type='button'
                                onClick={() => setShowLimits(true)}
                                className='text-[15px] font-medium text-accent hover:text-accent-strong'
                            >
                                {t('budget.editLimits')}
                            </button>
                        )}
                    </div>
                    {hasOperations && dispatch > 0 && (
                        <p className='mt-1 text-[13px] text-accent'>
                            {t('budget.notDispatched', { amount: euro(dispatch) })}
                        </p>
                    )}

                    <div className='mt-4'>
                        {!hasOperations && <EmptyStateComponent message={t('budget.emptyMonth')} />}
                        {hasOperations && spends.length === 0 && (
                            <EmptyStateComponent message={t('budget.noSpending')} />
                        )}
                        {hasOperations && spends.map((spend) => (
                            <CategoryRowComponent
                                key={spend.category.id}
                                spend={spend}
                                onOpen={() => navigate(`/budget/history?category=${encodeURIComponent(spend.category.id)}`)}
                            />
                        ))}
                    </div>
                </section>
            </div>

            <BudgetLimitsComponent open={showLimits} onClose={() => setShowLimits(false)} />
        </div>
    );
}

export default BudgetOverviewComponent;
