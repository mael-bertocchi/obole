import { t } from 'modules/language/language-service';
import type { JSX } from 'react';

/**
 * @function LoadFailedComponent
 * @description What shows when a page fails, most often an app's code gone missing after the portal was updated under
 * an open tab: reloading fetches the new one
 *
 * @returns {JSX.Element} The load failed component
 */
function LoadFailedComponent(): JSX.Element {
    return (
        <main className='flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center'>
            <p className='text-[17px] font-semibold'>{t('portal.loadFailed')}</p>
            <button
                type='button'
                onClick={() => window.location.reload()}
                className='rounded-full bg-accent px-5 py-2 text-[15px] font-semibold text-white'
            >
                {t('portal.reload')}
            </button>
        </main>
    );
}

export default LoadFailedComponent;
