import type { Maybe } from 'models';
import { useEffect, useRef, useState, type JSX, type MouseEvent, type RefObject } from 'react';

/**
 * @constant HEIGHT
 * @description The chart's height, in pixels.
 */
const HEIGHT = 220;

/**
 * @constant PADDING
 * @description The room around the plot: the amounts on the left, the days below.
 */
const PADDING = { top: 14, right: 12, bottom: 26, left: 52 };

/**
 * @constant ACCENT
 * @description The colour of this month's spending and of its projection.
 */
const ACCENT = '#6E56CF';

/**
 * @constant USUAL
 * @description The colour of the usual spending, recessive next to this month's.
 */
const USUAL = '#AEAEB2';

/**
 * @constant GRID
 * @description The colour of the grid.
 */
const GRID = '#E8E8ED';

/**
 * @constant LIMIT
 * @description The colour of the budget's line, of the hovered day's line and of the axes' words.
 */
const LIMIT = '#86868B';

/**
 * @constant GRID_STEPS
 * @description How many lines the amounts are read against.
 */
const GRID_STEPS = 4;

/**
 * @interface PaceChartLabels
 * @description The words the chart shows, in the page's language.
 */
export interface PaceChartLabels {
    actual: string; /*!< This month's spending */
    projected: string; /*!< Its projection */
    usual: string; /*!< The usual spending */
    limit: string; /*!< The budget */
}

/**
 * @interface PaceChartComponentProps
 * @description What the chart draws: a month's spending day by day, where it is heading, and what is usual by then.
 */
interface PaceChartComponentProps {
    length: number; /*!< How many days the month has */
    cumulative: number[]; /*!< Euros spent by the end of each day so far */
    usual: Maybe<number[]>; /*!< Euros usually spent by each day of the month, or null */
    projected: number; /*!< Euros spent by the month's end at the current pace */
    limit: number; /*!< The month's budget, 0 for none */
    labels: PaceChartLabels; /*!< Its words */
    formatAmount: (amount: number) => string; /*!< Writes an amount */
    formatDay: (day: number) => string; /*!< Writes a day of the month */
}

/**
 * @function niceStep
 * @description A round step for the amounts' grid: 1, 2 or 5 times a power of ten, so the lines read 500, 1 000, 1 500.
 *
 * @param {number} maximum The highest amount to show.
 *
 * @returns {number} The step between two lines.
 */
function niceStep(maximum: number): number {
    const raw = Math.max(1, maximum) / GRID_STEPS;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const multiple = [1, 2, 5, 10].find((candidate) => candidate * magnitude >= raw) ?? 10;

    return multiple * magnitude;
}

/**
 * @function pathOf
 * @description An SVG path through points.
 *
 * @param {Array<[number, number]>} points The points.
 *
 * @returns {string} The path.
 */
function pathOf(points: Array<[number, number]>): string {
    return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

/**
 * @function useWidth
 * @description The width an element takes, followed as it resizes.
 *
 * @returns {[RefObject<HTMLDivElement | null>, number]} The element's reference and its width.
 */
function useWidth(): [RefObject<HTMLDivElement | null>, number] {
    const reference = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const element = reference.current;

        if (element === null) {
            return;
        }

        const observer = new ResizeObserver(() => setWidth(element.clientWidth));

        observer.observe(element);
        setWidth(element.clientWidth);

        return () => observer.disconnect();
    }, []);

    return [reference, width];
}

/**
 * @interface LegendItemComponentProps
 * @description Properties of one entry of the legend
 */
interface LegendItemComponentProps {
    label: string; /*!< What the line stands for */
    color: string; /*!< Its colour */
    isDashed?: boolean; /*!< Whether it is drawn dashed */
}

/**
 * @function LegendItemComponent
 * @description A short line in a series' colour and style, with its name.
 *
 * @param {LegendItemComponentProps} props The properties of the component
 */
