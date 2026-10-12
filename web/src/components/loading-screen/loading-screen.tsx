import SpinnerComponent from 'components/spinner/spinner';
import type { JSX } from 'react';

/**
 * @function LoadingScreenComponent
 * @description A spinner in the middle of the page, while a page or its data arrives
 *
 * @returns {JSX.Element} The loading screen component
 */
function LoadingScreenComponent(): JSX.Element {
    return (
        <main className='flex min-h-dvh items-center justify-center'>
            <SpinnerComponent size={28} />
        </main>
    );
}

export default LoadingScreenComponent;
