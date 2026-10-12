import type { Maybe } from 'models';
import { ToastContext } from 'modules/toast/toast-context';
import type { ToastContextProps } from 'modules/toast/toast-models';
import { useContext } from 'react';

/**
 * @function useToastContext
 * @description A custom hook to access the toast context
 *
 * @returns {ToastContextProps} The toast context props
 */
export function useToastContext(): ToastContextProps {
    const context: Maybe<ToastContextProps> = useContext(ToastContext);

    if (!context) {
        throw new Error('The toast context must be used within the toast provider');
    }
    return context;
}