function LegendItemComponent(props: LegendItemComponentProps): JSX.Element {
    return (
        <span className='flex items-center gap-1.5'>
            <svg width='18' height='6' aria-hidden='true'>
                <line x1='1' y1='3' x2='17' y2='3' stroke={props.color} strokeWidth='2' strokeLinecap='round' strokeDasharray={props.isDashed === true ? '3 4' : undefined} />
            </svg>
            {props.label}
        </span>
    );
}

/**
 * @interface TooltipRowComponentProps
 * @description Properties of one line of the tooltip
 */
interface TooltipRowComponentProps {
    label: string; /*!< What the figure is */
    value: string; /*!< The figure */
    color: string; /*!< The colour of its series */
}

/**
 * @function TooltipRowComponent
 * @description One figure of the hovered day, after its series' colour.
 *
 * @param {TooltipRowComponentProps} props The properties of the component
 */
function TooltipRowComponent(props: TooltipRowComponentProps): JSX.Element {
    return (
        <span className='flex items-center gap-2'>
            <span className='h-2 w-2 rounded-full' style={{ backgroundColor: props.color }} />
            <span className='text-ink-secondary'>{props.label}</span>
            <span className='ml-auto pl-3 font-semibold tabular-nums'>{props.value}</span>
        </span>
    );
}

/**
 * @function PaceChartComponent
 * @description A month's spending as it builds up day by day, carried on dashed to where it ends at the current pace,
 * against what is usually spent by each day and the budget's line. Hovering a day reads its figures.
 *
 * @param {PaceChartComponentProps} props The properties of the component
 */
