import CategoryIconComponent from 'components/category-icon/category-icon';
import EmptyStateComponent from 'components/empty-state/empty-state';
import type { PaceChartLabels } from 'components/pace-chart/pace-chart';
import PaceChartComponent from 'components/pace-chart/pace-chart';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Maybe } from 'models';
import type { CategoryComparison, MonthComparison, MonthProjection } from 'modules/budget/budget-analysis';
import { compareMonth, projectMonth } from 'modules/budget/budget-analysis';
import { categoryName } from 'modules/budget/budget-categories';
import { dayShort, euro, monthTitle, percent } from 'modules/budget/budget-formatting';
import { useDocument } from 'modules/budget/budget-hooks';
import { t } from 'modules/language/language-service';
import type { JSX } from 'react';

/**
 * @constant STEADY
 * @description How far from usual a figure may move and still read as steady: under 5%, once rounded as the badge shows it.
 */
const STEADY = 0.05;

/**
 * @type Trend
 * @description Which way a figure moved from usual: up, down, steady, or new when it usually is nothing.
 */
type Trend = 'up' | 'down' | 'steady' | 'new';

/**
 * @function trendOf
 * @description Which way a figure moved from usual.
 *
 * @param {Maybe<number>} change The change, as a fraction, or null when it usually is nothing.
 *
 * @returns {Trend} Its trend.
 */
function trendOf(change: Maybe<number>): Trend {
    if (change === null) {
        return 'new';
    }

    if (Math.round(Math.abs(change) * 100) < STEADY * 100) {
        return 'steady';
    }

    return change > 0 ? 'up' : 'down';
}

/**
 * @constant TREND_STYLES
 * @description How each trend's badge looks: spending more reads red, spending less green, the rest grey.
 */
const TREND_STYLES: Record<Trend, string> = {
    up: 'bg-negative-soft text-negative-text',
    down: 'bg-[#EAF8EE] text-positive-text',
    steady: 'bg-fill text-ink-secondary',
    new: 'bg-accent-soft text-accent'
};

/**
 * @interface TrendBadgeComponentProps
 * @description Properties of a change badge
 */
interface TrendBadgeComponentProps {
    change: Maybe<number>; /*!< The change, as a fraction, or null when it usually is nothing */
}

/**
 * @function TrendBadgeComponent
 * @description A change from usual, with an arrow and its sign so it never rests on colour alone.
 *
 * @param {TrendBadgeComponentProps} props The properties of the component
 */
