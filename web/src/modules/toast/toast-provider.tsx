import ToastComponent from 'components/toast/toast';
import type { Maybe, Perhaps } from 'models';
import { ToastContext } from 'modules/toast/toast-context';
import type { ToastContextProps, ToastProviderProps } from 'modules/toast/toast-models';
import { useCallback, useMemo, useRef, useState, type JSX } from 'react';

/**
 * @constant SHOWN_FOR
 * @description How long a message stays
 */
const SHOWN_FOR = 4500;

/**
 * @function ToastProvider
 * @description Shows one message at a time at the bottom of the page
 *
 * @param {ToastProviderProps} props The provider props
 * @returns {JSX.Element} The toast provider component
 */
export function ToastProvider(props: ToastProviderProps): JSX.Element {
    const [message, setMessage] = useState<Maybe<string>>(null);
    const timer = useRef<Perhaps<number>>(undefined);

    /**
     * @function showToast
     * @description Shows a message, replacing the one already shown
     *
     * @param {string} text The message to show
     */
    const showToast = useCallback((text: string): void => {
        window.clearTimeout(timer.current);
        setMessage(text);
        timer.current = window.setTimeout(() => setMessage(null), SHOWN_FOR);
    }, []);

    const toast = useMemo<ToastContextProps>(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={toast}>
            {props.children}
            <ToastComponent message={message} />
        </ToastContext.Provider>
    );
}
