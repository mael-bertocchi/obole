import type { ReactNode } from 'react';

/**
 * @interface ToastContextProps
 * @description Toast context properties
 */
export interface ToastContextProps {
    showToast: (message: string) => void; /*!< Shows a message for a few seconds */
}

/**
 * @interface ToastProviderProps
 * @description Toast provider properties
 */
export interface ToastProviderProps {
    children: ReactNode; /*!< Child components to be wrapped by the toast provider */
}