function PaceChartComponent(props: PaceChartComponentProps): JSX.Element {
    const [reference, width] = useWidth();
    const [hovered, setHovered] = useState<Maybe<number>>(null);

    const today = props.cumulative.length;
    const spent = props.cumulative[today - 1] ?? 0;
    const peak = Math.max(props.limit, props.projected, spent, ...(props.usual ?? []));
    const step = niceStep(peak * 1.05);
    const top = step * Math.max(1, Math.ceil((peak * 1.05) / step));
    const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

    /**
     * @function x
     * @description Where the end of a day sits across the plot, day 0 being the month's start.
     */
    const x = (day: number): number => PADDING.left + (day / props.length) * plotWidth;

    /**
     * @function y
     * @description Where an amount sits up the plot.
     */
    const y = (amount: number): number => PADDING.top + plotHeight - (amount / top) * plotHeight;

    const actualPoints: Array<[number, number]> = [[x(0), y(0)], ...props.cumulative.map((amount, index): [number, number] => [x(index + 1), y(amount)])];
    const areaPath = `${pathOf(actualPoints)} L${x(today).toFixed(1)},${y(0).toFixed(1)} Z`;
    const usualPoints: Array<[number, number]> = props.usual === null ? [] : [[x(0), y(0)], ...props.usual.map((amount, index): [number, number] => [x(index + 1), y(amount)])];
    const grid = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
    const ticks = [1, 10, 20, props.length].filter((day, index, days) => days.indexOf(day) === index && day <= props.length);

    /**
     * @function projectionAt
     * @description Where the projection stands at the end of a day after today.
     */
    const projectionAt = (day: number): number => spent + ((props.projected - spent) * (day - today)) / Math.max(1, props.length - today);

    /**
     * @function hover
     * @description Reads the day under the pointer.
     */
    const hover = (event: MouseEvent<SVGRectElement>): void => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const day = Math.round(((event.clientX - bounds.left) / Math.max(1, bounds.width)) * props.length);

        setHovered(Math.min(props.length, Math.max(1, day)));
    };

    /**
     * @function leave
     * @description Forgets the hovered day once the pointer leaves the plot.
     */
    const leave = (): void => {
        setHovered(null);
    };

    const hoveredUsual = hovered === null || props.usual === null ? null : props.usual[hovered - 1] ?? null;
    const hoveredActual = hovered !== null && hovered <= today ? props.cumulative[hovered - 1] ?? null : null;
    const hoveredProjection = hovered !== null && hovered > today ? projectionAt(hovered) : null;
    const tooltipLeft = hovered === null ? 0 : Math.min(Math.max(x(hovered) - 90, 0), Math.max(0, width - 180));

    return (
        <div>
            <div className='mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-secondary'>
                <LegendItemComponent label={props.labels.actual} color={ACCENT} />
                <LegendItemComponent label={props.labels.projected} color={ACCENT} isDashed />
                {props.usual !== null && <LegendItemComponent label={props.labels.usual} color={USUAL} />}
                {props.limit > 0 && <LegendItemComponent label={props.labels.limit} color={LIMIT} isDashed />}
            </div>
            <div ref={reference} className='relative w-full' style={{ height: HEIGHT }}>
                {width > 0 && (
                    <svg width={width} height={HEIGHT} role='img' aria-label={`${props.labels.actual} ${props.formatAmount(spent)}, ${props.labels.projected} ${props.formatAmount(props.projected)}`}>
                        {grid.map((amount) => (
                            <g key={amount}>
                                <line x1={PADDING.left} x2={width - PADDING.right} y1={y(amount)} y2={y(amount)} stroke={GRID} strokeWidth='1' />
                                <text x={PADDING.left - 8} y={y(amount) + 4} textAnchor='end' fontSize='11' fill={LIMIT}>{props.formatAmount(amount)}</text>
                            </g>
                        ))}
                        {ticks.map((day) => (
                            <text key={day} x={x(day)} y={HEIGHT - 6} textAnchor={day === props.length ? 'end' : 'middle'} fontSize='11' fill={LIMIT}>{props.formatDay(day)}</text>
                        ))}
                        {props.limit > 0 && <line x1={PADDING.left} x2={width - PADDING.right} y1={y(props.limit)} y2={y(props.limit)} stroke={LIMIT} strokeWidth='1' strokeDasharray='4 4' />}
                        {usualPoints.length > 0 && <path d={pathOf(usualPoints)} fill='none' stroke={USUAL} strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />}
                        <path d={areaPath} fill={ACCENT} fillOpacity='0.08' />
                        <path d={pathOf(actualPoints)} fill='none' stroke={ACCENT} strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />
                        {today < props.length && <line x1={x(today)} y1={y(spent)} x2={x(props.length)} y2={y(props.projected)} stroke={ACCENT} strokeWidth='2' strokeDasharray='3 5' strokeLinecap='round' />}
                        {today < props.length && <circle cx={x(props.length)} cy={y(props.projected)} r='4' fill='white' stroke={ACCENT} strokeWidth='2' />}
                        <circle cx={x(today)} cy={y(spent)} r='5' fill={ACCENT} stroke='white' strokeWidth='2' />
                        {hovered !== null && <line x1={x(hovered)} x2={x(hovered)} y1={PADDING.top} y2={PADDING.top + plotHeight} stroke={LIMIT} strokeWidth='1' />}
                        <rect x={PADDING.left} y={PADDING.top} width={plotWidth} height={plotHeight} fill='transparent' onMouseMove={hover} onMouseLeave={leave} />
                    </svg>
                )}
                {hovered !== null && (
                    <div className='pointer-events-none absolute top-0 z-10 flex w-[180px] flex-col gap-1 rounded-xl bg-white px-3 py-2 text-[12px] shadow-card ring-1 ring-hairline' style={{ left: tooltipLeft }}>
                        <span className='font-semibold'>{props.formatDay(hovered)}</span>
                        {hoveredActual !== null && <TooltipRowComponent label={props.labels.actual} value={props.formatAmount(hoveredActual)} color={ACCENT} />}
                        {hoveredProjection !== null && <TooltipRowComponent label={props.labels.projected} value={props.formatAmount(hoveredProjection)} color={ACCENT} />}
                        {hoveredUsual !== null && <TooltipRowComponent label={props.labels.usual} value={props.formatAmount(hoveredUsual)} color={USUAL} />}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PaceChartComponent;