function TrendBadgeComponent(props: TrendBadgeComponentProps): JSX.Element {
    const trend = trendOf(props.change);
    const Icon = trend === 'down' ? TrendingDown : trend === 'up' ? TrendingUp : Minus;
    const label = props.change === null ? t('analysis.new') : `${props.change > 0 ? '+' : ''}${percent(props.change)}`;

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${TREND_STYLES[trend]}`}>
            {trend !== 'new' && <Icon size={13} strokeWidth={2.4} />}
            {label}
        </span>
    );
}

/**
 * @interface FigureComponentProps
 * @description Properties of one figure under the chart
 */
interface FigureComponentProps {
    label: string; /*!< Its label */
    value: string; /*!< Its figure */
}

/**
 * @function FigureComponent
 * @description One figure under the projection's chart.
 *
 * @param {FigureComponentProps} props The properties of the component
 */
function FigureComponent(props: FigureComponentProps): JSX.Element {
    return (
        <div className='rounded-2xl bg-fill px-3 py-3'>
            <p className='text-[12px] font-medium text-ink-secondary'>{props.label}</p>
            <p className='mt-0.5 text-[19px] font-semibold tracking-tight tabular-nums'>{props.value}</p>
        </div>
    );
}

/**
 * @interface ProjectionCardComponentProps
 * @description Properties of the projection's card
 */
interface ProjectionCardComponentProps {
    projection: MonthProjection; /*!< Where the month is heading */
}

/**
 * @function ProjectionCardComponent
 * @description Where the month ends at the current pace, against its budget: the projected spending, whether it stays
 * under the budget, how it was worked out, and the month's curve next to the usual one.
 *
 * @param {ProjectionCardComponentProps} props The properties of the component
 */
function ProjectionCardComponent(props: ProjectionCardComponentProps): JSX.Element {
    const { projection } = props;
    const margin = projection.limit - projection.projected;
    const isOver = projection.limit > 0 && margin < 0;
    const basis = projection.recurring > 0 ? t('analysis.basisRecurring', { pace: euro(projection.pace), recurring: euro(projection.recurring) }) : t('analysis.basis', { pace: euro(projection.pace) });
    const labels: PaceChartLabels = { actual: t('analysis.actual'), projected: t('analysis.projected'), usual: t('analysis.usual'), limit: t('analysis.limit') };

    /**
     * @function formatDay
     * @description A day of the month, with the month's short name.
     */
    const formatDay = (day: number): string => dayShort(new Date(projection.month.getFullYear(), projection.month.getMonth(), day));

    return (
        <section className='card p-6 sm:p-8 lg:col-span-3 lg:self-start'>
            <h2 className='text-[20px] font-semibold tracking-tight'>{t('analysis.projection')}</h2>
            <div className='mt-4 flex flex-wrap items-end gap-x-4 gap-y-1'>
                <p className='text-[40px] font-semibold leading-none tracking-tight tabular-nums'>{euro(projection.projected)}</p>
                {projection.limit > 0 && (
                    <p className={`pb-1 text-[15px] font-medium ${isOver ? 'text-negative-text' : 'text-positive-text'}`}>
                        {isOver ? t('analysis.over', { amount: euro(-margin) }) : t('analysis.under', { amount: euro(margin) })}
                    </p>
                )}
            </div>
            <p className='mt-2 text-[14px] text-ink-secondary'>{basis}</p>
            {projection.isEarly && <p className='mt-1 text-[13px] text-ink-tertiary'>{t('analysis.early')}</p>}

            <div className='mt-6'>
                <PaceChartComponent length={projection.length} cumulative={projection.cumulative} usual={projection.usual} projected={projection.projected} limit={projection.limit} labels={labels} formatAmount={euro} formatDay={formatDay} />
            </div>

            <div className='mt-6 grid grid-cols-3 gap-2.5'>
                <FigureComponent label={t('analysis.spentSoFar')} value={euro(projection.spent)} />
                <FigureComponent label={t('analysis.perDay')} value={euro(projection.pace)} />
                <FigureComponent label={t('analysis.budget')} value={projection.limit > 0 ? euro(projection.limit) : '•'} />
            </div>
        </section>
    );
}

/**
 * @interface ComparisonRowComponentProps
 * @description Properties of one category's comparison
 */
interface ComparisonRowComponentProps {
    comparison: CategoryComparison; /*!< The category, this month and usually */
}

/**
 * @function ComparisonRowComponent
 * @description A category's spending this month so far, what it usually is by now, and the change.
 *
 * @param {ComparisonRowComponentProps} props The properties of the component
 */
function ComparisonRowComponent(props: ComparisonRowComponentProps): JSX.Element {
    const { category, spent, usual, change } = props.comparison;

    return (
        <div className='flex items-center gap-3 py-2.5'>
            <CategoryIconComponent category={category} size={34} />
            <span className='min-w-0 flex-1'>
                <span className='block truncate text-[15px] font-medium'>{categoryName(category)}</span>
                <span className='block text-[13px] text-ink-secondary tabular-nums'>{t('analysis.usually', { amount: euro(usual) })}</span>
            </span>
            <span className='flex flex-col items-end gap-1'>
                <span className='text-[15px] font-semibold tabular-nums'>{euro(spent)}</span>
                <TrendBadgeComponent change={change} />
            </span>
        </div>
    );
}

/**
 * @interface ComparisonCardComponentProps
 * @description Properties of the comparison's card
 */
interface ComparisonCardComponentProps {
    comparison: MonthComparison; /*!< The month so far against usual */
}

/**
 * @function ComparisonCardComponent
 * @description The month so far against what is usually spent by the same day: in all, then category by category, the
 * largest rise first.
 *
 * @param {ComparisonCardComponentProps} props The properties of the component
 */
function ComparisonCardComponent(props: ComparisonCardComponentProps): JSX.Element {
    const { comparison } = props;
    const note = comparison.referenceCount === 1 ? t('analysis.comparedOne') : t('analysis.compared', { count: String(comparison.referenceCount) });

    return (
        <section className='card p-6 sm:p-8 lg:sticky lg:top-24 lg:col-span-2 lg:self-start'>
            <h2 className='text-[20px] font-semibold tracking-tight'>{t('analysis.comparison')}</h2>
            {comparison.referenceCount === 0 && (
                <div className='mt-4'>
                    <EmptyStateComponent message={t('analysis.noHistory')} />
                </div>
            )}
            {comparison.referenceCount > 0 && (
                <>
                    <p className='mt-1 text-[13px] text-ink-secondary'>{note}</p>
                    <div className='mt-4 flex items-center justify-between gap-3 rounded-2xl bg-fill px-4 py-3'>
                        <span>
                            <span className='block text-[13px] font-medium text-ink-secondary'>{t('analysis.total')}</span>
                            <span className='block text-[22px] font-semibold tracking-tight tabular-nums'>{euro(comparison.spent)}</span>
                            <span className='block text-[13px] text-ink-secondary tabular-nums'>{t('analysis.usually', { amount: euro(comparison.usual) })}</span>
                        </span>
                        <TrendBadgeComponent change={comparison.change} />
                    </div>
                    <div className='mt-3 divide-y divide-hairline'>
                        {comparison.categories.length === 0 && <EmptyStateComponent message={t('analysis.nothingSpent')} />}
                        {comparison.categories.map((entry) => (
                            <ComparisonRowComponent key={entry.category.id} comparison={entry} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

/**
 * @function BudgetAnalysisComponent
 * @description The Analysis tab: where the current month is heading at its pace, and how it compares with the usual
 * spending at the same point of the month, in all and per category. Everything is worked out on the device, from the
 * budget the page already holds.
 */
function BudgetAnalysisComponent(): JSX.Element {
    const document = useDocument();
    const now = new Date();
    const projection = projectMonth(document, now);
    const comparison = compareMonth(document, now);

    return (
        <div className='animate-rise'>
            <p className='eyebrow'>{t('analysis.eyebrow')}</p>
            <h1 className='mt-1 whitespace-nowrap text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]'>
                {monthTitle(projection.month)} <span className='font-normal text-ink-tertiary'>{projection.month.getFullYear()}</span>
            </h1>

            <div className='mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5'>
                <ProjectionCardComponent projection={projection} />
                <ComparisonCardComponent comparison={comparison} />
            </div>
        </div>
    );
}

export default BudgetAnalysisComponent;
