import type { JSX, ReactNode } from 'react';

/**
 * @interface ListGroupComponentProps
 * @description Properties of a titled group of rows
 */
interface ListGroupComponentProps {
    title: string; /*!< Its title */
    note?: string; /*!< A note under it */
    children: ReactNode; /*!< Its rows */
}

/**
 * @function ListGroupComponent
 * @description A titled group of rows, like a section of the iOS Settings app.
 *
 * @param {ListGroupComponentProps} props The properties of the component
 */
function ListGroupComponent(props: ListGroupComponentProps): JSX.Element {
    return (
        <section className='mt-8 first:mt-0'>
            <h2 className='eyebrow px-4 pb-2'>{props.title}</h2>
            <div className='card divide-y divide-hairline overflow-hidden'>{props.children}</div>
            {props.note !== undefined && <p className='px-4 pt-2 text-[13px] text-ink-secondary'>{props.note}</p>}
        </section>
    );
}

export default ListGroupComponent;
