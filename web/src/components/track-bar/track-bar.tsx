import type { JSX } from 'react';

/**
 * @interface TrackBarComponentProps
 * @description What the thin progress bar shows
 */
interface TrackBarComponentProps {
    progress: number; /*!< How full it is, between 0 and 1 */
    color: string; /*!< The filled part's colour */
}

/**
 * @function TrackBarComponent
 * @description A thin progress bar, for a category against its limit.
 *
 * @param {TrackBarComponentProps} props The properties of the component
 */
function TrackBarComponent(props: TrackBarComponentProps): JSX.Element {
    return (
        <div className='h-1.5 w-full overflow-hidden rounded-full bg-fill-strong'>
            <div
                className='h-full rounded-full'
                style={{ width: `${Math.min(1, Math.max(0, props.progress)) * 100}%`, backgroundColor: props.color, transition: 'width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            />
        </div>
    );
}

export default TrackBarComponent;
