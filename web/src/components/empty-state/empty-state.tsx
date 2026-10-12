import type { JSX } from 'react';

/**
 * @interface EmptyStateComponentProps
 * @description Empty state properties
 */
interface EmptyStateComponentProps {
    message: string; /*!< What there is nothing of yet */
}

/**
 * @function EmptyStateComponent
 * @description A quiet card saying there is nothing to show yet.
 *
 * @param {EmptyStateComponentProps} props The properties of the component
 */
function EmptyStateComponent(props: EmptyStateComponentProps): JSX.Element {
    return <p className='rounded-2xl bg-fill px-5 py-8 text-center text-[15px] text-ink-secondary'>{props.message}</p>;
}

export default EmptyStateComponent;
