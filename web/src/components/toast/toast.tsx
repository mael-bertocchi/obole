import type { Maybe } from 'models';
import type { JSX } from 'react';

/**
 * @interface ToastComponentProps
 * @description Toast properties
 */
interface ToastComponentProps {
    message: Maybe<string>; /*!< The message shown, none when hidden */
}

/**
 * @function ToastComponent
 * @description A message in a pill at the bottom of the page, read out by screen readers as it appears
 *
 * @param {ToastComponentProps} props The properties for the toast component
 * @returns {JSX.Element} The toast component
 */
function ToastComponent(props: ToastComponentProps): JSX.Element {
    return (
        <div aria-live='polite' className='pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-5 sm:bottom-8'>
            {props.message !== null && (
                <p className='animate-rise rounded-full bg-ink/90 px-5 py-3 text-[14px] font-medium text-white shadow-sheet backdrop-blur-xl'>
                    {props.message}
                </p>
            )}
        </div>
    );
}

export default ToastComponent;
